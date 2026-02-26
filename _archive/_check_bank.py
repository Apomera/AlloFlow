import json

# Check the new bank structure
path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank_2026-02-20.json'
with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

keys = list(data.keys())
print(f'Total entries: {len(keys)}')
print(f'First 15 keys: {keys[:15]}')

# Check value types/structure for first 3 entries
for k in keys[:3]:
    v = data[k]
    print(f'\nEntry "{k}": type={type(v).__name__}')
    if isinstance(v, dict):
        print(f'  Sub-keys: {list(v.keys())}')
        for sk, sv in v.items():
            if isinstance(sv, str):
                print(f'  {sk}: string ({len(sv)} chars), starts with: {sv[:80]}')
            else:
                print(f'  {sk}: {type(sv).__name__} = {sv}')
    elif isinstance(v, str):
        print(f'  Value ({len(v)} chars): {v[:80]}...')

# Check existing audio_bank.json structure
existing_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank.json'
with open(existing_path, 'r', encoding='utf-8') as f:
    existing = json.load(f)

print(f'\n=== Existing bank categories: {list(existing.keys())} ===')
if 'words' in existing:
    word_keys = list(existing['words'].keys())
    print(f'Existing words in bank: {len(word_keys)}')
    if word_keys:
        fk = word_keys[0]
        fv = existing['words'][fk]
        print(f'Sample existing word "{fk}": type={type(fv).__name__}')
        if isinstance(fv, str):
            print(f'  Value ({len(fv)} chars): {fv[:80]}...')
        elif isinstance(fv, dict):
            print(f'  Sub-keys: {list(fv.keys())}')
