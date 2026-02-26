"""Fix the last 5 generic labels."""
import re

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Line numbers from audit (1-indexed)
targets = {
    31839: 'Close word wall',
    38013: 'Close concept map challenge', 
    68232: 'Close fluency session',
    68279: 'Close fluency results',
    69242: 'Regenerate vocabulary',
}

fixes = 0
for line_num, new_label in targets.items():
    idx = line_num - 1
    if idx < len(lines):
        old = lines[idx]
        if 'aria-label="Close"' in old:
            lines[idx] = old.replace('aria-label="Close"', f'aria-label="{new_label}"')
            fixes += 1
            print(f"  L{line_num}: Close -> {new_label}")
        elif 'aria-label="Refresh"' in old:
            lines[idx] = old.replace('aria-label="Refresh"', f'aria-label="{new_label}"')
            fixes += 1
            print(f"  L{line_num}: Refresh -> {new_label}")
        else:
            print(f"  L{line_num}: No match found in: {old.strip()[:80]}")

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"\nFixed {fixes} remaining labels")
