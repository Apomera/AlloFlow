"""
Audit inline arrow functions and useMemo opportunities in AlloFlowANTI.txt.

Part 1: Find all React.memo wrapped components
Part 2: Find inline onClick/onChange/onX handlers passed to those components
Part 3: Find expensive computed values that could benefit from useMemo
"""
import re

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

out = []

# Part 1: Find React.memo components
out.append("=" * 60)
out.append("PART 1: React.memo WRAPPED COMPONENTS")
out.append("=" * 60)
memo_components = []
for i, line in enumerate(lines):
    if 'React.memo(' in line:
        # Get the component name
        match = re.search(r'(?:const|let|var)\s+(\w+)\s*=\s*React\.memo\(', line)
        if match:
            memo_components.append(match.group(1))
            out.append(f"  L{i+1}: {match.group(1)} = React.memo(...)")
        else:
            # Could be export default React.memo(...)
            out.append(f"  L{i+1}: {line.strip()[:80]}")

out.append(f"\nTotal React.memo components: {len(memo_components)}")
out.append("")

# Part 2: Find inline arrow functions in JSX event handlers
# Pattern: onClick={() => ...} or onChange={(e) => ...} etc.
# Focus on ones that are in render paths (not inside useCallback)
out.append("=" * 60)
out.append("PART 2: INLINE ARROW FUNCTIONS IN JSX EVENT HANDLERS")
out.append("=" * 60)

# Count all inline arrows in JSX handlers
inline_arrow_count = 0
handler_patterns = {}
for i, line in enumerate(lines):
    # Match on{Event}={() => or on{Event}={(e) => patterns in JSX
    matches = re.findall(r'(on\w+)=\{(?:\([^)]*\))?\s*=>', line)
    for m in matches:
        inline_arrow_count += 1
        handler_patterns[m] = handler_patterns.get(m, 0) + 1

out.append(f"Total inline arrows in JSX handlers: {inline_arrow_count}")
out.append("\nBreakdown by handler type:")
for k, v in sorted(handler_patterns.items(), key=lambda x: -x[1]):
    out.append(f"  {k}: {v}")

# Part 3: Find useMemo opportunities
# Look for expensive patterns in render body:
# - .filter().map() chains
# - .reduce() calls
# - .sort() calls
# - JSON.parse / JSON.stringify
# - Object.keys/entries/values
out.append("")
out.append("=" * 60)
out.append("PART 3: useMemo OPPORTUNITIES")
out.append("=" * 60)

# Find .filter(...).map(...) chains
filter_map = []
for i, line in enumerate(lines):
    if '.filter(' in line and '.map(' in line:
        filter_map.append(f"  L{i+1}: {line.strip()[:100]}")

out.append(f"\n.filter().map() chains: {len(filter_map)}")
for fm in filter_map[:20]:
    out.append(fm)
if len(filter_map) > 20:
    out.append(f"  ... and {len(filter_map)-20} more")

# Find .reduce() calls
reduce_calls = []
for i, line in enumerate(lines):
    if '.reduce(' in line:
        reduce_calls.append(f"  L{i+1}: {line.strip()[:100]}")

out.append(f"\n.reduce() calls: {len(reduce_calls)}")
for rc in reduce_calls[:15]:
    out.append(rc)
if len(reduce_calls) > 15:
    out.append(f"  ... and {len(reduce_calls)-15} more")

# Find Object.keys/entries/values
obj_calls = []
for i, line in enumerate(lines):
    if 'Object.keys(' in line or 'Object.entries(' in line or 'Object.values(' in line:
        obj_calls.append(f"  L{i+1}: {line.strip()[:100]}")

out.append(f"\nObject.keys/entries/values calls: {len(obj_calls)}")
for oc in obj_calls[:15]:
    out.append(oc)
if len(obj_calls) > 15:
    out.append(f"  ... and {len(obj_calls)-15} more")

# Find existing useMemo usage
existing_memo = content.count('useMemo(')
existing_callback = content.count('useCallback(')

out.append(f"\nExisting useMemo: {existing_memo}")
out.append(f"Existing useCallback: {existing_callback}")

with open('_inline_arrow_audit.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))

print(f"Written to _inline_arrow_audit.txt")
print(f"React.memo components: {len(memo_components)}")
print(f"Inline arrows: {inline_arrow_count}")
print(f"Existing useMemo: {existing_memo}, useCallback: {existing_callback}")
