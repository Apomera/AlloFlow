# -*- coding: utf-8 -*-
"""Fix processMathHTML to handle non-string text values."""

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

changes = 0
i = 0
while i < len(lines):
    stripped = lines[i].rstrip('\r\n')
    
    # Find the processMathHTML function definition
    if 'const processMathHTML = (text) =>' in stripped:
        nl = '\r\n' if lines[i].endswith('\r\n') else '\n'
        # Check next line for the guard
        if i+1 < len(lines) and "if (!text) return '';" in lines[i+1]:
            # Check the line after that for the .replace call
            if i+2 < len(lines) and "let content = text.replace" in lines[i+2]:
                # Replace the guard and the text.replace line
                indent_guard = '    '  # standard indent for guard
                indent_content = '    '
                lines[i+1] = indent_guard + "if (text == null || text === '') return '';" + nl
                lines[i+2] = lines[i+2].replace('text.replace', 'String(text).replace')
                changes += 1
                print(f"Fixed processMathHTML at line {i+1}:")
                print(f"  L{i+2}: {lines[i+1].rstrip()}")
                print(f"  L{i+3}: {lines[i+2].rstrip()[:80]}")
        i += 3
        continue
    i += 1

if changes > 0:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"\nDone! {changes} fix(es) applied.")
else:
    print("WARNING: No changes made.")
