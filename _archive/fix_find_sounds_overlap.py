import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix Block 3: Lines ~7716 to prevent TTS overlap by safely retrieving audio
# The issue: isolationState.currentPosition is "first" or "middle" or "last", not an index.
# So ordinals[isolationState.currentPosition] is undefined.
# The `posKey` needs to map "first" to "1st", "last" to "last" etc.
old_block_3 = """                } else if (wordSoundsActivity === 'isolation' && isolationState) {
                    const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
                    const posKey = ordinals[isolationState.currentPosition] || 'fallback';
                    if (typeof ISOLATION_AUDIO !== 'undefined' && ISOLATION_AUDIO[posKey]) {
                        instructionAudioSrc = ISOLATION_AUDIO[posKey];
                    } else {
                        const ordinalNames = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth"];
                        const posStr = ordinalNames[isolationState.currentPosition] || "target";
                        instructionText = `What is the ${posStr} sound in ${currentWordSoundsWord}?`;
                    }
                }"""

new_block_3 = """                } else if (wordSoundsActivity === 'isolation' && isolationState) {
                    const posRaw = isolationState.currentPosition;
                    // Attempt to map string positions to the loaded pre-generated audio array
                    const posKeyMap = { 'first': '1st', 'middle': 'middle', 'last': 'last' };
                    // If posRaw is an integer, use ordinals array, else use map
                    const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
                    const posKey = typeof posRaw === 'number' ? ordinals[posRaw] : (posKeyMap[posRaw] || posRaw);
                    
                    if (typeof ISOLATION_AUDIO !== 'undefined' && ISOLATION_AUDIO[posKey]) {
                        instructionAudioSrc = ISOLATION_AUDIO[posKey];
                    } else {
                        // Fallback to TTS generation if audio is missing
                        const ordinalNames = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth"];
                        const posStr = typeof posRaw === 'number' ? ordinalNames[posRaw] : posRaw;
                        instructionText = `What is the ${posStr || "target"} sound in ${currentWordSoundsWord}?`;
                    }
                }"""

if old_block_3 in text:
    text = text.replace(old_block_3, new_block_3)
    print("Patched Find Sounds TTS Overlap logic")
else:
    print("Could not find the target text block for TTS Overlap.")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(text)
