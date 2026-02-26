import json

bank_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank.json'
needed_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\tts_words_needed_updated.json'

with open(bank_path, 'r', encoding='utf-8') as f:
    bank = json.load(f)

with open(needed_path, 'r', encoding='utf-8') as f:
    needed = json.load(f)

# Show what we have
print("=== AUDIO BANK CONTENTS ===")
for cat in bank:
    if isinstance(bank[cat], dict):
        keys = sorted(bank[cat].keys())
        print(f"\n{cat} ({len(keys)} entries):")
        print(f"  {keys[:30]}")
        if len(keys) > 30:
            print(f"  ... and {len(keys) - 30} more")

# Show what we still need
print(f"\n=== STILL NEEDED ===")
print(f"Summary: {needed['summary']}")
cats = ['words_short', 'words_medium', 'words_long']
for c in cats:
    words = needed.get(c, [])
    print(f"\n{c}: {len(words)} words")

# Show which words from the new bank matched "needed" words
new_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank_2026-02-20.json'
with open(new_path, 'r', encoding='utf-8') as f:
    new_data = json.load(f)

new_keys = set(k.lower() for k in new_data.keys())
all_originally_needed = set()
orig_needed_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\tts_words_needed.json'
try:
    with open(orig_needed_path, 'r', encoding='utf-8') as f:
        orig = json.load(f)
    for c in cats:
        all_originally_needed.update(w.lower() for w in orig.get(c, []))
    print(f"\n=== ORIGINAL NEEDED: {len(all_originally_needed)} words ===")
except:
    pass

matched = new_keys & all_originally_needed
print(f"Words from new bank that were in the needed list: {len(matched)}")
if matched:
    print(f"  Matched: {sorted(matched)}")

unmatched = new_keys - all_originally_needed
print(f"\nWords from new bank NOT in needed list (bonus): {len(unmatched)}")
if unmatched:
    print(f"  Sample: {sorted(unmatched)[:20]}")
