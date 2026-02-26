#!/usr/bin/env python3
"""
Rhyme Time TTS Fix - Add target word chaining for TTS fallback path
When INSTRUCTION_AUDIO['rhyming'] doesn't exist, the TTS fallback should also chain the target word.
"""

from pathlib import Path

def apply_fix(file_path: Path) -> bool:
    """Fix the TTS fallback to also play target word after instruction."""
    
    content = file_path.read_text(encoding='utf-8')
    
    # The current TTS fallback block (L7024-7027)
    old_fallback = '''                } else {
                    // TTS fallback - play instruction with word embedded, then play word separately for clarity
                    instructionText = `Which word rhymes with ${currentWordSoundsWord}?`;
                }'''
    
    # Updated: Play instruction text then chain word audio after
    new_fallback = '''                } else {
                    // TTS fallback - play generic instruction first, then chain target word as separate audio
                    await handleAudio("Which word rhymes with");
                    await new Promise(r => setTimeout(r, 200));
                    await handleAudio(currentWordSoundsWord);
                }'''
    
    if old_fallback in content:
        content = content.replace(old_fallback, new_fallback)
        file_path.write_text(content, encoding='utf-8')
        print("✓ Fixed TTS fallback to chain target word separately")
        return True
    else:
        print("  Could not find the TTS fallback pattern")
        # Check if it might already be fixed
        if 'await handleAudio("Which word rhymes with")' in content:
            print("  ℹ TTS fallback appears to already be fixed")
            return True
        return False

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    apply_fix(file_path)
