import json

# Check the new bank data structure more carefully
new_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank_2026-02-20.json'
with open(new_path, 'r', encoding='utf-8') as f:
    new_data = json.load(f)

keys = list(new_data.keys())
print(f'New bank: {len(keys)} entries')
print(f'Keys: {keys[:20]}...')

# Show full structure of first 2 entries
for k in keys[:2]:
    v = new_data[k]
    print(f'\n"{k}": type={type(v).__name__}')
    if isinstance(v, dict):
        for sk, sv in v.items():
            if isinstance(sv, str):
                print(f'  {sk}: ({len(sv)} chars) -> {sv[:100]}')
            elif isinstance(sv, int):
                print(f'  {sk}: {sv}')
            elif isinstance(sv, list):
                print(f'  {sk}: list ({len(sv)} items)')
            else:
                print(f'  {sk}: {type(sv).__name__}')
    elif isinstance(v, str):
        print(f'  ({len(v)} chars): {v[:100]}')

# Check existing bank words structure
existing_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank.json'
with open(existing_path, 'r', encoding='utf-8') as f:
    existing = json.load(f)

print(f'\n=== Existing bank ===')
print(f'Categories: {list(existing.keys())}')
for cat in existing:
    entries = existing[cat]
    if isinstance(entries, dict):
        ekeys = list(entries.keys())
        print(f'{cat}: {len(ekeys)} entries (sample: {ekeys[:3]})')
        if ekeys:
            sv = entries[ekeys[0]]
            if isinstance(sv, str):
                print(f'  First value: string ({len(sv)} chars) -> {sv[:80]}')
            elif isinstance(sv, dict):
                print(f'  First value: dict with keys {list(sv.keys())}')
