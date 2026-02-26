"""Find IsolationView, BlendingView, and OrthographyView edit mode sections"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
OUT = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\scripts\edit_views_audit.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

results = []

# Find OrthographyView definition and isEditing
results.append("=== OrthographyView ===")
for i, l in enumerate(lines):
    if 'OrthographyView' in l and ('React.memo' in l or 'const' in l) and ('=>' in l or '{' in l):
        results.append("DEF L%d: %s" % (i+1, l.strip()[:180]))
for i, l in enumerate(lines):
    if 'isEditing' in l and i > 5420 and i < 5600:
        results.append("L%d: %s" % (i+1, l.strip()[:180]))

# Find IsolationView definition
results.append("\n=== IsolationView ===")
for i, l in enumerate(lines):
    if 'IsolationView' in l and ('React.memo' in l or 'const' in l) and ('=>' in l or '{' in l):
        if i > 4000 and i < 6000:
            results.append("DEF L%d: %s" % (i+1, l.strip()[:180]))
for i, l in enumerate(lines):
    if 'isEditing' in l and 'isolation' in lines[max(0,i-20):i+1].__repr__().lower():
        if i > 4000 and i < 6000:
            results.append("L%d: %s" % (i+1, l.strip()[:180]))

# Find IsolationView edit mode rendering
results.append("\n=== Isolation edit mode rendering ===")
for i, l in enumerate(lines):
    if 'isEditing' in l and i > 5050 and i < 5330:
        results.append("L%d: %s" % (i+1, l.strip()[:180]))

# Find BlendingView/blending edit mode
results.append("\n=== Blending edit mode ===")
for i, l in enumerate(lines):
    if 'isEditing' in l and i > 10000 and i < 10200:
        results.append("L%d: %s" % (i+1, l.strip()[:180]))

# Find where isolation options render in edit mode (input fields)
results.append("\n=== Isolation option inputs ===")
for i, l in enumerate(lines):
    if 'isoOptions' in l and 'map' in l:
        results.append("L%d: %s" % (i+1, l.strip()[:180]))
        for j in range(i+1, min(len(lines), i+30)):
            if 'isEditing' in lines[j] or 'input' in lines[j].lower() or 'onChange' in lines[j]:
                results.append("  L%d: %s" % (j+1, lines[j].strip()[:180]))

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
print("Written %d lines" % len(results))
