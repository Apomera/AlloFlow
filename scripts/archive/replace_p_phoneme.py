"""
Replace the 'p' phoneme in audio_bank.json with the new recording from audio_input/p.webm.
"""
import base64
import json

# Convert new p.webm to base64
with open('audio_input/p.webm', 'rb') as f:
    data = f.read()
new_b64 = base64.b64encode(data).decode('ascii')
new_data_uri = f"data:audio/webm;base64,{new_b64}"

print(f"New p.webm: {len(data)} bytes, {len(new_b64)} base64 chars")

# Load audio_bank.json
with open('audio_bank.json', 'r', encoding='utf-8') as f:
    bank = json.load(f)

# Find and replace the 'p' phoneme
if 'phonemes' in bank and 'p' in bank['phonemes']:
    old_len = len(bank['phonemes']['p'])
    bank['phonemes']['p'] = new_data_uri
    print(f"Replaced phonemes.p: {old_len} chars -> {len(new_data_uri)} chars")
else:
    print("ERROR: phonemes.p not found in audio_bank.json")
    # Show available keys
    if 'phonemes' in bank:
        print(f"Available phoneme keys: {sorted(bank['phonemes'].keys())}")
    else:
        print(f"Available top-level keys: {list(bank.keys())}")
    exit(1)

# Save updated audio_bank.json
with open('audio_bank.json', 'w', encoding='utf-8') as f:
    json.dump(bank, f, separators=(',', ':'))

print("Saved updated audio_bank.json")

# Now also update the inline PHONEME_AUDIO_BANK in AlloFlowANTI.txt
# The raw function _LOAD_PHONEME_AUDIO_BANK_RAW() contains inline base64
# We need to find the 'p' entry there and replace it too
print("\nChecking AlloFlowANTI.txt for inline phoneme data...")
with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# The inline bank has entries like: 'p': 'data:audio/webm;base64,...',
import re
# Find the 'p' entry in the raw loader function
pattern = r"'p'\s*:\s*'data:audio/webm;base64,[A-Za-z0-9+/=]+'"
match = re.search(pattern, content)
if match:
    old_entry = match.group(0)
    new_entry = f"'p': '{new_data_uri}'"
    content = content.replace(old_entry, new_entry, 1)
    print(f"Replaced inline p phoneme: {len(old_entry)} chars -> {len(new_entry)} chars")
    
    with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Saved updated AlloFlowANTI.txt")
else:
    # Try alternative pattern with double quotes
    pattern2 = r'"p"\s*:\s*"data:audio/webm;base64,[A-Za-z0-9+/=]+"'
    match2 = re.search(pattern2, content)
    if match2:
        old_entry = match2.group(0)
        new_entry = f'"p": "{new_data_uri}"'
        content = content.replace(old_entry, new_entry, 1)
        print(f"Replaced inline p phoneme (double-quoted): {len(old_entry)} chars -> {len(new_entry)} chars")
        with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
            f.write(content)
        print("Saved updated AlloFlowANTI.txt")
    else:
        print("No inline p phoneme found in AlloFlowANTI.txt (it may use getAudio() only)")

print("\nDone!")
