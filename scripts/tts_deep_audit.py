"""
Deep TTS audit: Count all pre-embedded audio bank keys and
identify every word that falls through to callTTS at runtime.
"""
import re, json

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("=" * 70)
print("COMPREHENSIVE TTS AUDIT - DEEP ANALYSIS")
print("=" * 70)

# 1. Find PHONEME_AUDIO_BANK keys
print("\n1. PHONEME_AUDIO_BANK")
phoneme_keys = []
in_phoneme_bank = False
for i, line in enumerate(lines):
    if '_LOAD_PHONEME_AUDIO_BANK_RAW' in line and ('function' in line):
        in_phoneme_bank = True
        print(f"   Loader starts at L{i+1}")
        continue
    if in_phoneme_bank:
        m = re.match(r"""\s+['"]?([^'":\s]+)['"]?\s*:\s*getAudio""", line)
        if m:
            phoneme_keys.append(m.group(1))
        if line.strip() == '};' or (line.strip() == '}' and i > 0 and 'return' not in lines[i-1]):
            in_phoneme_bank = False
            break

print(f"   Total keys: {len(phoneme_keys)}")
print(f"   Keys: {', '.join(phoneme_keys)}")

# 2. Find INSTRUCTION_AUDIO keys
print("\n2. INSTRUCTION_AUDIO")
instruction_keys = []
in_instruction = False
for i, line in enumerate(lines):
    if '_LOAD_INSTRUCTION_AUDIO_RAW' in line and 'function' in line:
        in_instruction = True
        print(f"   Loader starts at L{i+1}")
        continue
    if in_instruction:
        m = re.match(r"""\s+['"]?([^'":\s]+)['"]?\s*:\s*getAudio""", line)
        if m:
            instruction_keys.append(m.group(1))
        if line.strip().startswith('}') and len(instruction_keys) > 3:
            in_instruction = False
            break
# Also look for the supplementary entries (fb_amazing, etc.)
for i, line in enumerate(lines):
    if '_LOAD_INSTRUCTION_AUDIO_RAW(' in line and 'getAudio' in line:
        m = re.search(r"_LOAD_INSTRUCTION_AUDIO_RAW\(['\"](\w+)['\"]", line)
        if m and m.group(1) not in instruction_keys:
            instruction_keys.append(m.group(1))

print(f"   Total keys: {len(instruction_keys)}")
print(f"   Keys: {', '.join(instruction_keys)}")

# 3. Find ISOLATION_AUDIO keys
print("\n3. ISOLATION_AUDIO")
isolation_keys = []
for i, line in enumerate(lines):
    if '_LOAD_ISOLATION_AUDIO_RAW' in line and 'function' in line:
        print(f"   Loader starts at L{i+1}")
        for j in range(i+1, min(i+50, len(lines))):
            m = re.match(r"""\s+['"]?([^'":\s]+)['"]?\s*:\s*getAudio""", lines[j])
            if m:
                isolation_keys.append(m.group(1))
            if lines[j].strip().startswith('}') and len(isolation_keys) > 0:
                break
        break
print(f"   Total keys: {len(isolation_keys)}")
print(f"   Keys: {', '.join(isolation_keys)}")

# 4. Find LETTER_NAME_AUDIO keys
print("\n4. LETTER_NAME_AUDIO")
letter_keys = []
for i, line in enumerate(lines):
    if '_LOAD_LETTER_NAME_AUDIO_RAW' in line and 'function' in line:
        print(f"   Loader starts at L{i+1}")
        for j in range(i+1, min(i+50, len(lines))):
            m = re.match(r"""\s+['"]?([^'":\s]+)['"]?\s*:\s*getAudio""", lines[j])
            if m:
                letter_keys.append(m.group(1))
            if lines[j].strip() == '};':
                break
        break
print(f"   Total keys: {len(letter_keys)}")
print(f"   Keys: {', '.join(letter_keys)}")

