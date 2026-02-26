"""
Comprehensive accessibility fixes - Tasks 2, 3, and 4:
  Task 2: Contextualize 35 generic "Refresh" labels
  Task 3: Add <nav> landmark
  Task 4: Add aria-expanded to modals/collapsibles
"""
import re

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# ============================================================
# TASK 2: Contextualize "Refresh" labels
# ============================================================
print("=" * 60)
print("TASK 2: Sampling Refresh label contexts")
print("=" * 60)

refresh_lines = []
for i, line in enumerate(lines):
    if 'aria-label="Refresh"' in line:
        refresh_lines.append(i)

# Print context for each to determine appropriate labels
for idx in refresh_lines:
    ctx_start = max(0, idx - 15)
    ctx_end = min(len(lines), idx + 5)
    print(f"\n--- L{idx+1} ---")
    for j in range(ctx_start, ctx_end):
        line = lines[j].rstrip()
        marker = " >>> " if j == idx else "     "
        # Show abbreviated line
        print(f"{marker}L{j+1}: {line.strip()[:120]}")
    print()

# ============================================================
# TASK 3: Find nav candidates
# ============================================================
print("=" * 60)
print("TASK 3: Nav landmark candidates")
print("=" * 60)

for i, line in enumerate(lines):
    if '<nav' in line.lower():
        print(f"  Existing <nav> at L{i+1}: {line.strip()[:100]}")

# Find sidebar tab section
for i, line in enumerate(lines):
    if 'activeSidebarTab' in line and ('onClick' in line or 'button' in line.lower()):
        print(f"  Sidebar tab at L{i+1}: {line.strip()[:100]}")
        if i < 5:
            continue
        # Check parent div
        for j in range(i-1, max(0, i-10), -1):
            if '<div' in lines[j]:
                print(f"    Parent div at L{j+1}: {lines[j].strip()[:100]}")
                break

# ============================================================
# TASK 4: Find modal/collapsible state toggles
# ============================================================
print("=" * 60)
print("TASK 4: Modal/collapsible toggle analysis")
print("=" * 60)

# Find existing aria-expanded usage
for i, line in enumerate(lines):
    if 'aria-expanded' in line:
        print(f"  Existing aria-expanded at L{i+1}: {line.strip()[:100]}")

# Find buttons that open modals/panels (common patterns)
modal_toggles = []
for i, line in enumerate(lines):
    # Pattern: onClick={() => setShowX(true)} or onClick={() => setIsXOpen(true)} 
    if 'onClick' in line and ('setShow' in line or 'setIs' in line):
        if 'true' in line and ('Modal' in line or 'Show' in line):
            modal_toggles.append((i+1, line.strip()[:120]))

print(f"\n  Found {len(modal_toggles)} potential modal toggles")
for ln, txt in modal_toggles[:20]:
    print(f"    L{ln}: {txt}")
if len(modal_toggles) > 20:
    print(f"    ... and {len(modal_toggles) - 20} more")
