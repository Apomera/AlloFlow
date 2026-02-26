"""
FIX: Word repetition in activities.
The preloaded buffer advancement at L8889 uses modulo indexing which wraps
around and causes words to repeat. Replace with queue-based consumption
that pops from sessionQueueRef to ensure each word is only presented once.
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the preloaded buffer advancement path
old_advance = """            // CHECK PRELOADED BUFFER FIRST (enhanced rolling buffer)
            if (preloadedWords && preloadedWords.length > 0) {
                // FIX: Advance index FIRST to prevent repeat of current word
                const nextIdx = (currentWordIndex + 1) % preloadedWords.length;
                setCurrentWordIndex(nextIdx + 1); // Track for next advancement
                const bufferedWord = preloadedWords[nextIdx];"""

new_advance = """            // CHECK SESSION QUEUE FIRST (prevents word repetition)
            const actId = wordSoundsActivity || 'segmentation';
            const queue = sessionQueueRef.current[actId];
            if (queue && queue.length > 0) {
                // Pop next word from queue (no repeats, already deduplicated)
                const queueWord = queue[0];
                sessionQueueRef.current[actId] = queue.slice(1);
                setSessionWordLists(prev => ({...prev, [actId]: queue.slice(1)}));
                const queueTargetWord = queueWord.singleWord || queueWord.fullTerm || queueWord.word || queueWord;
                // Find matching preloaded data for this queue word
                const bufferedWord = preloadedWords.find(
                    pw => (pw.word?.toLowerCase() === queueTargetWord.toLowerCase() ||
                           pw.targetWord?.toLowerCase() === queueTargetWord.toLowerCase() ||
                           pw.displayWord?.toLowerCase() === queueTargetWord.toLowerCase())
                ) || queueWord; // Fall back to queue entry itself"""

if old_advance in content:
    content = content.replace(old_advance, new_advance, 1)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("FIXED: Replaced modulo-wrapping preloaded buffer with queue-based consumption")
else:
    print("[WARN] Pattern not found")
    lines = content.split('\n')
    for i, l in enumerate(lines):
        if 'CHECK PRELOADED BUFFER' in l:
            print("L%d: %s" % (i+1, l.strip()[:180]))
