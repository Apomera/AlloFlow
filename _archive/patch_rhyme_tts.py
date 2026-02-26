"""
Patch script to fix Rhyme Time TTS issues in AlloFlowANTI.txt

Fixes:
1. Update RhymeView component to accept highlightedIndex prop and use merged activeIndex
2. Chain target word after rhyming instruction audio
3. Pass highlightedRhymeIndex prop to RhymeView component
"""

import shutil
from pathlib import Path

TARGET_FILE = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
BACKUP_FILE = TARGET_FILE.with_suffix(".txt.bak_rhyme_tts")

# Define surgical replacements as (old_text, new_text) tuples
REPLACEMENTS = [
    # Fix 1: Update RhymeView component signature to accept highlightedIndex
    (
        '''    const RhymeView = ({ data, showLetterHints, onPlayAudio, onCheckAnswer, isEditing, onUpdateOption }) => {
        const [playingIndex, setPlayingIndex] = React.useState(null); // Highlight during TTS
        return (''',
        '''    const RhymeView = ({ data, showLetterHints, onPlayAudio, onCheckAnswer, isEditing, onUpdateOption, highlightedIndex }) => {
        const [playingIndex, setPlayingIndex] = React.useState(null); // Highlight during TTS
        // Merge internal playback highlight with external auto-instruction highlight
        const activeIndex = playingIndex ?? highlightedIndex;
        return ('''
    ),
    
    # Fix 2: Update className to use activeIndex instead of playingIndex
    (
        '''className={`p-6 rounded-2xl bg-white border-2 transition-all group text-left cursor-pointer outline-none focus:ring-2 focus:ring-orange-400 ${playingIndex === i ? 'border-orange-500 bg-orange-100 ring-2 ring-orange-300 scale-105 shadow-lg' : 'border-slate-100 hover:border-orange-400 hover:bg-orange-50'}`}''',
        '''className={`p-6 rounded-2xl bg-white border-2 transition-all group text-left cursor-pointer outline-none focus:ring-2 focus:ring-orange-400 ${activeIndex === i ? 'border-orange-500 bg-orange-100 ring-2 ring-orange-300 scale-105 shadow-lg' : 'border-slate-100 hover:border-orange-400 hover:bg-orange-50'}`}'''
    ),
    
    # Fix 3: Chain target word after rhyming instruction audio
    (
        '''            } else if (wordSoundsActivity === 'rhyming') {
                // Check for pre-recorded instruction first
                if (typeof INSTRUCTION_AUDIO !== 'undefined' && INSTRUCTION_AUDIO['rhyming']) {
                    instructionAudioSrc = INSTRUCTION_AUDIO['rhyming'];
                } else {
                    instructionText = `Which word rhymes with ${currentWordSoundsWord}?`;
                }
            }''',
        '''            } else if (wordSoundsActivity === 'rhyming') {
                // Check for pre-recorded instruction first
                if (typeof INSTRUCTION_AUDIO !== 'undefined' && INSTRUCTION_AUDIO['rhyming']) {
                    // Play instruction audio then chain target word
                    await handleAudio(INSTRUCTION_AUDIO['rhyming']);
                    await new Promise(r => setTimeout(r, 200));
                    await handleAudio(currentWordSoundsWord); // Chain target word after instruction
                } else {
                    // TTS fallback - play instruction with word embedded
                    instructionText = `Which word rhymes with ${currentWordSoundsWord}?`;
                }
            }'''
    ),
    
    # Fix 4: Pass highlightedRhymeIndex prop to RhymeView component
    (
        '''                        <RhymeView
                            data={{
                                word: currentWordSoundsWord,
                                rhymeWord: wordSoundsPhonemes?.rhymeWord,
                                options: rhymeOptions
                            }}
                            showLetterHints={showLetterHints}''',
        '''                        <RhymeView
                            data={{
                                word: currentWordSoundsWord,
                                rhymeWord: wordSoundsPhonemes?.rhymeWord,
                                options: rhymeOptions
                            }}
                            highlightedIndex={highlightedRhymeIndex}
                            showLetterHints={showLetterHints}'''
    ),
]

def main():
    print(f"Reading {TARGET_FILE}...")
    content = TARGET_FILE.read_text(encoding='utf-8')
    original_content = content
    
    # Create backup
    print(f"Creating backup at {BACKUP_FILE}...")
    shutil.copy(TARGET_FILE, BACKUP_FILE)
    
    # Apply each replacement
    success_count = 0
    for i, (old_text, new_text) in enumerate(REPLACEMENTS, 1):
        if old_text in content:
            content = content.replace(old_text, new_text, 1)
            print(f"✅ Fix {i}: Applied successfully")
            success_count += 1
        else:
            print(f"❌ Fix {i}: Target text not found!")
            # Show a snippet of what we're looking for
            print(f"   Looking for: {old_text[:80]}...")
    
    if success_count == len(REPLACEMENTS):
        TARGET_FILE.write_text(content, encoding='utf-8')
        print(f"\n🎉 All {success_count} fixes applied successfully!")
        print(f"Backup saved to: {BACKUP_FILE}")
    else:
        print(f"\n⚠️ Only {success_count}/{len(REPLACEMENTS)} fixes applied.")
        if success_count > 0:
            TARGET_FILE.write_text(content, encoding='utf-8')
            print("Partial changes written to file.")
        else:
            print("No changes written.")

if __name__ == "__main__":
    main()
