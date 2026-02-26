"""Find all type branches in handleGenerate and check differentiation param usage."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8').readlines()

# Find handleGenerate
start = None
for i, l in enumerate(lines):
    if 'const handleGenerate = async' in l and i > 50000:
        start = i
        break

print(f"handleGenerate starts at L{start+1}")

# Find all type branches
import re
for i in range(start, min(start + 3000, len(lines))):
    l = lines[i]
    # Look for type === 'xxx' in if/else-if
    for m in re.finditer(r"type\s*===\s*'([^']+)'", l):
        tname = m.group(1)
        # Check next 60 lines for key params
        block = ''.join(lines[i:min(i+60, len(lines))])
        g = 'effectiveGrade' in block or 'Grade' in block
        la = 'effectiveLanguage' in block or 'Language' in block
        intr = 'studentInterests' in block
        diff = 'differentiationContext' in block
        print(f"L{i+1}: type='{tname}' Grade={'Y' if g else 'N'} Lang={'Y' if la else 'N'} Int={'Y' if intr else 'N'} Diff={'Y' if diff else 'N'}")
