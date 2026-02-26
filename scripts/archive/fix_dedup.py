"""Fix double counting guard at L8359 and remove incorrect L6799 auto-play guard"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
changes = 0

# FIX A: Remove incorrect counting guard from auto-play effect (L6799)
for i in range(6790, 6810):
    if "wordSoundsActivity === 'counting'" in lines[i] and 'return' in lines[i] and 'Hide instruction bar' in lines[i]:
        print(f"[FIXA] Removing incorrect counting auto-play guard at L{i+1}")
        lines[i] = ''  # Empty the line
        changes += 1
        break

# FIX B: Fix double counting guard at L8359
for i in range(8350, 8370):
    if "wordSoundsActivity !== 'counting'" in lines[i]:
        old = lines[i]
        # Remove the duplicate: {wordSoundsActivity !== 'counting' && {wordSoundsActivity !== 'counting' && <div
        # should become: {wordSoundsActivity !== 'counting' && <div
        if lines[i].count("wordSoundsActivity !== 'counting'") > 1:
            lines[i] = lines[i].replace(
                "{wordSoundsActivity !== 'counting' && {wordSoundsActivity !== 'counting' && ",
                "{wordSoundsActivity !== 'counting' && "
            )
            if lines[i] != old:
                print(f"[FIXB] Removed duplicate counting guard at L{i+1}")
                changes += 1
            break

if changes > 0:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"\n{changes} fix(es) applied")
else:
    print("\nNo changes made")
