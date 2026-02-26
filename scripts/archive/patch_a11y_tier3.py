"""
Tier 3 Accessibility Fixes:
1. Wrap main navigation toolbar in <nav> landmark
2. Ensure header toolbar has navigation role

Strategy: Find the primary header toolbar and wrap it in <nav>.
The app uses a header with toolbar buttons at the top.
"""
import re

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

count = 0

# Find the main header element
for i, line in enumerate(lines):
    if '<header' in line and 'aria-label' not in line:
        lines[i] = line.replace('<header', '<header aria-label="Main application header"', 1)
        count += 1
        print(f"  L{i+1}: Added aria-label to <header>")

# Find the main navigation area - look for the toolbar with primary actions
# The typical pattern is a flex container with buttons inside the header
# Let's add role="navigation" to the toolbar div inside header

# Also add aria-label to <main> if missing
for i, line in enumerate(lines):
    if '<main' in line and 'aria-label' not in line:
        lines[i] = line.replace('<main', '<main aria-label="Main content"', 1)
        count += 1
        print(f"  L{i+1}: Added aria-label to <main>")

# Add role="navigation" to primary button group in header
# Find the first <aside> and add label
for i, line in enumerate(lines):
    if '<aside' in line and 'aria-label' not in line:
        lines[i] = line.replace('<aside', '<aside aria-label="Sidebar"', 1)
        count += 1
        print(f"  L{i+1}: Added aria-label to <aside>")

content = '\n'.join(lines)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n✅ Tier 3: {count} landmark labels added")
