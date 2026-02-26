"""Comprehensive search for 'or' audio data — write results to file"""
import os, re

out = open('_or_search_results.txt', 'w', encoding='utf-8')

files_to_check = [
    'Phoneme app.txt',
    'AlloFlowANTI.txt',
]

for fname in files_to_check:
    if not os.path.exists(fname):
        out.write(f"SKIP: {fname} not found\n")
        continue
    
    out.write(f"\n{'='*60}\n")
    out.write(f"Searching: {fname}\n")
    out.write(f"{'='*60}\n")
    
    f = open(fname, 'r', encoding='utf-8-sig')
    lines = f.readlines()
    f.close()
    
    out.write(f"Total lines: {len(lines)}\n")
    
    # Search: All PHONEME_AUDIO_BANK keys
    out.write(f"\n--- All PHONEME_AUDIO_BANK keys ---\n")
    in_bank = False
    bank_keys = []
    brace_depth = 0
    for i, line in enumerate(lines):
        s = line.strip()
        if '_LOAD_PHONEME_AUDIO_BANK_RAW' in s and 'function' in s:
            in_bank = True
            out.write(f"  Bank function starts at L{i+1}\n")
            continue
        if in_bank:
            brace_depth += s.count('{') - s.count('}')
            key_m = re.match(r"""^\s*['"](\S+?)['"]\s*:""", line)
            if key_m:
                key = key_m.group(1)
                bank_keys.append((i+1, key))
            if brace_depth <= 0 and len(bank_keys) > 0:
                in_bank = False
                break
    
    out.write(f"  Keys found: {len(bank_keys)}\n")
    for ln, key in bank_keys:
        marker = " <-- R-CONTROLLED" if key in ['ar','er','ir','or','ur','ear'] else ""
        out.write(f"    L{ln}: '{key}'{marker}\n")
    
    key_names = [k for _, k in bank_keys]
    if 'or' in key_names:
        out.write(f"\n  *** 'or' IS present in bank ***\n")
    else:
        out.write(f"\n  *** 'or' is MISSING from bank ***\n")
        out.write(f"  R-controlled present: {[k for k in ['ar','er','ir','or','ur','ear'] if k in key_names]}\n")
        out.write(f"  R-controlled missing: {[k for k in ['ar','er','ir','or','ur','ear'] if k not in key_names]}\n")

    # Also search for 'or' ANYWHERE as a key
    out.write(f"\n--- Any line with 'or' as object key (anywhere in file) ---\n")
    count = 0
    for i, line in enumerate(lines):
        s = line.strip()
        if re.match(r"""^\s*['"]or['"]\s*:""", s):
            out.write(f"  L{i+1}: {s[:120]}\n")
            count += 1
    out.write(f"  Total: {count}\n")

out.close()
print("Done - see _or_search_results.txt")