# 5. Categorize handleAudio call sites by what they play
print("\n5. handleAudio() CALL SITE CATEGORIES")
categories = {
    'whole_word': [],       # Playing currentWordSoundsWord
    'phoneme': [],          # Playing individual phonemes
    'instruction': [],      # Playing INSTRUCTION_AUDIO
    'isolation_audio': [],  # Playing ISOLATION_AUDIO
    'letter_name': [],      # Playing LETTER_NAME_AUDIO
    'option_word': [],      # Playing option words (distractors, rhyme options)
    'dynamic_text': [],     # Playing dynamic text (TTS sentence/phrase)
    'other': [],
}

for i in range(4500, 12000):
    if 'handleAudio(' not in lines[i]:
        continue
    line = lines[i].strip()
    if 'currentWordSoundsWord' in line:
        categories['whole_word'].append(i+1)
    elif 'INSTRUCTION_AUDIO' in line:
        categories['instruction'].append(i+1)
    elif 'ISOLATION_AUDIO' in line:
        categories['isolation_audio'].append(i+1)
    elif 'LETTER_NAME_AUDIO' in line:
        categories['letter_name'].append(i+1)
    elif 'phoneme' in line.lower() or 'chip.phoneme' in line or 'box.phoneme' in line or 'phonemes[i]' in line:
        categories['phoneme'].append(i+1)
    elif 'Option' in line or 'option' in line or 'distractor' in line.lower() or 'blendingOptions' in line or 'rhymeOptions' in line or 'isoOptions' in line:
        categories['option_word'].append(i+1)
    elif 'targetWord' in line or 'newOption' in line or 'expectedAnswer' in line:
        categories['option_word'].append(i+1)
    elif '`' in line or '"' in line and 'Find all' in line:
        categories['dynamic_text'].append(i+1)
    elif 'word' in line.lower():
        categories['whole_word'].append(i+1)
    else:
        categories['other'].append(i+1)

for cat, line_nums in categories.items():
    print(f"   {cat}: {len(line_nums)} calls at {', '.join(['L'+str(n) for n in line_nums[:10]])}")
    if len(line_nums) > 10:
        print(f"     ... and {len(line_nums)-10} more")

# 6. Identify TTS API cost centers
print("\n6. TTS API COST CENTERS (callTTS calls)")
tts_calls = []
for i, line in enumerate(lines):
    if 'callTTS(' in line:
        tts_calls.append((i+1, line.strip()[:100]))
print(f"   Total callTTS sites: {len(tts_calls)}")
for ln, ctx in tts_calls:
    region = "Word Sounds" if 4500 <= ln <= 12000 else "Other App Feature"
    print(f"   L{ln} [{region}]: {ctx}")

# 7. Summary
print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)
print(f"Pre-embedded audio:")
print(f"  Phonemes: {len(phoneme_keys)} sounds")
print(f"  Instructions: {len(instruction_keys)} phrases")
print(f"  Letter Names: {len(letter_keys)} letters")
print(f"  Isolation Audio: {len(isolation_keys)} position labels")
total_embedded = len(phoneme_keys) + len(instruction_keys) + len(letter_keys) + len(isolation_keys)
print(f"  TOTAL EMBEDDED: {total_embedded}")
print(f"\nRuntime TTS (API calls):")
print(f"  callTTS sites: {len(tts_calls)}")
print(f"  Words needing TTS (from tts_words_needed.json): 1330")
print(f"\nhandleAudio calls in Word Sounds: {sum(len(v) for v in categories.values())}")
print(f"  - Pre-embedded: {len(categories['phoneme']) + len(categories['instruction']) + len(categories['isolation_audio']) + len(categories['letter_name'])} (phonemes + instructions + isolation + letters)")
print(f"  - Runtime TTS: {len(categories['whole_word']) + len(categories['option_word']) + len(categories['dynamic_text'])} (whole words + options + dynamic text)")
