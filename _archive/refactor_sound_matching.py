
import re

FILE_PATH = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

MATCH_POOL = [
    "bat", "cat", "dog", "fan", "hat", "jet", "kit", "leg", "men", "nut",
    "pig", "run", "sit", "top", "van", "web", "box", "yes", "zip", "bed",
    "cap", "den", "fin", "gum", "hen", "jam", "lip", "map", "net", "pen",
    "rag", "sun", "tub", "vet", "wig", "fix", "mix", "fox", "log", "bug",
    "bus", "cup", "mud", "rug", "hot", "pot", "cut", "hop", "mop", "pop"
]

POOL_CODE = f"""
const SOUND_MATCH_POOL = {str(MATCH_POOL)};
"""

# New Case Logic
NEW_CASE_LOGIC = """
            case 'word_families': {
                // REFACTORED: SOUND MATCHING (First/Last Sound)
                const targetWord = (currentWordSoundsWord || '').toLowerCase();
                if (!targetWord || targetWord.length < 2) return null;

                // Randomly choose First or Last sound (seeded by word for consistency in session)
                const wordSeed = targetWord.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
                const mode = (wordSeed % 2 === 0) ? 'first' : 'last';
                // const mode = 'first'; // Debug force

                const targetChar = mode === 'first' ? targetWord.charAt(0) : targetWord.slice(-1);
                
                // Find Matches from Pool
                const pool = SOUND_MATCH_POOL || ['cat', 'dog', 'bat', 'sit']; 
                
                const matches = pool.filter(w => {
                     const wClean = w.toLowerCase();
                     if (wClean === targetWord) return false; // Exclude self
                     const char = mode === 'first' ? wClean.charAt(0) : wClean.slice(-1);
                     return char === targetChar;
                });

                // Find Distractors
                const distractorsPool = pool.filter(w => {
                     const wClean = w.toLowerCase();
                     if (wClean === targetWord) return false;
                     const char = mode === 'first' ? wClean.charAt(0) : wClean.slice(-1);
                     return char !== targetChar;
                });

                // Select subsets (Randomize)
                // specific seed logic to keep stable during re-renders? 
                // Using simple shuffle for now, assuming state stability upstream.
                const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
                
                const selectedMatches = shuffle(matches).slice(0, 4);
                const selectedDistractors = shuffle(distractorsPool).slice(0, 4);

                // Ensure we have enough options? If not, fallback to synthesis (risky) or relax
                if (selectedMatches.length < 2) {
                    // Fallback: If not enough matches, just pick random distractors and maybe duplicate? 
                    // Or skip? Ideally pool is big enough.
                }

                return (
                    <WordFamiliesView 
                        key={`${targetWord}-${mode}`} 
                        data={{
                            family: mode === 'first' ? `Starts with ${targetChar.toUpperCase()}` : `Ends with ${targetChar.toUpperCase()}`,
                            mode: mode,
                            targetChar: targetChar,
                            targetWord: targetWord,
                            options: selectedMatches,
                            distractors: selectedDistractors
                        }}
                        onPlayAudio={handleAudio}
                        isEditing={isEditing}
                        onUpdateOption={handleOptionUpdate}
                        onCheckAnswer={(word) => {
                            checkAnswer('correct', 'correct'); 
                        }}
                    />
                );
            }
"""

def refactor():
    print("🚀 Starting Sound Matching Refactor...")
    
    try:
        with open(FILE_PATH, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"❌ Read Error: {e}")
        return

    # 1. Inject Pool
    if "const SOUND_MATCH_POOL" not in content:
        print("💉 Injecting SOUND_MATCH_POOL...")
        # Inject after PHONEME_AUDIO_BANK
        if "const PHONEME_AUDIO_BANK" in content:
            content = content.replace("const PHONEME_AUDIO_BANK", POOL_CODE + "\nconst PHONEME_AUDIO_BANK")
        else:
            print("⚠️ PHONEME_AUDIO_BANK not found, injecting at top vars")
            # Inject after imports? rough guess
            content = POOL_CODE + "\n" + content
    else:
        print("ℹ️ Pool already exists.")

    # 2. Replace Case 'word_families'
    print("🔄 Replacing logic case...")
    # Regex to find the case block. It ends with break; or return (...); }
    # The existing code uses return (...); inside the case.
    # It starts with case 'word_families': {
    
    pattern = r"case 'word_families': \{[\s\S]*?return \(\s*<WordFamiliesView[\s\S]*?\);\s*\}"
    
    # Check if we can find it
    match = re.search(pattern, content)
    if match:
        print(f"   Target found (Length: {len(match.group(0))})")
        # Replace
        content = content.replace(match.group(0), NEW_CASE_LOGIC.strip())
        print("   ✅ Logic Replaced.")
    else:
        print("❌ Case 'word_families' block not found via Regex.")
        # Fallback dump to debug?
        # Maybe indentation differences.

    # 3. Update WordFamiliesView UI
    print("🎨 Updating View UI...")
    # Find the Header JSX
    # <span className="text-xl font-black text-violet-600">_{data.family}</span>
    # Replace with something handling mode
    
    header_regex = r'<span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Word Family</span>\s*<span className="text-xl font-black text-violet-600">_\{data.family\}</span>'
    
    new_header = """<span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Sound Match</span>
                            <span className="text-xl font-black text-violet-600">{data.family}</span>"""
    
    if re.search(header_regex, content):
        content = re.sub(header_regex, new_header, content)
        print("   ✅ Header Updated.")
    else:
        print("⚠️ Header JSX not found. Might differ visually.")

    # 4. Update Instructions (L7196 area)
    # The prompt might rely on `ts('word_sounds.word_families_prompt')` or specific string
    # L7196: if (wordSoundsActivity === 'word_families' && currentWordSoundsWord) {
    # It plays the word. The text prompt is rendered elsewhere.
    # renderActivityContent usually renders the Prompts too? 
    # Actually L4218: label: 'Word Families'. We can update local label too?
    # L13613: word_families_prompt: "Which words belong in this house?"
    
    # Let's replace the string "Which words belong in this house?" with a generic sound one?
    # Or leave it? "Which words belong?" is kinda generic.
    
    # PROMPT UPDATE:
    # "Which words match the sound?"
    print("🗣️ Updating Prompt strings...")
    content = content.replace("Which words belong in this house?", "Which words match the sound?")
    content = content.replace("Explore patterns and related words", "Match words with the same start or end sound")

    # Final Write
    print("💾 Saving file...")
    try:
        with open(FILE_PATH, 'w', encoding='utf-8') as f:
            f.write(content)
        print("🎉 Refactor Complete.")
    except Exception as e:
        print(f"❌ Write Error: {e}")

if __name__ == "__main__":
    refactor()
