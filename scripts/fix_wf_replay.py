"""Add a 'Hear All Words' replay button to Word Families, near the word bank area.
The auto-play runs on load, but users should be able to replay it."""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# Add replay button right before the word bank grid
old_wordbank = """                {/* Word Bank (Scattered below) */}
                <div className="flex flex-wrap justify-center gap-3">"""

new_wordbank = """                {/* Word Bank (Scattered below) */}
                {!isComplete && wordBank.length > 0 && (
                    <div className="flex justify-center mb-3">
                        <button
                            onClick={async () => {
                                for (const item of wordBank) {
                                    if (foundWords.includes(item.text)) continue;
                                    try { await onPlayAudio(item.text); } catch(e) {}
                                    await new Promise(r => setTimeout(r, 350));
                                }
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 text-violet-600 hover:bg-violet-200 transition-colors font-bold text-sm"
                            aria-label="Hear all words"
                            title="Play all remaining words aloud"
                        >
                            <Volume2 size={16} /> Hear All Words
                        </button>
                    </div>
                )}
                <div className="flex flex-wrap justify-center gap-3">"""

if old_wordbank in content:
    content = content.replace(old_wordbank, new_wordbank, 1)
    changes += 1
    print("FIXED: Added 'Hear All Words' replay button")
else:
    print("[WARN] Word bank pattern not found")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
print("Applied %d fixes" % changes)
