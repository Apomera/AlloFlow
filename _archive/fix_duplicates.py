"""
Comprehensive fix: find ALL duplicates where one copy is in the Tier 2 block
and remove the Tier 2 copy. Also check if handleCopyToClipboard is still there.
"""
import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')

# Find the Tier 2 block boundaries
tier2_start = None  
tier2_end = None
for i, line in enumerate(lines):
    if "PHASE 1 TIER 2" in line:
        tier2_start = i
        continue
    if tier2_start is not None and tier2_end is None:
        # End of block = first non-empty, non-const-useCallback line after start
        if line.strip() and not re.match(r'\s*const\s+handle\w+\s*=\s*React\.useCallback', line):
            tier2_end = i
            break

if tier2_start is None:
    print("ERROR: Tier 2 block not found!")
    exit(1)

print(f"Tier 2 block: lines {tier2_start+1} to {tier2_end+1}")

# Find all handler names defined in the Tier 2 block
tier2_handler_lines = {}  # name -> line index
for i in range(tier2_start, tier2_end):
    m = re.match(r'\s*const\s+(handle\w+)\s*=\s*React\.useCallback', lines[i])
    if m:
        tier2_handler_lines[m.group(1)] = i

print(f"Tier 2 handlers: {len(tier2_handler_lines)}")
for name in sorted(tier2_handler_lines.keys()):
    print(f"  {name} (L{tier2_handler_lines[name]+1})")

# Find ALL const handleXxx = declarations outside the Tier 2 block
outside_handlers = {}  # name -> [line indices]
for i, line in enumerate(lines):
    if tier2_start <= i < tier2_end:
        continue
    m = re.match(r'\s*const\s+(handle\w+)\s*=', line)
    if m:
        name = m.group(1)
        if name not in outside_handlers:
            outside_handlers[name] = []
        outside_handlers[name].append(i)

# Find conflicts: tier2 handlers also defined outside
conflicts = {}
for name, tier2_line in tier2_handler_lines.items():
    if name in outside_handlers:
        conflicts[name] = {
            'tier2_line': tier2_line,
            'other_lines': outside_handlers[name]
        }

print(f"\nConflicts (Tier 2 vs existing): {len(conflicts)}")
for name, info in sorted(conflicts.items()):
    others = [l+1 for l in info['other_lines']]
    print(f"  {name}: Tier2 L{info['tier2_line']+1} conflicts with L{others}")

# Also search for handleCopyToClipboard specifically
print("\nSearching for handleCopyToClipboard:")
for i, line in enumerate(lines):
    if 'handleCopyToClipboard' in line and ('const ' in line or 'function ' in line):
        print(f"  L{i+1}: {line.strip()[:120]}")

# FIX: Remove conflicting Tier 2 lines
if conflicts:
    lines_to_remove = set()
    for name, info in conflicts.items():
        lines_to_remove.add(info['tier2_line'])

    # Also check for handleCopyToClipboard if not in our tier2 block
    # (it may have been added outside the block range)
    for i, line in enumerate(lines):
        if i in range(tier2_start, tier2_end + 5):
            if 'handleCopyToClipboard' in line and 'React.useCallback' in line:
                lines_to_remove.add(i)
                print(f"  Also removing handleCopyToClipboard at L{i+1}")

    new_lines = [line for i, line in enumerate(lines) if i not in lines_to_remove]
    content = '\n'.join(new_lines)

    with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"\nRemoved {len(lines_to_remove)} conflicting declarations")
else:
    print("\nNo conflicts found in Tier 2 block")

# Also search for handleCopyToClipboard in the MODIFIED file
with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    new_content = f.read()
    new_lines = new_content.split('\n')

print("\nAfter fix - handleCopyToClipboard declarations:")
for i, line in enumerate(new_lines):
    if 'handleCopyToClipboard' in line and ('const ' in line or 'function ' in line):
        print(f"  L{i+1}: {line.strip()[:120]}")

# Final dup check
handler_counts = {}
for i, line in enumerate(new_lines):
    m = re.match(r'\s*const\s+(handle\w+)\s*=\s*React\.useCallback', line)
    if m:
        name = m.group(1)
        handler_counts[name] = handler_counts.get(name, 0) + 1

dup_cbs = {k: v for k, v in handler_counts.items() if v > 1}
if dup_cbs:
    print(f"\nWARNING: Still have duplicate useCallback declarations:")
    for name, count in dup_cbs.items():
        print(f"  {name}: {count}x")
else:
    print(f"\nAll useCallback declarations are unique within Tier 2 - OK")

print(f"Final lines: {len(new_lines)}")
