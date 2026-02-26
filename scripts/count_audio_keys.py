import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Count getAudio calls by category
phoneme_count = 0
instruction_count = 0
letter_count = 0
isolation_count = 0

phoneme_keys = []
instruction_keys = []

for line in lines:
    if "getAudio('phonemes'" in line or 'getAudio("phonemes"' in line:
        phoneme_count += 1
        m = re.search(r"['\"](\w+)['\"]\s*:", line)
        if m:
            phoneme_keys.append(m.group(1))
    if "getAudio('instructions'" in line or 'getAudio("instructions"' in line:
        instruction_count += 1
        m = re.search(r"['\"]([^'\"]+)['\"]\s*:", line)
        if m:
            instruction_keys.append(m.group(1))
    if "getAudio('letters'" in line or 'getAudio("letters"' in line:
        letter_count += 1
    if "getAudio('isolation'" in line or 'getAudio("isolation"' in line:
        isolation_count += 1

print(f"PHONEME_AUDIO_BANK: {phoneme_count} entries")
print(f"  Keys: {', '.join(phoneme_keys)}")
print(f"INSTRUCTION_AUDIO: {instruction_count} entries")
print(f"  Keys: {', '.join(instruction_keys)}")
print(f"LETTER_NAME_AUDIO: {letter_count} entries")
print(f"ISOLATION_AUDIO: {isolation_count} entries")
print(f"TOTAL EMBEDDED: {phoneme_count + instruction_count + letter_count + isolation_count}")
