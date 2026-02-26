import json

new_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank_2026-02-20.json'
existing_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank.json'

with open(new_path, 'r', encoding='utf-8') as f:
    new_data = json.load(f)

with open(existing_path, 'r', encoding='utf-8') as f:
    existing = json.load(f)

# Check if new entries are in the existing bank
new_keys = set(new_data.keys())
print(f"New bank entries: {len(new_keys)}")
print(f"New bank keys: {sorted(new_keys)[:30]}...")

# Check which category they ended up in
for cat in existing:
    if isinstance(existing[cat], dict):
        cat_keys = set(existing[cat].keys())
        overlap = new_keys & cat_keys
        if overlap:
            print(f"\nCategory '{cat}': {len(cat_keys)} total, {len(overlap)} from new bank")
            print(f"  Found: {sorted(overlap)[:15]}...")

# Also verify the new entries were properly merged (not corrupted)
words_cat = existing.get('words', {})
sample_key = list(new_data.keys())[0]
if sample_key in words_cat:
    orig = new_data[sample_key]
    merged = words_cat[sample_key]
    # Check they match
    if isinstance(orig, dict) and isinstance(merged, dict):
        match = all(orig.get(k) == merged.get(k) for k in orig)
        print(f"\nIntegrity check for '{sample_key}': {'PASS' if match else 'FAIL'}")
    elif orig == merged:
        print(f"\nIntegrity check for '{sample_key}': PASS")
    else:
        print(f"\nIntegrity check for '{sample_key}': FAIL - formats differ")
        print(f"  Original type: {type(orig).__name__}, Merged type: {type(merged).__name__}")
else:
    print(f"\nWARNING: '{sample_key}' not found in any category!")
