# -*- coding: utf-8 -*-
"""Apply remaining fixes: RTL wrapper and formatInteractiveText guard."""

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

changes = 0

# FIX 2: Wrap English translation paragraphs with dir="ltr"
for i, line in enumerate(lines):
    if "renderParagraphs(target, 'tgt', true)" in line and i > 65000:
        # Get indentation
        stripped = line.strip()
        indent = line[:len(line) - len(line.lstrip())]
        nl = '\r\n' if line.endswith('\r\n') else '\n'
        new_line = indent + '<div dir="ltr" className="text-left">' + stripped + '</div>' + nl
        lines[i] = new_line
        changes += 1
        print(f"Fix 2: Wrapped renderParagraphs(target) at L{i+1} with dir='ltr'")
        break

# FIX 3: Add null filter in formatInteractiveText subParts (there are 2 occurrences)
for i, line in enumerate(lines):
    if 'renderedSubParts = subParts.map' in line and '.filter' not in line:
        nl = '\r\n' if line.endswith('\r\n') else '\n'
        old = 'subParts.map('
        new = 'subParts.filter(sp => sp != null).map('
        lines[i] = lines[i].replace(old, new)
        changes += 1
        print(f"Fix 3: Added null filter in formatInteractiveText at L{i+1}")

# FIX 4: Also guard formatInteractiveText's main parts.map
for i, line in enumerate(lines):
    if 'const formatInteractiveText' in line:
        # The next few lines after the function def contain 'parts.map'
        for j in range(i, min(i + 5, len(lines))):
            if 'return parts.map(' in lines[j] and '.filter' not in lines[j]:
                lines[j] = lines[j].replace('parts.map(', 'parts.filter(p => p != null).map(')
                changes += 1
                print(f"Fix 4: Added null filter in formatInteractiveText parts.map at L{j+1}")
                break
        break

print(f"\nTotal fixes: {changes}")

if changes > 0:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("File saved.")
else:
    print("No changes made!")
