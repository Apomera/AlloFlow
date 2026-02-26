import json

# Check exactly what format the existing words use and what the new data looks like
new_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank_2026-02-20.json'
with open(new_path, 'r', encoding='utf-8') as f:
    new_data = json.load(f)

existing_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank.json'
with open(existing_path, 'r', encoding='utf-8') as f:
    existing = json.load(f)

print("=== EXISTING BANK CATEGORIES ===")
for cat in existing:
    entries = existing[cat]
    if isinstance(entries, dict):
        ekeys = list(entries.keys())
        print(f"\n{cat}: {len(ekeys)} entries")
        if ekeys:
            sv = entries[ekeys[0]]
            if isinstance(sv, str):
                print(f"  Format: string, starts with: {sv[:60]}")
            elif isinstance(sv, dict):
                print(f"  Format: dict, keys: {list(sv.keys())[:5]}")
                for dsk, dsv in list(sv.items())[:2]:
                    if isinstance(dsv, str):
                        print(f"    {dsk}: string ({len(dsv)} chars) -> {dsv[:60]}")
                    else:
                        print(f"    {dsk}: {type(dsv).__name__} = {dsv}")

print("\n=== NEW BANK SAMPLE ===")
keys = list(new_data.keys())
for k in keys[:3]:
    v = new_data[k]
    print(f"\n{k}:")
    if isinstance(v, dict):
        for sk, sv in v.items():
            if isinstance(sv, str):
                print(f"  {sk}: string ({len(sv)} chars) -> {sv[:60]}")
            else:
                print(f"  {sk}: {type(sv).__name__} = {sv}")
    elif isinstance(v, str):
        print(f"  string ({len(v)} chars) -> {v[:60]}")

# Check if any existing entries already have the new format
print("\n=== FORMAT CHECK ===")
if 'words' in existing:
    wkeys = list(existing['words'].keys())
    # check a few
    for wk in wkeys[:3]:
        wv = existing['words'][wk]
        if isinstance(wv, dict):
            print(f"  {wk}: dict format -> keys: {list(wv.keys())}")
        elif isinstance(wv, str):
            print(f"  {wk}: string format -> {wv[:50]}")
