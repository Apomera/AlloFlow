# -*- coding: utf-8 -*-
"""Clean up double-wrapped dir=ltr and verify/add glossary null guard."""

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

changes = 0

# Fix double-wrapped dir="ltr" at L65444
for i, line in enumerate(lines):
    if '<div dir="ltr" className="text-left"><div dir="ltr" className="text-left">' in line:
        lines[i] = line.replace(
            '<div dir="ltr" className="text-left"><div dir="ltr" className="text-left">',
            '<div dir="ltr" className="text-left">'
        ).replace('</div></div>', '</div>')
        changes += 1
        print(f"Cleaned double-wrapped dir=ltr at L{i+1}")

# Add glossary null guard if missing
for i, line in enumerate(lines):
    if 'highlightGlossaryTerms' in line and 'const highlightGlossaryTerms' in line:
        # Find the parts.map callback
        for j in range(i, min(i + 25, len(lines))):
            if 'return parts.map((part, i) =>' in lines[j]:
                # Check if the next line already has a null guard
                next_line = lines[j+1].strip() if j+1 < len(lines) else ''
                if 'part == null' not in next_line and 'part === null' not in next_line and 'part === undefined' not in next_line:
                    nl = '\r\n' if lines[j].endswith('\r\n') else '\n'
                    indent = '           '
                    guard_line = indent + 'if (part == null) return part;' + nl
                    lines.insert(j+1, guard_line)
                    changes += 1
                    print(f"Added glossary null guard after L{j+1}")
                else:
                    print(f"Glossary null guard already present at L{j+2}")
                break
        break

print(f"\nTotal fixes: {changes}")

if changes > 0:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("File saved.")
else:
    print("No changes needed.")
