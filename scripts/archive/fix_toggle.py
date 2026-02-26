"""Fix the full-pack toggle to include all 11 types."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()

# The toggle has 7 types currently, we need to add 4 more
# Pattern: setBatchTypes({ simplified: !allSelected, glossary: !allSelected, ... outline: !allSelected })
OLD = "simplified: !allSelected, glossary: !allSelected, quiz: !allSelected, 'sentence-frames': !allSelected, brainstorm: !allSelected, faq: !allSelected, outline: !allSelected }"
NEW = "simplified: !allSelected, glossary: !allSelected, quiz: !allSelected, 'sentence-frames': !allSelected, brainstorm: !allSelected, faq: !allSelected, outline: !allSelected, adventure: !allSelected, 'concept-sort': !allSelected, image: !allSelected, timeline: !allSelected }"

count = content.count(OLD)
print(f"Found {count} occurrences of the toggle pattern")

if count > 0:
    content = content.replace(OLD, NEW)
    open(filepath, 'w', encoding='utf-8').write(content)
    print(f"[OK] Updated {count} occurrences to include all 11 types")
else:
    # Try a more flexible search
    import re
    # Find lines containing setBatchTypes and allSelected
    lines = content.split('\n')
    for i, l in enumerate(lines):
        if 'setBatchTypes' in l and 'allSelected' in l:
            print(f"L{i+1}: {l.strip()[:150]}")
