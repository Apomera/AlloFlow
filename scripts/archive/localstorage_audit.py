"""
localStorage Audit — Phase 1: Discovery

Find all localStorage operations in the codebase:
1. All keys written via setItem
2. All keys read via getItem
3. All keys removed via removeItem
4. Orphaned keys (written but never read, or read but never written)
5. Large data stored (base64, JSON arrays/objects)
6. Missing quota error handling
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()
    lines = content.split('\n')

# ===================================================================
# Step 1: Find all localStorage operations
# ===================================================================
set_items = {}  # key -> [line_numbers]
get_items = {}  # key -> [line_numbers]
remove_items = {}  # key -> [line_numbers]
unquoted_ops = []  # Dynamic keys

for i, line in enumerate(lines):
    # setItem
    for m in re.finditer(r"localStorage\.setItem\(\s*['\"]([^'\"]+)['\"]", line):
        key = m.group(1)
        set_items.setdefault(key, []).append(i + 1)
    
    # getItem
    for m in re.finditer(r"localStorage\.getItem\(\s*['\"]([^'\"]+)['\"]", line):
        key = m.group(1)
        get_items.setdefault(key, []).append(i + 1)
    
    # removeItem
    for m in re.finditer(r"localStorage\.removeItem\(\s*['\"]([^'\"]+)['\"]", line):
        key = m.group(1)
        remove_items.setdefault(key, []).append(i + 1)
    
    # Dynamic keys (variable-based)
    if re.search(r'localStorage\.(set|get|remove)Item\(\s*[^\'"]', line):
        if 'localStorage.getItem(' in line or 'localStorage.setItem(' in line or 'localStorage.removeItem(' in line:
            # Check it's not a string literal
            if not re.search(r"localStorage\.\w+Item\(\s*['\"]", line):
                unquoted_ops.append((i + 1, line.strip()[:120]))

all_keys = set(set_items.keys()) | set(get_items.keys()) | set(remove_items.keys())

# ===================================================================
# Step 2: Identify orphaned keys
# ===================================================================
write_only = set(set_items.keys()) - set(get_items.keys())  # Written but never read
read_only = set(get_items.keys()) - set(set_items.keys())  # Read but never written (external?)
balanced = set(set_items.keys()) & set(get_items.keys())  # Both read and written

# ===================================================================
# Step 3: Check for quota handling
# ===================================================================
quota_issues = []
for key, line_nums in set_items.items():
    for ln in line_nums:
        # Check if the setItem is inside a try block
        # Look backwards up to 10 lines for try {
        has_try = False
        for j in range(max(0, ln - 10), ln):
            if 'try' in lines[j] and '{' in lines[j]:
                has_try = True
                break
        if not has_try:
            quota_issues.append((key, ln))

# ===================================================================
# Step 4: Estimate data sizes
# ===================================================================
large_data = []
for i, line in enumerate(lines):
    if 'localStorage.setItem' in line:
        # Check if storing JSON.stringify of arrays/objects
        if 'JSON.stringify' in line:
            # Find what's being stringified
            m = re.search(r'JSON\.stringify\((\w+)', line)
            if m:
                var_name = m.group(1)
                large_data.append((i + 1, var_name, line.strip()[:120]))

# ===================================================================
# Step 5: Output report
# ===================================================================
out = []
out.append(f"=== localStorage AUDIT ({len(all_keys)} unique keys) ===\n")

out.append(f"=== WRITE-ONLY KEYS ({len(write_only)}) — POTENTIAL ORPHANS ===")
out.append("(Data stored but never retrieved — may be dead storage)\n")
for key in sorted(write_only):
    lns = ', '.join(f'L{l}' for l in set_items[key])
    out.append(f"  '{key}' — written at {lns}")
out.append("")

out.append(f"=== READ-ONLY KEYS ({len(read_only)}) — EXTERNAL/LEGACY ===")
out.append("(Data read but never written in this codebase — may come from external source)\n")
for key in sorted(read_only):
    lns = ', '.join(f'L{l}' for l in get_items[key])
    out.append(f"  '{key}' — read at {lns}")
out.append("")

out.append(f"=== BALANCED KEYS ({len(balanced)}) — HEALTHY ===")
out.append("(Both read and written — functioning correctly)\n")
for key in sorted(balanced):
    set_lns = ', '.join(f'L{l}' for l in set_items[key])
    get_lns = ', '.join(f'L{l}' for l in get_items[key])
    rem = ''
    if key in remove_items:
        rem = f", removed at {', '.join(f'L{l}' for l in remove_items[key])}"
    out.append(f"  '{key}'")
    out.append(f"    Written: {set_lns}")
    out.append(f"    Read: {get_lns}{rem}")
out.append("")

out.append(f"=== DYNAMIC KEY OPERATIONS ({len(unquoted_ops)}) ===")
out.append("(Variable-based keys — can't audit statically)\n")
for ln, text in unquoted_ops[:20]:
    out.append(f"  L{ln}: {text}")
out.append("")

out.append(f"=== UNGUARDED setItem ({len(quota_issues)}) ===")
out.append("(Missing try/catch — will throw if quota exceeded)\n")
for key, ln in sorted(quota_issues, key=lambda x: x[1]):
    out.append(f"  L{ln}: '{key}'")
out.append("")

out.append(f"=== LARGE DATA STORAGE ({len(large_data)}) ===")
out.append("(JSON.stringify calls — potential quota hogs)\n")
for ln, var, text in large_data:
    out.append(f"  L{ln}: {var} — {text}")
out.append("")

out.append(f"=== SUMMARY ===")
out.append(f"  Total unique keys: {len(all_keys)}")
out.append(f"  Write-only (orphans): {len(write_only)}")
out.append(f"  Read-only (external): {len(read_only)}")
out.append(f"  Balanced (healthy): {len(balanced)}")
out.append(f"  Dynamic operations: {len(unquoted_ops)}")
out.append(f"  Unguarded setItem: {len(quota_issues)}")
out.append(f"  Large data stores: {len(large_data)}")

result = '\n'.join(out)
with open('localstorage_audit.txt', 'w', encoding='utf-8') as f:
    f.write(result)

print(result)
