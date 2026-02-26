import os
import re

# File paths
TARGET_FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
AUDIO_DATA_FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\new_instruction_audio.txt"

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    content = read_file(TARGET_FILE)
    audio_lines = read_file(AUDIO_DATA_FILE).strip().splitlines()
    
    print(f"Read {len(content)} characters from {TARGET_FILE}")
    print(f"Read {len(audio_lines)} new audio entries")

    # 1. Inject Audio Base64
    # Find the _LOAD_INSTRUCTION_AUDIO_RAW function return object end
    load_audio_pattern = r"(function _LOAD_INSTRUCTION_AUDIO_RAW\(\) \{[\s\S]*?return \{)([\s\S]*?)(\n\s+\};)"
    match = re.search(load_audio_pattern, content)
    if match:
        print("Found _LOAD_INSTRUCTION_AUDIO_RAW")
        existing_audio_block = match.group(2)
        
        # Check if keys already exist to avoid duplication
        new_audio_block = ""
        for line in audio_lines:
            key_match = re.match(r"^\s*(\w+):", line)
            if key_match:
                key = key_match.group(1)
                if key not in existing_audio_block:
                    new_audio_block += "\n" + line
                else:
                    print(f"Skipping existing audio key: {key}")
        
        if new_audio_block:
            # Insert before the closing brace of the return object
            insertion_point = match.end(2)
            content = content[:insertion_point] + new_audio_block + content[insertion_point:]
            print("Injected new audio keys.")
    else:
        print("ERROR: Could not find _LOAD_INSTRUCTION_AUDIO_RAW")

    # 2. Add Helper Functions inside WordSoundsStudio
    # Find PHONEME_BANK definition to place helpers after it
    # We want these helpers available to the component scope
    phoneme_bank_marker = "const PHONEME_BANK = {"
    phoneme_bank_end_marker = "};"
    
    # We'll look for PHONEME_BANK and insert after its closing brace
    pb_start = content.find(phoneme_bank_marker)
    if pb_start != -1:
        pb_end = content.find(phoneme_bank_end_marker, pb_start)
        if pb_end != -1:
            print("Found PHONEME_BANK")
            insertion_point = pb_end + 2
            
            helpers_code = """
    // HELPER: Phoneme Estimation from Orthography (for Word Matching)
    // Uses PHONEME_BANK categories to identify digraphs and r-controlled vowels
    const estimateFirstPhoneme = (word) => {
        if (!word) return '';
        const w = word.toLowerCase();
        
        // Priority 1: Digraphs (2 chars)
        const digraphs = PHONEME_BANK['Digraphs'] || [];
        for (const dg of digraphs) {
            if (w.startsWith(dg)) return dg;
        }
        
        // Priority 2: Special silent rules (optional, keep simple for now)
        if (w.startsWith('kn')) return 'n';
        if (w.startsWith('wr')) return 'r';
        
        return w.charAt(0);
    };

    const estimateLastPhoneme = (word) => {
        if (!word) return '';
        const w = word.toLowerCase();
        
        // Priority 1: R-Controlled (multi-char endings)
        const rControlled = PHONEME_BANK['R-Controlled'] || [];
        for (const rc of rControlled) {
            if (w.endsWith(rc)) return rc;
        }
        
        // Priority 2: Digraphs (ng, ch, sh, etc)
        const digraphs = PHONEME_BANK['Digraphs'] || [];
        for (const dg of digraphs) {
            if (dg === 'ck' && w.endsWith('ck')) return 'k'; // ck -> k sound
            if (w.endsWith(dg)) return dg;
        }
        
        return w.slice(-1);
    };
"""
            # Only insert if not already present
            if "const estimateFirstPhoneme" not in content:
                content = content[:insertion_point] + helpers_code + content[insertion_point:]
                print("Injected helper functions.")
            else:
                print("Helper functions already exist.")
    else:
        print("ERROR: Could not find PHONEME_BANK definition")

    # 3. Update playInstructionSequence
    # Look for 'wordSoundsActivity === 'rhyming'' and insert 'word_families' block before it
    rhyming_instr_marker = "else if (wordSoundsActivity === 'rhyming') {"
    
    word_families_instr_code = """            } else if (wordSoundsActivity === 'word_families') {
                // Word Families (Sound Matching) Instruction
                // Logic mirrors the component to determine Start vs End
                const targetWord = (currentWordSoundsWord || '').toLowerCase();
                const wordSeed = targetWord.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
                const mode = (wordSeed % 2 === 0) ? 'first' : 'last';
                
                // Determine target sound (use glossary data if avail, else estimate)
                let targetSound = '';
                if (wordSoundsPhonemes && wordSoundsPhonemes.phonemes) {
                    targetSound = mode === 'first' ? wordSoundsPhonemes.phonemes[0] : wordSoundsPhonemes.phonemes[wordSoundsPhonemes.phonemes.length - 1];
                } else {
                    targetSound = mode === 'first' ? estimateFirstPhoneme(targetWord) : estimateLastPhoneme(targetWord);
                }

                // Clean sound for audio key if needed (e.g. remove stress markers if IPA)
                // For now assuming estimate/glossary matches audio keys
                
                if (mode === 'first') {
                    if (typeof INSTRUCTION_AUDIO !== 'undefined' && INSTRUCTION_AUDIO['sound_match_start']) {
                        await handleAudio(INSTRUCTION_AUDIO['sound_match_start']); // "Find all words that start with..."
                        if (cancelled) return;
                        await new Promise(r => setTimeout(r, 300));
                        await handleAudio(targetSound); // "... /b/"
                    } else {
                        instructionText = `Find words that start with the ${targetSound} sound`;
                    }
                } else {
                    if (typeof INSTRUCTION_AUDIO !== 'undefined' && INSTRUCTION_AUDIO['sound_match_end']) {
                        await handleAudio(INSTRUCTION_AUDIO['sound_match_end']); // "Find all words that end with..."
                        if (cancelled) return;
                        await new Promise(r => setTimeout(r, 300));
                        await handleAudio(targetSound); // "... /ar/"
                    } else {
                        instructionText = `Find words that end with the ${targetSound} sound`;
                    }
                }
"""
    if rhyming_instr_marker in content and "wordSoundsActivity === 'word_families'" not in content[content.find(rhyming_instr_marker)-500:content.find(rhyming_instr_marker)+500]: # simplistic check
         # Actually just check global presence first to be safe, but context matters
         # Let's insert before rhyming
         content = content.replace(rhyming_instr_marker, word_families_instr_code + "\n" + rhyming_instr_marker)
         print("Injected word_families instruction logic.")
    
    # 4. Refactor Word Families Component Logic
    # Find the case 'word_families': block and replace it
    # We need a robust regex for this block.
    # It starts with "case 'word_families': {" and ends with "}" before "case 'letter_tracing':" or similar.
    # Let's find start and the next case to define range.
    
    wf_start_marker = "case 'word_families': {"
    wf_next_case_marker = "case 'letter_tracing':"
    
    start_idx = content.find(wf_start_marker)
    end_idx = content.find(wf_next_case_marker)
    
    if start_idx != -1 and end_idx != -1:
        print(f"Found word_families block at {start_idx}")
        # Find the actual closing brace for the case block. 
        # Usually it's just before the next case.
        # We'll replace from start marker up to the last closing brace before next case.
        # Looking backwards from end_idx for the '}' of the previous block
        block_end = content.rfind("}", start_idx, end_idx) + 1
        
        # Construct new block
        new_wf_logic = """            case 'word_families': {
                // REFACTORED: PHONEME-AWARE SOUND MATCHING
                const targetWord = (currentWordSoundsWord || '').toLowerCase();
                if (!targetWord || targetWord.length < 2) return null;

                // Deterministic Mode (First/Last)
                const wordSeed = targetWord.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
                const mode = (wordSeed % 2 === 0) ? 'first' : 'last';

                // GET TARGET PHONEME (Priority: Glossary/API -> Estimate)
                let targetPhoneme = '';
                if (wordSoundsPhonemes && wordSoundsPhonemes.phonemes && wordSoundsPhonemes.phonemes.length > 0) {
                    targetPhoneme = mode === 'first' 
                        ? wordSoundsPhonemes.phonemes[0] 
                        : wordSoundsPhonemes.phonemes[wordSoundsPhonemes.phonemes.length - 1];
                } else {
                    targetPhoneme = mode === 'first' ? estimateFirstPhoneme(targetWord) : estimateLastPhoneme(targetWord);
                }
                
                // Find Matches from Pool (Orthographic Estimation)
                // Expanded Pool logic handled by adding words to SOUND_MATCH_POOL definition if needed, 
                // but here we ensure accurate filtering using new helpers.
                const pool = SOUND_MATCH_POOL || ['bat', 'cat', 'dog', 'sit']; 
                
                const matches = pool.filter(w => {
                     const wClean = w.toLowerCase();
                     if (wClean === targetWord) return false;
                     // Use estimator for pool comparison
                     const pPhoneme = mode === 'first' ? estimateFirstPhoneme(wClean) : estimateLastPhoneme(wClean);
                     return pPhoneme === targetPhoneme;
                });

                // Find Distractors
                const distractorsPool = pool.filter(w => {
                     const wClean = w.toLowerCase();
                     if (wClean === targetWord) return false;
                     const pPhoneme = mode === 'first' ? estimateFirstPhoneme(wClean) : estimateLastPhoneme(wClean);
                     return pPhoneme !== targetPhoneme;
                });

                // STABILIZED SHUFFLE
                // Use a seeded random based on targetWord to keep options stable across re-renders
                // preventing "jumping" buttons when state updates.
                const seededRandom = (seed) => {
                    let s = seed;
                    return () => {
                        s = Math.sin(s) * 10000;
                        return s - Math.floor(s);
                    };
                };
                
                const rng = seededRandom(wordSeed);
                const shuffleSeeded = (arr) => {
                    return [...arr].sort(() => rng() - 0.5);
                };

                // Fallback Logic: Ensure at least 4 options total
                let selectedMatches = shuffleSeeded(matches).slice(0, 4);
                
                // If not enough matches, relax criteria or just fill with distractors?
                // Realistically, for CVC/WordFamilies, we might just have 1-2 matches.
                // We typically want 1 correct, 3 distractors OR 'Find ALL' style.
                // Current UI is "Word Families" - implies finding multiple members.
                
                // If 0 matches found (rare if pool is good), we might need a failsafe.
                if (selectedMatches.length === 0) {
                    console.warn(`No matches found for ${targetWord} (${mode}: ${targetPhoneme}) in pool.`);
                    // Fallback to simple char match if phoneme match fails completely?
                    // Or simply show fewer options.
                }

                // Fill rest with distractors to always have items
                const selectedDistractors = shuffleSeeded(distractorsPool).slice(0, 8); // Grab extra distractors

                return (
                    <WordFamiliesView 
                        key={`${targetWord}-${mode}`} 
                        data={{
                            family: mode === 'first' ? `Starts with ${targetPhoneme}` : `Ends with ${targetPhoneme}`,
                            mode: mode,
                            targetChar: targetPhoneme, // Pass phoneme as char for display/logic
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
            }"""
        
        # Simple string replacement for the block
        # We need to be careful about finding the *exact* block
        original_chunk = content[start_idx:end_idx]
        # Find just the closing brace of the switch case
        last_brace = original_chunk.rfind('}')
        if last_brace != -1:
             original_block = original_chunk[:last_brace+1]
             content = content.replace(original_block, new_wf_logic)
             print("Refactored word_families logic.")
        else:
             print("Could not cleanly identify word_families block end.")

    else:
        print("ERROR: Could not find word_families case block.")

    # 5. Fix Pre-loading Gap
    # Find "const fetchAudio = async () => {" inside glossary optimization
    fetch_audio_marker = "const fetchAudio = async () => {"
    # We want to add distractor loading lines inside the try block
    # Look for "await handleAudio(targetWord, false);"
    target_audio_line = "await handleAudio(targetWord, false);"
    
    if fetch_audio_marker in content:
        # We find the specific instance associated with 'wordEntry.phonemes' check
        # This is a bit risky with string replace if multiple exist, but code shows only one 'fetchAudio' defined inside 'preloadInitialBatch' in that file snippet.
        # Let's assume unique enough or use context.
        
        insert_code = """
                            // [FIX] Pre-load distractors for seamless gameplay
                            const distractorSets = [
                                ...(wordEntry.blendingDistractors || []),
                                ...(wordEntry.rhymeDistractors || []),
                                ...(wordEntry.familyMembers || [])
                            ];
                            if (distractorSets.length > 0) {
                                await Promise.all(distractorSets.map(d => handleAudio(d, false).catch(() => {})));
                            }
"""
        # Find location: after handleAudio(targetWord)
        idx = content.find(target_audio_line)
        if idx != -1:
             # Check if we are inside preloadInitialBatch (rough check)
             # just insert it after the target word load line
             content = content[:idx + len(target_audio_line)] + insert_code + content[idx + len(target_audio_line):]
             print("Injected distractor pre-loading logic.")
        else:
             print("ERROR: Could not find handleAudio(targetWord, false) line.")

    # 6. EXPAND SOUND MATCHING POOL
    # Add R-controlled words to the pool
    pool_marker = "const SOUND_MATCH_POOL = ["
    if pool_marker in content:
        # We just want to append some words to this array string
        # Let's find the closing bracket
        pool_start = content.find(pool_marker)
        pool_end = content.find("];", pool_start)
        if pool_end != -1:
            current_pool = content[pool_start:pool_end+1]
            # Add new words
            new_words = "'star', 'car', 'bird', 'her', 'for', 'corn', 'turn', 'burn', 'ship', 'shop', 'chip', 'chop', 'that', 'this'"
            # Check if they exist?
            # Easiest is to just insert them before the closing ]
            new_pool = current_pool.replace("];", ", " + new_words + "];")
            content = content.replace(current_pool, new_pool)
            print("Expanded SOUND_MATCH_POOL.")
    
    # Save
    write_file(TARGET_FILE, content)
    print("Code surgery complete.")

if __name__ == "__main__":
    main()
