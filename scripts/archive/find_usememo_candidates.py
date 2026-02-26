"""
Find the BEST useMemo candidates: const declarations that derive data from 
state arrays using .filter/.sort/.reduce and are used in the render path.
These are the cases where adding useMemo is simple, safe, and high-impact.

Pattern: const foo = someArray.filter(...)
Should be: const foo = useMemo(() => someArray.filter(...), [someArray])
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

candidates = []

for i, line in enumerate(lines):
    stripped = line.strip()
    
    # Match: const/let varName = array.filter/sort/reduce/flatMap/slice(
    m = re.match(r'^(const|let)\s+(\w+)\s*=\s*(\w[\w.]*)\.(filter|sort|reduce|flatMap|slice|find|every|some|map)\(', stripped)
    if not m:
        # Also match: const varName = Object.keys/entries/values(
        m = re.match(r'^(const|let)\s+(\w+)\s*=\s*(Object)\.(keys|entries|values)\(', stripped)
    if not m:
        # Match: const varName = [...array].sort(
        m = re.match(r'^(const|let)\s+(\w+)\s*=\s*\[\.\.\.(\w+)\]\.(sort|filter)\(', stripped)
    
    if not m:
        continue
    
    var_type = m.group(1)  # const/let
    var_name = m.group(2)  # result variable
    source = m.group(3)    # source array
    operation = m.group(4) # filter/sort/etc
    
    # Check if this is already inside useMemo or useCallback
    in_memo = False
    for j in range(i-1, max(0, i-5), -1):
        if 'useMemo(' in lines[j] or 'useCallback(' in lines[j]:
            in_memo = True
            break
    
    if in_memo:
        continue
    
    # Check if it's inside the main component body (not inside a helper function)
    # by looking at indentation — main body items are typically at 4-8 spaces
    indent = len(line) - len(line.lstrip())
    
    # Check how many times the result variable is used after this line
    usage_count = 0
    for j in range(i+1, min(i+200, len(lines))):
        if var_name in lines[j] and not lines[j].strip().startswith('//'):
            usage_count += 1
    
    candidates.append({
        'line': i + 1,
        'var_name': var_name,
        'source': source,
        'operation': operation,
        'indent': indent,
        'usage_count': usage_count,
        'text': stripped[:120]
    })

# Sort by usage count (more uses = higher impact)
candidates.sort(key=lambda x: -x['usage_count'])

out = []
out.append(f"=== BEST useMemo CANDIDATES: {len(candidates)} ===")
out.append("(sorted by usage count — higher = more impactful)")
for c in candidates[:40]:
    out.append(f"  L{c['line']} [{c['usage_count']} uses] {c['var_name']} = {c['source']}.{c['operation']}(...)")
    out.append(f"       {c['text'][:100]}")

if len(candidates) > 40:
    out.append(f"  ... and {len(candidates)-40} more")

out.append(f"\nTOTAL: {len(candidates)}")
out.append(f"  High usage (5+): {sum(1 for c in candidates if c['usage_count'] >= 5)}")
out.append(f"  Medium usage (2-4): {sum(1 for c in candidates if 2 <= c['usage_count'] <= 4)}")
out.append(f"  Low usage (0-1): {sum(1 for c in candidates if c['usage_count'] <= 1)}")

result = '\n'.join(out)
with open('usememo_candidates.txt', 'w', encoding='utf-8') as f:
    f.write(result)

print(f"Total candidates: {len(candidates)}")
print(f"High usage (5+): {sum(1 for c in candidates if c['usage_count'] >= 5)}")
print(f"Medium usage (2-4): {sum(1 for c in candidates if 2 <= c['usage_count'] <= 4)}")
