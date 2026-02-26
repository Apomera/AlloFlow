"""
Re-inject with the better 'with the sound' variant audio files.
Also add both version so the shorter variant is also available.
"""
import os, sys, json, base64
sys.stdout.reconfigure(encoding='utf-8')

INSTRUCTIONS_DIR = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\Instructions List"
BANK_FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank.json"

def file_to_data_uri(filepath):
    with open(filepath, 'rb') as f:
        raw = f.read()
    b64 = base64.b64encode(raw).decode('ascii')
    return f"data:audio/webm;base64,{b64}", len(b64)

# Map specific files to bank keys
file_map = {
    'find_all_the_words_that_start_with_the_sound_instruction.webm': 'sound_match_start',
    'find_all_the_words_that_end_with_the_sound_instruction.webm': 'sound_match_end',
    'find_all_words_that_start_with_instruction.webm': 'sound_match_start_short',
    'find_all_the_words_that_end_with_instruction.webm': 'sound_match_end_short',
}

# Load bank
with open(BANK_FILE, 'r', encoding='utf-8') as f:
    bank = json.load(f)

inst = bank.get('instructions', {})

for filename, key in file_map.items():
    filepath = os.path.join(INSTRUCTIONS_DIR, filename)
    if os.path.exists(filepath):
        data_uri, b64_len = file_to_data_uri(filepath)
        old_len = len(inst.get(key, ''))
        inst[key] = data_uri
        action = 'UPDATED' if old_len > 0 else 'ADDED'
        print(f"  [{action}] {key} <- {filename} ({b64_len} b64 chars)")
    else:
        print(f"  [SKIP] {filename} not found")

bank['instructions'] = inst

# Save
with open(BANK_FILE, 'w', encoding='utf-8') as f:
    json.dump(bank, f, indent=2)

print(f"\naudio_bank.json saved ({os.path.getsize(BANK_FILE):,} bytes)")
print(f"Total instruction entries: {len(inst)}")

# Verify
for k in ['sound_match_start', 'sound_match_end', 'sound_match_start_short', 'sound_match_end_short', 'mapping']:
    print(f"  {k}: {'PRESENT' if k in inst and len(inst[k]) > 50 else 'MISSING'}")
