"""
Fix structural issue: adventure.results missing closing brace.
Also remove duplicate tooltips block.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix 1: Add closing brace after perf_score in results section
# Current state at L16635:
#   perf_score: "...",      <- needs }, after this
#   start_overwrite: "..."  <- this should be at adventure level, not results level

fixed = False
for i, line in enumerate(lines):
    if i > 16600 and i < 16700:
        s = line.strip()
        # Find the perf_score line inside results
        if s.startswith('perf_score:') and '**Performance Score' in line:
            # Check if next line is the closing brace
            next_s = lines[i+1].strip() if i+1 < len(lines) else ''
            if not next_s.startswith('},') and not next_s.startswith('}'):
                # Missing closing brace - add it
                indent = line[:len(line) - len(line.lstrip())]
                # The results section uses same indent level, closing should be one level up
                # results: { is at 4-space, keys at 8-space, close at 4-space
                closing = '    },\n'
                lines.insert(i + 1, closing)
                print(f"Fixed: Added closing brace for results section after L{i+1}")
                fixed = True
                break

if not fixed:
    print("WARNING: Could not find the perf_score line to fix!")

# Fix 2: Remove duplicate tooltips block (keep first one)
tooltips_count = 0
lines2 = []
skip_tooltip_block = False
skip_depth = 0

for i, line in enumerate(lines):
    s = line.strip()
    
    if skip_tooltip_block:
        skip_depth += s.count('{') - s.count('}')
        if skip_depth <= 0:
            skip_tooltip_block = False
        continue
    
    if s.startswith('tooltips:') and '{' in s and i > 16600 and i < 16700:
        tooltips_count += 1
        if tooltips_count > 1:
            # Skip this duplicate block
            skip_tooltip_block = True
            skip_depth = s.count('{') - s.count('}')
            if skip_depth <= 0:
                skip_tooltip_block = False
            print(f"Removed duplicate tooltips block at L{i+1}")
            continue
    
    lines2.append(line)

# Also remove 'paused_title' and 'paused_desc' if they appear BEFORE start_overwrite
# (the old pass-2 entries that were deleted by line-based cleanup and are now orphaned)
# Check for any adventure keys that appear at wrong locations

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.writelines(lines2)

print(f"Final line count: {len(lines2)}")
