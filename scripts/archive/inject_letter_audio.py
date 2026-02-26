"""
Convert Letter Name audio files to base64 and inject into audio_bank.json
Maps: a_sound.webm -> instructions.letter_a, etc.
"""
import sys, json, base64, os
sys.stdout.reconfigure(encoding='utf-8')

AUDIO_DIR = 'Letter Name audio'
BANK_FILE = 'audio_bank.json'

# Load audio bank
with open(BANK_FILE, 'r', encoding='utf-8') as f:
    bank = json.load(f)

if 'instructions' not in bank:
    bank['instructions'] = {}

letters = 'abcdefghijklmnopqrstuvwxyz'
added = 0
skipped = 0

for letter in letters:
    src_file = os.path.join(AUDIO_DIR, f'{letter}_sound.webm')
    key = f'letter_{letter}'
    
    if not os.path.exists(src_file):
        print(f"  MISSING: {src_file}")
        continue
    
    # Read and convert to base64
    with open(src_file, 'rb') as f:
        raw = f.read()
    
    b64 = base64.b64encode(raw).decode('ascii')
    data_uri = f'data:audio/webm;base64,{b64}'
    
    file_size = len(raw)
    b64_len = len(data_uri)
    
    if key in bank['instructions'] and bank['instructions'][key]:
        print(f"  SKIP: {key} already exists ({len(bank['instructions'][key])} chars)")
        skipped += 1
    else:
        bank['instructions'][key] = data_uri
        added += 1
        print(f"  ADDED: {key} ({file_size} bytes -> {b64_len} b64 chars)")

# Save
with open(BANK_FILE, 'w', encoding='utf-8') as f:
    json.dump(bank, f, indent=2, ensure_ascii=False)

print(f"\nDone! Added: {added}, Skipped: {skipped}")
print(f"Total instruction keys: {len(bank['instructions'])}")
