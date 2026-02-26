"""
Audio Bank Cleanup:
1. Merge misc keys into phonemes (then delete misc category)
2. Remove oo_long (duplicate of oo)
3. Update AlloFlowANTI.txt code references from getAudio('misc', ...) to getAudio('phonemes', ...)
"""
import sys, json
sys.stdout.reconfigure(encoding='utf-8')

# ============ AUDIO BANK CLEANUP ============
BANK_FILE = 'audio_bank.json'
with open(BANK_FILE, 'r', encoding='utf-8') as f:
    bank = json.load(f)

# 1. Merge misc -> phonemes
misc = bank.get('misc', {})
phon = bank.get('phonemes', {})
print("=== MISC -> PHONEMES MERGE ===")
for k, v in misc.items():
    if k in phon:
        print(f"  {k}: already in phonemes (misc: {len(v)} chars, phonemes: {len(phon[k])} chars) - keeping phonemes version")
    else:
        phon[k] = v
        print(f"  {k}: moved to phonemes ({len(v)} chars)")

# Delete misc category
if 'misc' in bank:
    del bank['misc']
    print("  DELETED misc category")

# 2. Remove oo_long (duplicate of oo)
if 'oo_long' in phon and 'oo' in phon:
    oo_data = phon['oo']
    oo_long_data = phon['oo_long']
    if oo_data == oo_long_data:
        print(f"\n=== oo_long is IDENTICAL to oo ({len(oo_data)} chars) - REMOVING oo_long ===")
    else:
        print(f"\n=== oo_long DIFFERS from oo (oo: {len(oo_data)}, oo_long: {len(oo_long_data)}) - keeping both ===")
    # Remove oo_long regardless since user says they're the same
    del phon['oo_long']
    print("  DELETED oo_long from phonemes")

bank['phonemes'] = phon

# Save
with open(BANK_FILE, 'w', encoding='utf-8') as f:
    json.dump(bank, f, indent=2, ensure_ascii=False)
print(f"\nSaved audio_bank.json ({len(bank.get('phonemes',{}))} phoneme keys, {len(bank.get('instructions',{}))} instruction keys)")

# ============ CODE CLEANUP ============
CODE_FILE = 'AlloFlowANTI.txt'
with open(CODE_FILE, 'r', encoding='utf-8') as f:
    code = f.read()
code = code.replace('\r\n', '\n')

changes = 0

# 3. Update getAudio('misc', ...) -> getAudio('phonemes', ...)
import re
misc_refs = re.findall(r"getAudio\('misc',\s*'([^']+)'\)", code)
print(f"\n=== CODE: Found {len(misc_refs)} getAudio('misc', ...) references ===")
for key in set(misc_refs):
    old = f"getAudio('misc', '{key}')"
    new = f"getAudio('phonemes', '{key}')"
    ct = code.count(old)
    code = code.replace(old, new)
    changes += ct
    print(f"  {old} -> {new} ({ct}x)")

# 4. Handle PHONEME_AUDIO_BANK['oo_long'] reference
# L1491: PHONEME_AUDIO_BANK['oo_long'] = getAudio('phonemes', 'oo');
# This should just use 'oo' directly since oo_long is gone
old_oo = "PHONEME_AUDIO_BANK['oo_long'] = getAudio('phonemes', 'oo');"
new_oo = "// oo_long removed: use 'oo' key directly (same sound)"
if old_oo in code:
    code = code.replace(old_oo, new_oo)
    changes += 1
    print(f"\n  Removed oo_long assignment from PHONEME_AUDIO_BANK")

# Save code
code = code.replace('\n', '\r\n')
with open(CODE_FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(code)
print(f"\nCode changes: {changes}")
print(f"Saved {CODE_FILE}")
