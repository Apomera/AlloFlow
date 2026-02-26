import json

new_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank_2026-02-20.json'
existing_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank.json'

with open(new_path, 'r', encoding='utf-8') as f:
    new_data = json.load(f)

with open(existing_path, 'r', encoding='utf-8') as f:
    existing = json.load(f)

# Show existing categories and their sizes
print("=== BEFORE MERGE ===")
for cat in existing:
    if isinstance(existing[cat], dict):
        print(f"  {cat}: {len(existing[cat])} entries")

# Ensure words category exists
if 'words' not in existing:
    existing['words'] = {}

# Merge all new entries into words category
new_count = 0
updated_count = 0
for word, audio_data in new_data.items():
    if word in existing['words']:
        updated_count += 1
    else:
        new_count += 1
    existing['words'][word] = audio_data

print(f"\n=== MERGE RESULTS ===")
print(f"New words added: {new_count}")
print(f"Existing words updated: {updated_count}")
print(f"Total words now: {len(existing['words'])}")

# Verify a sample
sample = list(new_data.keys())[0]
if sample in existing['words']:
    orig = new_data[sample]
    merged = existing['words'][sample]
    if orig == merged:
        print(f"Integrity check '{sample}': PASS")
    else:
        print(f"Integrity check '{sample}': FAIL")
else:
    print(f"ERROR: '{sample}' not found after merge!")

print("\n=== AFTER MERGE ===")
for cat in existing:
    if isinstance(existing[cat], dict):
        print(f"  {cat}: {len(existing[cat])} entries")

with open(existing_path, 'w', encoding='utf-8') as f:
    json.dump(existing, f, indent=2)

import os
print(f"\nSaved audio_bank.json ({os.path.getsize(existing_path)} bytes)")
