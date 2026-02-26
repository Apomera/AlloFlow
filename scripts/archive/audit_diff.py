"""Audit which resource types use grade/language/interests/differentiationContext."""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8').readlines()

# Find handleGenerate start
start_idx = None
for i, l in enumerate(lines):
    if 'const handleGenerate = async' in l and i > 50000:
        start_idx = i
        print(f"handleGenerate starts at L{i+1}")
        break

# Now scan the handler for type branches and what params each uses
# We'll look for if/else-if blocks with type === 'xxx'
results = []
if start_idx:
    for i in range(start_idx, min(start_idx + 3000, len(lines))):
        l = lines[i]
        # Look for all type === patterns on this line
        for m in re.finditer(r"type\s*===\s*'([^']+)'", l):
            tname = m.group(1)
            # Check the surrounding 30 lines for params
            block = ''.join(lines[max(start_idx,i-5):min(i+30, len(lines))])
            uses_grade = 'effectiveGrade' in block or ('gradeLevel' in block and 'Grade' in block)
            uses_lang = 'effectiveLanguage' in block
            uses_interests = 'studentInterests' in block or 'interests' in block.lower()
            uses_diff = 'differentiationContext' in block
            results.append((tname, i+1, uses_grade, uses_lang, uses_interests, uses_diff))

# Deduplicate by type name, keeping first occurrence
seen = {}
for r in results:
    if r[0] not in seen:
        seen[r[0]] = r

print(f"\n{'Type':<20} {'Line':<8} {'Grade':<8} {'Lang':<8} {'Int.':<8} {'DiffCtx':<8}")
print("-" * 68)
for name in sorted(seen.keys()):
    t = seen[name]
    g = "YES" if t[2] else "no"
    l = "YES" if t[3] else "no"
    i = "YES" if t[4] else "no"
    d = "YES" if t[5] else "no"
    print(f"  {name:<18} L{t[1]:<6} {g:<8} {l:<8} {i:<8} {d:<8}")

# Also look for concept-sort specifically
print("\n--- Concept Sort ---")
for i, l in enumerate(lines):
    if "'concept-sort'" in l and i > 50000 and i < 55000:
        print(f"  L{i+1}: {l.strip()[:100]}")
