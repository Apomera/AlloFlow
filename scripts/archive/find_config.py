"""Tag history items with rosterGroupId from configOverride."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
changes = 0

# Find where the main simplified/generic history entry config object is built
# Lines near effectiveGrade in the config object
for i, l in enumerate(lines):
    stripped = l.strip()
    if 'config: {' in l and i > 50350 and i < 55000:
        # Check the next few lines for gradeLevel
        block = ''.join(lines[i:i+5])
        if 'gradeLevel' in block or 'effectiveGrade' in block:
            print(f"Found config block at L{i+1}: {l.rstrip()[:100]}")
            for j in range(i, min(i + 10, len(lines))):
                print(f"  L{j+1}: {lines[j].rstrip()[:100]}")
            break

# Also search for where config: stripUndefined is built
for i, l in enumerate(lines):
    if 'stripUndefined' in l and 'config' in l and i > 50350 and i < 55000:
        print(f"\nConfig with stripUndefined at L{i+1}: {l.rstrip()[:120]}")
        for j in range(max(0, i-2), min(i+6, len(lines))):
            print(f"  L{j+1}: {lines[j].rstrip()[:120]}")
        break

# Find the actual newEntry creation in handleGenerate
for i, l in enumerate(lines):
    if 'newEntry' in l and 'config' in l and i > 50350 and i < 55000:
        print(f"\nnewEntry + config at L{i+1}: {l.rstrip()[:120]}")
        break

print(f"\nSearching for setHistory near handleGenerate...")
for i, l in enumerate(lines):
    if 'setHistory' in l and 'newEntry' in l and i > 50350 and i < 55000:
        print(f"  setHistory(newEntry) at L{i+1}: {l.rstrip()[:120]}")
        break
