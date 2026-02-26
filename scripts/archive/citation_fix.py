"""Remove the ### Accuracy Check References header from citations text.
The header is causing a # to show before each reference in the UI.
The UI already has its own styled header for this section.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
changes = 0

for i, l in enumerate(lines):
    if '### Accuracy Check References' in l and 'citationText' in l:
        old = l
        # Replace the header with just empty string start
        new = l.replace('\\n\\n### Accuracy Check References', '')
        if old != new:
            lines[i] = new
            changes += 1
            print(f"[OK] L{i+1}: Removed ### header from citationText")
            print(f"  OLD: {old.strip()[:100]}")
            print(f"  NEW: {new.strip()[:100]}")

if changes > 0:
    open(filepath, 'w', encoding='utf-8').write(''.join(lines))
    print(f"\n{changes} change(s) applied.")
else:
    print("No changes applied.")
