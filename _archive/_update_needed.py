import json

bank_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank.json'
needed_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\tts_words_needed_updated.json'

with open(bank_path, 'r', encoding='utf-8') as f:
    bank = json.load(f)

with open(needed_path, 'r', encoding='utf-8') as f:
    needed = json.load(f)

# Collect ALL audio keys from all categories in the bank
all_audio = set()
for cat in bank:
    if isinstance(bank[cat], dict):
        all_audio.update(bank[cat].keys())
        # Also check lowercase versions
        all_audio.update(k.lower() for k in bank[cat].keys())

print(f"Total audio entries across all categories: {len(all_audio)}")
print(f"Bank categories: {', '.join(f'{cat}({len(bank[cat])})' for cat in bank if isinstance(bank[cat], dict))}")

# Process each word category
categories = ['words_short', 'words_medium', 'words_long']
total_had = 0
total_still_need = 0
new_needed = {}

for cat in categories:
    words = needed.get(cat, [])
    still_need = []
    now_have = []
    for w in words:
        if w.lower() in all_audio or w in all_audio:
            now_have.append(w)
        else:
            still_need.append(w)
    
    print(f"\n{cat}: {len(words)} total -> {len(now_have)} now have, {len(still_need)} still need")
    if now_have:
        print(f"  Now have: {now_have[:20]}{'...' if len(now_have) > 20 else ''}")
    
    new_needed[cat] = sorted(still_need)
    total_had += len(now_have)
    total_still_need += len(still_need)

print(f"\n=== SUMMARY ===")
print(f"Previously needed: {sum(len(needed.get(c, [])) for c in categories)}")
print(f"Now have audio for: {total_had}")
print(f"Still need: {total_still_need}")

# Build updated file
updated = {
    "summary": {
        "total_words_needed": total_still_need,
        "note": "These are the hardcoded words used in Word Sounds activities and Benchmark Probes that still need TTS audio generated.",
        "breakdown": {
            "short_words_2_to_4": len(new_needed.get('words_short', [])),
            "medium_words_5_to_8": len(new_needed.get('words_medium', [])),
            "long_words_9_plus": len(new_needed.get('words_long', []))
        }
    },
    "words_short": new_needed.get('words_short', []),
    "words_medium": new_needed.get('words_medium', []),
    "words_long": new_needed.get('words_long', [])
}

with open(needed_path, 'w', encoding='utf-8') as f:
    json.dump(updated, f, indent=2)

print(f"\nUpdated {needed_path}")
print(f"New totals: short={len(updated['words_short'])}, medium={len(updated['words_medium'])}, long={len(updated['words_long'])}")
