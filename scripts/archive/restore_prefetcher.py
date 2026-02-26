"""Restore the backup prefetcher that was incorrectly removed."""
FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the REMOVED comment line
target = None
for i, line in enumerate(lines):
    if 'REMOVED: Redundant backup prefetcher' in line:
        target = i
        break

if target is None:
    print("ERROR: Could not find removal marker")
    exit(1)

print(f"Found removal marker at line {target+1}")

# Replace lines target and target+1 (the two comment lines) with the restored useEffect
# Also remove the blank line after if present
end = target + 1
# Check if next line is also a comment about this
if end < len(lines) and 'duplicate TTS calls' in lines[end]:
    end += 1

replacement = """    // FIX: Active Audio Prefetcher for Preloaded Words
    // Ensures audio is available even if we skipped the blocking preloadInitialBatch
    // PERF: Early return if no preloaded words
    React.useEffect(() => {
        if (!preloadedWords || preloadedWords.length === 0) return;

        // Identify words missing TTS confirmation
        const wordsNeedingAudio = preloadedWords.filter(w => !w.ttsReady && !w._audioRequested);

        if (wordsNeedingAudio.length === 0) return;

        debugLog(`🎧 Prefetching audio for ${wordsNeedingAudio.length} words...`);
        
        // 1. Mark as requested to prevent redundant loops
        if (setWsPreloadedWords) {
             setWsPreloadedWords(prev => prev.map(w => 
                 wordsNeedingAudio.some(n => n.word === w.word) ? { ...w, _audioRequested: true } : w
             ));
        }

        // 2. Fetch Audio concurrently (uses ttsInflight dedup)
        wordsNeedingAudio.forEach(async (w) => {
            const text = w.word;
            try {
                await handleAudio(text, false).catch(e => console.warn("Audio prefetch failed:", e));
                
                // 3. Mark as ready
                if (setWsPreloadedWords) {
                    setWsPreloadedWords(prev => prev.map(pw => {
                        if (pw.word === text) {
                            return { ...pw, ttsReady: true, _audioRequested: false };
                        }
                        return pw;
                    }));
                }
            } catch (e) {
                console.warn(`Audio prefetch failed for ${text}`, e);
            }
        });
    }, [preloadedWords, handleAudio, setWsPreloadedWords]);
"""

new_lines = lines[:target] + [replacement] + lines[end:]

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("SUCCESS: Backup prefetcher restored with ttsInflight dedup protection")
