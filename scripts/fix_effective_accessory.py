#!/usr/bin/env python3
"""Fix effectiveAccessory ReferenceError - add component-level definition."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

# Find 'const colors = getColors()' or similar
target = None
for i in range(22000, 22600):
    stripped = lines[i].strip()
    if 'colors' in stripped and 'getColors' in stripped and 'const' in stripped:
        target = i
        print(f"Found at line {i+1}: {stripped[:80]}")
        break

if target is None:
    print("ERROR: Could not find 'const colors = getColors()' line")
    sys.exit(1)

# Insert effectiveAccessory at component level right after the colors line
new_line = "  const effectiveAccessory = isSleeping ? 'sleep-cap' : accessory;\n"
lines.insert(target + 1, new_line)

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.writelines(lines)

print(f"Inserted component-level effectiveAccessory after line {target+1}")
print("Done!")
