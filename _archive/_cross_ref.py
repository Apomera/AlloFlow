import json

# Load all relevant files
new_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank_2026-02-20.json'
bank_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank.json'
needed_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\tts_words_needed_updated.json'

with open(new_path, 'r', encoding='utf-8') as f:
    new_data = json.load(f)

with open(bank_path, 'r', encoding='utf-8') as f:
    bank = json.load(f)

with open(needed_path, 'r', encoding='utf-8') as f:
    needed = json.load(f)

# 1. Verify ALL entries from new bank are in audio_bank.json
new_keys = set(new_data.keys())
bank_words = set(bank.get('words', {}).keys())
missing_from_bank = new_keys - bank_words
print(f"=== MERGE VERIFICATION ===")
print(f"New bank entries: {len(new_keys)}")
print(f"Audio bank words: {len(bank_words)}")
print(f"Missing from bank (should be 0): {len(missing_from_bank)}")
if missing_from_bank:
    print(f"  MISSING: {sorted(missing_from_bank)}")

# 2. Examine tts_words_needed_updated.json structure
print(f"\n=== TTS WORDS NEEDED ===")
print(f"Type: {type(needed).__name__}")
if isinstance(needed, list):
    print(f"Total entries: {len(needed)}")
    if needed:
        print(f"Sample entry: {needed[0]}")
        # Check if entries are strings or dicts
        if isinstance(needed[0], str):
            needed_words = set(needed)
        elif isinstance(needed[0], dict):
            print(f"  Keys: {list(needed[0].keys())}")
            # Try common key names
            for key in ['word', 'text', 'name', 'term']:
                if key in needed[0]:
                    needed_words = set(item[key] for item in needed if key in item)
                    print(f"  Using key '{key}'")
                    break
            else:
                needed_words = set()
                print("  Could not determine word key")
elif isinstance(needed, dict):
    print(f"Total keys: {len(needed)}")
    sample_keys = list(needed.keys())[:5]
    print(f"Sample keys: {sample_keys}")
    needed_words = set(needed.keys())

# 3. Cross-reference: which "needed" words are NOW in the bank?
all_bank_audio = set()
for cat in bank:
    if isinstance(bank[cat], dict):
        all_bank_audio.update(bank[cat].keys())

# Also check phonemes category
print(f"\n=== ALL AUDIO IN BANK ===")
for cat in bank:
    if isinstance(bank[cat], dict):
        print(f"  {cat}: {len(bank[cat])} entries")

now_have = needed_words & all_bank_audio
still_need = needed_words - all_bank_audio
print(f"\n=== CROSS-REFERENCE ===")
print(f"Words previously needed: {len(needed_words)}")
print(f"Now have audio for: {len(now_have)}")
print(f"Still need audio for: {len(still_need)}")
if still_need:
    still_need_sorted = sorted(still_need)
    print(f"\nStill needed ({len(still_need_sorted)}):")
    for w in still_need_sorted:
        print(f"  {w}")
