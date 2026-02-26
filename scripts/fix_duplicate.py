# -*- coding: utf-8 -*-
"""Fix the duplicated handlePlaceCube body."""

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the duplicated section: lines 74489-74496 (0-indexed: 74488-74495)
# After the first };  there's a duplicate function body
# Look for the pattern: };\n                const key = `${x}-${y}-${z}`;
for i in range(len(lines) - 1):
    if lines[i].strip() == '};' and i > 74000:
        if i+1 < len(lines) and 'const key = `${x}-${y}-${z}`' in lines[i+1]:
            # This is the duplicate. Find its end (next };)
            end = i + 1
            for j in range(i+1, min(i+20, len(lines))):
                if lines[j].strip() == '};':
                    end = j
                    break
            del lines[i+1:end+1]
            print(f"Removed duplicate handlePlaceCube body: L{i+2}-{end+1} ({end-i} lines)")
            break

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("File saved.")
