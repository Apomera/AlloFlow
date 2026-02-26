import json

# =====================================================================
# PART 1: Fix duplicate which_word_did_you_hear key in AlloFlowANTI.txt
# =====================================================================
anti_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
with open(anti_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find and remove the SECOND (pre-existing) which_word_did_you_hear entry
# Keep the first one (L979) which has the correct inst_ prefix key
found_first = False
removed = False
for i, line in enumerate(lines):
    if 'which_word_did_you_hear' in line and "getAudio('instructions'" in line:
        if not found_first:
            found_first = True
            print(f'Keeping L{i+1}: {line.rstrip()[:150]}')
        else:
            # Remove this duplicate
            lines.pop(i)
            removed = True
            print(f'Removed duplicate at L{i+1}: {line.rstrip()[:150]}')
            break

if removed:
    with open(anti_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f'Fixed duplicate key. Total lines: {len(lines)}')
else:
    print('No duplicate found to remove')

# =====================================================================
# PART 2: Merge audio_bank_2026-02-20.json into audio_bank.json
# =====================================================================
new_bank_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank_2026-02-20.json'
existing_bank_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank.json'

with open(new_bank_path, 'r', encoding='utf-8') as f:
    new_data = json.load(f)

with open(existing_bank_path, 'r', encoding='utf-8') as f:
    existing_bank = json.load(f)

# Examine structure of new data
print(f'\n=== New Audio Bank Structure ===')
if isinstance(new_data, dict):
    # Check if it has category keys (like 'words', 'instructions', etc.)
    # or if it's a flat dict of word -> audio data
    first_key = list(new_data.keys())[0] if new_data else None
    first_val = new_data[first_key] if first_key else None
    
    if isinstance(first_val, dict):
        # Nested structure: {category: {key: data}}
        print(f'Nested structure with {len(new_data)} categories')
        for cat, entries in new_data.items():
            if isinstance(entries, dict):
                print(f'  {cat}: {len(entries)} entries')
    elif isinstance(first_val, str) and first_val.startswith('data:'):
        # Flat structure: {word: data_uri}
        print(f'Flat word->audio structure with {len(new_data)} entries')
        sample_keys = list(new_data.keys())[:10]
        print(f'  Sample keys: {sample_keys}')
        
        # These are word audio entries - merge into the 'words' category
        if 'words' not in existing_bank:
            existing_bank['words'] = {}
        
        new_count = 0
        updated_count = 0
        for word, audio_data in new_data.items():
            if word in existing_bank['words']:
                updated_count += 1
            else:
                new_count += 1
            existing_bank['words'][word] = audio_data
        
        print(f'  New words added: {new_count}')
        print(f'  Existing words updated: {updated_count}')
        print(f'  Total words in bank: {len(existing_bank["words"])}')
    else:
        print(f'Unknown structure. First key: {first_key}, First value type: {type(first_val).__name__}')
        if isinstance(first_val, str):
            print(f'  First value preview: {first_val[:100]}')
        # Try treating as flat word->audio
        word_count = 0
        for k, v in new_data.items():
            if isinstance(v, str):
                word_count += 1
        if word_count > 0:
            print(f'  Looks like {word_count} word entries')
            if 'words' not in existing_bank:
                existing_bank['words'] = {}
            new_count = 0
            updated_count = 0
            for word, audio_data in new_data.items():
                if isinstance(audio_data, str):
                    if word in existing_bank.get('words', {}):
                        updated_count += 1
                    else:
                        new_count += 1
                    existing_bank.setdefault('words', {})[word] = audio_data
            print(f'  New: {new_count}, Updated: {updated_count}')

with open(existing_bank_path, 'w', encoding='utf-8') as f:
    json.dump(existing_bank, f, indent=2)
print(f'\nSaved merged audio_bank.json ({len(json.dumps(existing_bank))} chars)')
