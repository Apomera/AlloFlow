import json, base64

# 1. Convert webm to base64 data URI
audio_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_input4\which_word_did_you_hear__instruction.webm'
with open(audio_path, 'rb') as f:
    audio_data = f.read()
b64 = base64.b64encode(audio_data).decode('utf-8')
data_uri = f'data:audio/webm;base64,{b64}'

# 2. Add to audio_bank.json
bank_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank.json'
with open(bank_path, 'r', encoding='utf-8') as f:
    bank = json.load(f)

if 'instructions' not in bank:
    bank['instructions'] = {}

bank['instructions']['inst_which_word_did_you_hear'] = data_uri
print(f'Added inst_which_word_did_you_hear to audio_bank.json ({len(data_uri)} chars)')

with open(bank_path, 'w', encoding='utf-8') as f:
    json.dump(bank, f, indent=2)
print('Saved audio_bank.json')

# 3. Add entries in AlloFlowANTI.txt
anti_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
with open(anti_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

patches = []

# 3a. Add key to _LOAD_INSTRUCTION_AUDIO_RAW return object (after inst_blending line)
for i, line in enumerate(lines):
    if "'inst_blending', getAudio('instructions', 'inst_blending')" in line:
        # Insert a new _LOAD_INSTRUCTION_AUDIO_RAW entry after this line
        new_line = "_LOAD_INSTRUCTION_AUDIO_RAW('inst_which_word_did_you_hear', getAudio('instructions', 'inst_which_word_did_you_hear'));\r\n"
        lines.insert(i + 1, new_line)
        patches.append(f'Added _LOAD_INSTRUCTION_AUDIO_RAW entry after L{i+1}')
        break

# 3b. Add to the return object of _LOAD_INSTRUCTION_AUDIO_RAW function
# Find the blending key in the return object and add which_word_did_you_hear after it
for i, line in enumerate(lines):
    if "blending: getAudio('instructions', 'blending')" in line and 'return' not in line:
        new_key = "    which_word_did_you_hear: getAudio('instructions', 'inst_which_word_did_you_hear'),\r\n"
        lines.insert(i + 1, new_key)
        patches.append(f'Added which_word_did_you_hear key to return object after L{i+1}')
        break

with open(anti_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

for p in patches:
    print(p)
print(f'Total patches: {len(patches)}')
print(f'New total lines: {len(lines)}')
