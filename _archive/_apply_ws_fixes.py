import re

path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

patches = []

# =====================================================================
# FIX 1: Replace blending instruction text (L9513)
# =====================================================================
for i, line in enumerate(lines):
    if 'Listen to the sounds, then' in line and 'pick the word' in line and '<p className' in line:
        old = lines[i]
        lines[i] = '                                    <p className="text-sm text-slate-500">{ts(\'word_sounds.blending_prompt\') || \'Which word did you hear?\'}</p>\r\n'
        patches.append(f'FIX1: Replaced blending instruction text at L{i+1}')
        break

# =====================================================================
# FIX 2: Chain "Which word did you hear?" TTS in playBlending()
# =====================================================================
for i, line in enumerate(lines):
    if 'setBlendingProgress((wordSoundsPhonemes.phonemes?.length || 0) + 1)' in line:
        # Insert TTS chain after this line
        insert_lines = [
            '        // Chain the instruction prompt before response options\r\n',
            "        await new Promise(r => setTimeout(r, 400));\r\n",
            "        await handleAudio('Which word did you hear?');\r\n",
        ]
        for j, ins in enumerate(insert_lines):
            lines.insert(i + 1 + j, ins)
        patches.append(f'FIX2: Added "Which word did you hear?" TTS chain after L{i+1}')
        break

# =====================================================================
# FIX 3a: Remove blocking Promise.all pre-fetch in initial rhyme chain
# Also reduce 600ms gap to 300ms
# =====================================================================
for i, line in enumerate(lines):
    # Find the first rhyming block in the initial instruction chain
    if "wordSoundsActivity === 'rhyming' && rhymeOptionsRef.current && rhymeOptionsRef.current.length > 0" in line:
        # Check if next few lines have the Promise.all pre-fetch pattern
        for j in range(i+1, min(len(lines), i+8)):
            if 'await new Promise(r => setTimeout(r, 600))' in lines[j] or 'await new Promise(r => setTimeout(r, 500))' in lines[j]:
                # Replace with 300ms
                lines[j] = lines[j].replace('setTimeout(r, 600)', 'setTimeout(r, 300)').replace('setTimeout(r, 500)', 'setTimeout(r, 300)')
                patches.append(f'FIX3a: Reduced gap to 300ms at L{j+1}')
            if 'Promise.all(rhymeOptionsRef.current.map' in lines[j]:
                # Remove the Promise.all pre-fetch line
                # Also remove the empty line before/after if present
                lines[j] = '\r\n'  # Replace with empty line
                patches.append(f'FIX3a: Removed blocking Promise.all pre-fetch at L{j+1}')

# =====================================================================
# FIX 3b: Same for the playInstructions useEffect rhyming block
# (already handled by the loop above since it iterates ALL matching lines)
# =====================================================================

# =====================================================================
# FIX 4: Fix RhymeView "Play all options" highlight bug
# Wrap each iteration in Promise.all with minimum delay
# =====================================================================
for i, line in enumerate(lines):
    # Find the RhymeView play all options onClick handler
    if 'const opts = data.options || []' in line:
        # Look for the loop pattern in the next few lines
        for j in range(i+1, min(len(lines), i+10)):
            if 'setPlayingIndex(i);' in lines[j]:
                # Find the onPlayAudio line and the setTimeout line
                audio_line_idx = j + 1
                delay_line_idx = j + 2
                if 'await onPlayAudio(opts[i]' in lines[audio_line_idx] and 'await new Promise(r => setTimeout(r' in lines[delay_line_idx]:
                    # Replace both lines with Promise.all pattern
                    old_audio = lines[audio_line_idx].rstrip()
                    old_delay = lines[delay_line_idx].rstrip()
                    indent = '                            '
                    lines[audio_line_idx] = f'{indent}const audioPromise = onPlayAudio(opts[i], true);\r\n'
                    lines[delay_line_idx] = f'{indent}const minDelay = new Promise(r => setTimeout(r, 800));\r\n'
                    # Insert the await Promise.all line after
                    lines.insert(delay_line_idx + 1, f'{indent}await Promise.all([audioPromise, minDelay]);\r\n')
                    patches.append(f'FIX4: Fixed rhyme highlight with Promise.all minimum delay at L{j+1}')
                break
        break

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

for p in patches:
    print(p)
print(f'\nTotal patches: {len(patches)}')
print(f'New total lines: {len(lines)}')
