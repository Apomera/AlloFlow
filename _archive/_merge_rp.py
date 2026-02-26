import json

rp_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\resource-pack-project-2026-02-20.json'
bank_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank.json'
needed_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\tts_words_needed_updated.json'

with open(rp_path, 'r', encoding='utf-8') as f:
    rp = json.load(f)

with open(bank_path, 'r', encoding='utf-8') as f:
    bank = json.load(f)

with open(needed_path, 'r', encoding='utf-8') as f:
    needed = json.load(f)

# 1. Examine resource pack structure
print("=== RESOURCE PACK STRUCTURE ===")
print(f"Type: {type(rp).__name__}")
if isinstance(rp, dict):
    keys = sorted(rp.keys())
    print(f"Total entries: {len(keys)}")
    print(f"All keys: {keys}")
    # Check first few values
    for k in keys[:5]:
        v = rp[k]
        if isinstance(v, dict):
            print(f"\n  '{k}': dict with {len(v)} sub-keys")
            sub_keys = list(v.keys())[:5]
            print(f"    Sub-keys sample: {sub_keys}")
            if sub_keys:
                sv = v[sub_keys[0]]
                if isinstance(sv, str):
                    print(f"    First value: string ({len(sv)} chars) -> {sv[:60]}")
                elif isinstance(sv, dict):
                    print(f"    First value: dict -> keys: {list(sv.keys())}")
        elif isinstance(v, list):
            print(f"\n  '{k}': list with {len(v)} items")
        elif isinstance(v, str):
            print(f"\n  '{k}': string ({len(v)} chars) -> {v[:60]}")
elif isinstance(rp, list):
    print(f"List with {len(rp)} items")
    if rp:
        print(f"First item: {type(rp[0]).__name__}")

# 2. Check existing bank words
existing_words = set(bank.get('words', {}).keys())
print(f"\n=== EXISTING BANK ===")
print(f"Words in bank: {len(existing_words)}")

# 3. Determine what's new in the resource pack
if isinstance(rp, dict):
    # Check if this is a flat word->audio dict or categorized
    flat_words = {}
    for k, v in rp.items():
        if isinstance(v, dict) and ('sampleRate' in v or 'drum' in v or 'base64' in v):
            flat_words[k] = v
        elif isinstance(v, str) and (v.startswith('data:') or len(v) > 100):
            flat_words[k] = v
        elif isinstance(v, dict):
            # Nested category - check sub-entries
            for sk, sv in v.items():
                if isinstance(sv, dict) and ('sampleRate' in sv or 'drum' in sv):
                    flat_words[sk] = sv
                elif isinstance(sv, str) and (sv.startswith('data:') or len(sv) > 100):
                    flat_words[sk] = sv
    
    print(f"\n=== WORD AUDIO ENTRIES FOUND ===")
    print(f"Total word audio entries: {len(flat_words)}")
    
    # Check duplicates against existing bank
    new_words = set(flat_words.keys())
    dupes = new_words & existing_words
    truly_new = new_words - existing_words
    
    print(f"Already in bank (duplicates): {len(dupes)}")
    if dupes:
        print(f"  Duplicates: {sorted(dupes)[:30]}{'...' if len(dupes) > 30 else ''}")
    print(f"Truly new words: {len(truly_new)}")
    if truly_new:
        print(f"  New: {sorted(truly_new)[:30]}{'...' if len(truly_new) > 30 else ''}")
    
    # Check for duplicates WITHIN the resource pack itself
    if isinstance(rp, dict):
        all_rp_keys = list(rp.keys())
        rp_dupes = len(all_rp_keys) - len(set(all_rp_keys))
        print(f"\nDuplicates within resource pack keys: {rp_dupes}")
    
    # 4. Merge truly new entries
    if truly_new:
        for word in truly_new:
            bank.setdefault('words', {})[word] = flat_words[word]
        
        with open(bank_path, 'w', encoding='utf-8') as f:
            json.dump(bank, f, indent=2)
        
        print(f"\nMerged {len(truly_new)} new words into audio_bank.json")
        print(f"Total words in bank now: {len(bank.get('words', {}))}")
    else:
        print("\nNo new words to merge - all were duplicates")
    
    # 5. Update tts_words_needed_updated.json
    all_bank_words = set(k.lower() for k in bank.get('words', {}).keys())
    all_bank_words.update(bank.get('words', {}).keys())
    
    cats = ['words_short', 'words_medium', 'words_long']
    total_remaining = 0
    for cat in cats:
        words = needed.get(cat, [])
        still_need = [w for w in words if w.lower() not in all_bank_words and w not in all_bank_words]
        removed = len(words) - len(still_need)
        if removed > 0:
            print(f"\n{cat}: removed {removed} words now in bank ({len(words)} -> {len(still_need)})")
            needed[cat] = sorted(still_need)
        total_remaining += len(still_need)
    
    needed['summary']['total_words_needed'] = total_remaining
    needed['summary']['breakdown'] = {
        'short_words_2_to_4': len(needed.get('words_short', [])),
        'medium_words_5_to_8': len(needed.get('words_medium', [])),
        'long_words_9_plus': len(needed.get('words_long', []))
    }
    
    with open(needed_path, 'w', encoding='utf-8') as f:
        json.dump(needed, f, indent=2)
    
    print(f"\nUpdated tts_words_needed_updated.json: {total_remaining} words still needed")
