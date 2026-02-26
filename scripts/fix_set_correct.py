"""
Add 'set_correct' handling to handleOptionUpdate so teachers can designate
the correct answer in edit mode. This updates the underlying data source
that checkAnswer reads from.
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# FIX 1: Add 'set_correct' handling to handleOptionUpdate
# Insert at the beginning of the function, before activity-specific cases
old_handler_start = """    const handleOptionUpdate = (index, newValue, type) => {
        if (wordSoundsActivity === 'orthography') {"""

new_handler_start = """    const handleOptionUpdate = (index, newValue, type) => {
        // EDIT MODE: Allow teacher to designate the correct answer
        if (type === 'set_correct') {
            if (wordSoundsActivity === 'rhyming') {
                // Update rhymeWord — the source of truth for checkAnswer
                setWordSoundsPhonemes(prev => ({ ...prev, rhymeWord: newValue }));
                debugLog("✏️ Teacher set correct rhyme answer to:", newValue);
                addToast?.(`✅ Correct answer set to "${newValue}"`, 'success');
            } else if (wordSoundsActivity === 'isolation') {
                // Update isolationState.correctAnswer
                setIsolationState(prev => ({ ...prev, correctAnswer: newValue }));
                debugLog("✏️ Teacher set correct isolation answer to:", newValue);
                addToast?.(`✅ Correct answer set to "${newValue}"`, 'success');
            } else if (wordSoundsActivity === 'blending') {
                // For blending, the correct answer IS the target word itself
                // Changing it means setting a new target word
                setCurrentWordSoundsWord(newValue);
                debugLog("✏️ Teacher set correct blending answer to:", newValue);
                addToast?.(`✅ Correct answer set to "${newValue}"`, 'success');
            }
            return;
        }
        if (wordSoundsActivity === 'orthography') {"""

if old_handler_start in content:
    content = content.replace(old_handler_start, new_handler_start, 1)
    changes += 1
    print("1. FIXED: Added 'set_correct' handling to handleOptionUpdate")
else:
    print("[WARN] handleOptionUpdate start pattern not found")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
print("\nApplied %d fixes" % changes)
