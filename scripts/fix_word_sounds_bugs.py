"""
Fix two Word Sounds issues:
1. Update isolation_desc ARIA label (no longer just first/last sound)
2. Fix word repetition bug (skip re-queued words that match current word)
"""

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

fixes = []

# FIX 1: Update the isolation activity description
old_desc = "'word_sounds.isolation_desc': 'Identify the first or last sound in a word'"
new_desc = "'word_sounds.isolation_desc': 'Identify the beginning, middle, or ending sound in a word'"
if old_desc in content:
    content = content.replace(old_desc, new_desc)
    fixes.append("Updated isolation_desc to include beginning/middle/ending sounds")
else:
    fixes.append("isolation_desc not found (may already be updated)")

# FIX 2: Fix word repetition bug
# The issue: after a correct answer, the setTimeout at L8280 pulls from sessionQueueRef.
# If the queue has a re-queued copy of the current word (previously missed), it gets the same word.
# Fix: When pulling from queue, skip words that match the current word.
# We'll add a check: if queueWord matches currentWordSoundsWord, skip it and try the next.

# The code at L8284 currently:
#   const queue = sessionQueueRef.current[actId];
#   if (queue && queue.length > 0) {
#       const queueWord = queue[0];
#       sessionQueueRef.current[actId] = queue.slice(1);
#
# We'll replace with a version that skips words matching the current word:

old_queue_logic = """const queue = sessionQueueRef.current[actId];
            if (queue && queue.length > 0) {
                const queueWord = queue[0];
                sessionQueueRef.current[actId] = queue.slice(1);
                setSessionWordLists(prev => ({...prev, [actId]: queue.slice(1)}));
                const queueTargetWord = queueWord.singleWord || queueWord.fullTerm || queueWord.word || queueWord;"""

new_queue_logic = """let queue = sessionQueueRef.current[actId] || [];
            // Skip words that match the current word to prevent repetition
            const currentLower = (currentWordSoundsWord || '').toLowerCase();
            while (queue.length > 0) {
                const peekWord = queue[0];
                const peekTarget = (peekWord.singleWord || peekWord.fullTerm || peekWord.word || peekWord || '').toString().toLowerCase();
                if (peekTarget === currentLower && queue.length > 1) {
                    // Move duplicate to end of queue instead of discarding
                    queue = [...queue.slice(1), queue[0]];
                    debugLog("⏩ Skipped repeat word in queue:", peekTarget);
                } else {
                    break;
                }
            }
            sessionQueueRef.current[actId] = queue;
            if (queue.length > 0) {
                const queueWord = queue[0];
                sessionQueueRef.current[actId] = queue.slice(1);
                setSessionWordLists(prev => ({...prev, [actId]: queue.slice(1)}));
                const queueTargetWord = queueWord.singleWord || queueWord.fullTerm || queueWord.word || queueWord;"""

if old_queue_logic in content:
    content = content.replace(old_queue_logic, new_queue_logic)
    fixes.append("Added same-word deduplication to queue-based word advancement")
else:
    fixes.append("WARNING: Could not find queue logic to patch")
    # Try to find it with slightly different whitespace
    import re
    test = "const queue = sessionQueueRef.current[actId];"
    if test in content:
        fixes.append("  (queue declaration exists but surrounding context differs)")

# Also fix the fallback path to skip same word
old_fallback = """if (!word && wordPool && wordPool.length > 0) {
                    debugLog("WordSounds: Queue empty during progression. Regenerating with 'medium' fallback...");
                    generateSessionQueue(wordSoundsActivity, 'medium');
                    const regenQueue = sessionQueueRef.current[fallbackActId];
                    if (regenQueue && regenQueue.length > 0) {
                        word = regenQueue[0];"""

new_fallback = """if (!word && wordPool && wordPool.length > 0) {
                    debugLog("WordSounds: Queue empty during progression. Regenerating with 'medium' fallback...");
                    generateSessionQueue(wordSoundsActivity, 'medium');
                    const regenQueue = sessionQueueRef.current[fallbackActId];
                    if (regenQueue && regenQueue.length > 0) {
                        // Skip words matching current word to prevent repetition
                        const fCurrentLower = (currentWordSoundsWord || '').toLowerCase();
                        let fIdx = regenQueue.findIndex(w => {
                            const wt = (w.singleWord || w.fullTerm || w.word || w || '').toString().toLowerCase();
                            return wt !== fCurrentLower;
                        });
                        if (fIdx < 0) fIdx = 0; // fallback to first if all match
                        word = regenQueue[fIdx];"""

if old_fallback in content:
    content = content.replace(old_fallback, new_fallback)
    fixes.append("Added same-word deduplication to fallback regeneration path")
else:
    fixes.append("Fallback regeneration path not found (check manually)")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied " + str(len(fixes)) + " fixes:")
for fix in fixes:
    print("  " + fix)
print("File size: " + str(len(content)))
