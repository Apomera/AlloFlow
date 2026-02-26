"""Find all onClick handlers that could trigger word-sounds resource loading"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find ALL calls to handleRestoreView
print("=== All handleRestoreView calls (not definitions) ===")
for i, l in enumerate(lines):
    if 'handleRestoreView(' in l and 'const' not in l and '//' not in l.split('handleRestoreView')[0]:
        print("L%d: %s" % (i+1, l.strip()[:180]))

# Find resource history rendering
print("\n=== Resource History / Pack item rendering ===")
for i, l in enumerate(lines):
    if 'history' in l.lower() and 'map(' in l and 57000 < i < 75000:
        print("L%d: %s" % (i+1, l.strip()[:170]))

# Find onClick in history section
print("\n=== onClick in history cards/items (L60000-75000) ===")
for i, l in enumerate(lines):
    if 'onClick' in l and 'history' in l.lower() and 60000 < i < 75000:
        print("L%d: %s" % (i+1, l.strip()[:170]))

# Find the history panel rendering
print("\n=== history.map or resourceHistory.map ===")
for i, l in enumerate(lines):
    if ('history.map' in l or 'resourceHistory' in l) and 'map' in l:
        print("L%d: %s" % (i+1, l.strip()[:170]))
