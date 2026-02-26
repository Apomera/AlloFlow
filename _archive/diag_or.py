"""Diagnose 'or' phoneme issues"""
import re

f = open('AlloFlowANTI.txt', 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

out = open('_or_diag.txt', 'w', encoding='utf-8')

# 1. Search PHONEME_AUDIO_BANK for 'or' key
out.write('=== PHONEME_AUDIO_BANK definition + or key search ===\n')
for i, line in enumerate(lines[:1200]):
    if 'PHONEME_AUDIO_BANK' in line:
        out.write(f'L{i+1}: {line.rstrip()[:120]}\n')
    stripped = line.strip()
    # Look for 'or' as a key in the bank
    if stripped.startswith('"or"') or stripped.startswith("'or'") or stripped.startswith('or:') or stripped.startswith('"or":'):
        out.write(f'L{i+1} [KEY]: {stripped[:120]}\n')

# 2. Find all keys in PHONEME_AUDIO_BANK (looking for the r-controlled vowels)
out.write('\n=== Keys containing "or" or r-controlled vowels in bank ===\n')
in_bank = False
bank_start = 0
for i, line in enumerate(lines[:1200]):
    if 'PHONEME_AUDIO_BANK' in line and ('const' in line or '=' in line or 'return' in line):
        in_bank = True
        bank_start = i
    if in_bank:
        s = line.strip()
        # Match key patterns like "or":, 'or':, or:
        key_match = re.match(r'^["\']?(\w+)["\']?\s*:', s)
        if key_match:
            key = key_match.group(1)
            if 'or' in key.lower() or key in ['ar', 'er', 'ir', 'ur', 'ore', 'ear']:
                out.write(f'L{i+1}: key={key}  line={s[:80]}\n')
        if s == '};' and i > bank_start + 5:
            in_bank = False

# 3. handleAudio definition and audio lookup chain
out.write('\n=== handleAudio definition ===\n')
for i, line in enumerate(lines):
    if 'handleAudio' in line and 'useCallback' in line:
        out.write(f'L{i+1}: {line.rstrip()[:140]}\n')
        # Print the first 80 lines of the function
        for j in range(i, min(i+80, len(lines))):
            out.write(f'L{j+1}: {lines[j].rstrip()[:140]}\n')
        break

# 4. PHONEME_NORMALIZE
out.write('\n=== PHONEME_NORMALIZE definition ===\n')
for i, line in enumerate(lines):
    if 'PHONEME_NORMALIZE' in line and ('const' in line or '=' in line):
        out.write(f'L{i+1}: {line.rstrip()[:140]}\n')
        for j in range(i, min(i+30, len(lines))):
            out.write(f'L{j+1}: {lines[j].rstrip()[:140]}\n')
        break

# 5. Look for phoneme decomposition logic (how words are broken into phonemes)
out.write('\n=== Phoneme decomposition / word-to-phoneme mapping ===\n')
for i, line in enumerate(lines):
    if ('PHONEME_MAP' in line or 'phonemeMap' in line or 'GRAPHEME' in line) and ('const' in line or '=' in line):
        out.write(f'L{i+1}: {line.rstrip()[:140]}\n')

out.close()
print('Done')
