import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('\r\n', '\n')

old = '''                const targetWord = currentWordSoundsWord?.toLowerCase() || '';
                
                // Find which rime family this word belongs to
                let targetRime = null;
                let familyMembers = [];
                for (const [rime, members] of Object.entries(RIME_FAMILIES)) {
                    if (targetWord.endsWith(rime) && targetWord.length > rime.length) {
                        targetRime = rime;
                        familyMembers = members.filter(w => w !== targetWord);
                        break;
                    }
                }
                
                // Fallback: if word doesn't match any family, try last 2 chars
                if (!targetRime) {
                    const ending = targetWord.slice(-2);
                    if (RIME_FAMILIES[ending]) {
                        targetRime = ending;
                        familyMembers = RIME_FAMILIES[ending].filter(w => w !== targetWord);
                    }
                }
                
                // Ultimate fallback: pick the -at family
                if (!targetRime) {
                    targetRime = 'at';
                    familyMembers = RIME_FAMILIES['at'].filter(w => w !== targetWord);
                    warnLog(`No rime family found for "${targetWord}", falling back to -at`);
                }'''

new = '''                const targetWord = currentWordSoundsWord?.toLowerCase() || '';
                
                // AI-FIRST: Use Gemini-generated rimeFamilyMembers if available
                const aiRimeData = wordSoundsPhonemes?.rimeFamilyMembers;
                let targetRime = null;
                let familyMembers = [];
                
                if (aiRimeData && aiRimeData.rime && aiRimeData.words && aiRimeData.words.length >= 3) {
                    targetRime = aiRimeData.rime.replace(/^-/, ''); // Remove leading dash
                    familyMembers = aiRimeData.words
                        .map(w => w.toLowerCase().trim())
                        .filter(w => w && w !== targetWord);
                    debugLog("\\u{1F3E0} Using AI-generated rime family:", targetRime, familyMembers);
                }
                
                // FALLBACK: Find which static rime family this word belongs to
                if (!targetRime || familyMembers.length < 2) {
                    for (const [rime, members] of Object.entries(RIME_FAMILIES)) {
                        if (targetWord.endsWith(rime) && targetWord.length > rime.length) {
                            targetRime = rime;
                            familyMembers = members.filter(w => w !== targetWord);
                            break;
                        }
                    }
                }
                
                // Fallback: if word doesn't match any family, try last 2 chars
                if (!targetRime) {
                    const ending = targetWord.slice(-2);
                    if (RIME_FAMILIES[ending]) {
                        targetRime = ending;
                        familyMembers = RIME_FAMILIES[ending].filter(w => w !== targetWord);
                    }
                }
                
                // Ultimate fallback: pick the -at family
                if (!targetRime) {
                    targetRime = 'at';
                    familyMembers = RIME_FAMILIES['at'].filter(w => w !== targetWord);
                    warnLog(`No rime family found for "${targetWord}", falling back to -at`);
                }'''

ct = content.count(old)
print(f"Found {ct} occurrences")

if ct > 0:
    content = content.replace(old, new)
    content = content.replace('\n', '\r\n')
    with open(FILE, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    print(f"Patched {ct} occurrences. Saved.")
else:
    print("Pattern not found!")
