# -*- coding: utf-8 -*-
"""Apply Fix 2: Add language instruction to Freeform Builder."""

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

LANG_Q = "${leveledTextLanguage && leveledTextLanguage !== 'English' ? 'IMPORTANT: Generate ALL text content (questions, explanations, steps, real-world applications) in ' + leveledTextLanguage + '. After each text field, include an English translation in parentheses. Keep mathematical expressions and JSON keys in English.' : ''}"

changes = 0
i = 0
while i < len(lines):
    stripped = lines[i].rstrip('\r\n')
    # Find "CUSTOM problem set" line
    if 'CUSTOM problem set' in stripped:
        nl = '\r\n' if lines[i].endswith('\r\n') else '\n'
        # Check next line - if it doesn't already have our language instruction
        if i+1 < len(lines) and 'leveledTextLanguage' not in lines[i+1]:
            # Get indent from next line
            next_stripped = lines[i+1].rstrip('\r\n')
            indent = len(next_stripped) - len(next_stripped.lstrip())
            indent_str = ' ' * indent
            new_line = indent_str + LANG_Q + nl
            lines.insert(i+1, new_line)
            changes += 1
            print(f"Fix 2: Inserted language instruction after line {i+1} (Freeform Builder)")
        else:
            print(f"Fix 2: Already applied at line {i+1}")
        i += 2
        continue
    i += 1

if changes > 0:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"Done! {changes} insertion(s). File saved.")
else:
    print("No changes needed - already applied or pattern not found.")
