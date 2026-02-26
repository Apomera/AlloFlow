"""Find edit mode rendering for isolation and rhyming activities"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
OUT = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\scripts\edit_mode_audit.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

results = []

# Find isolation activity rendering (case 'isolation')
results.append("=== case 'isolation' in renderActivityContent ===")
for i, l in enumerate(lines):
    if "'isolation'" in l and ('case' in l) and i > 10000 and i < 12000:
        results.append("L%d: %s" % (i+1, l.strip()[:180]))
        # Show 5 lines
        for j in range(i+1, min(len(lines), i+5)):
            results.append("  L%d: %s" % (j+1, lines[j].strip()[:180]))

# Find 'isEditing' within isolation rendering (L10400-10900)
results.append("\n=== isEditing in isolation rendering ===")
for i, l in enumerate(lines):
    if 'isEditing' in l and i > 10400 and i < 10900:
        results.append("L%d: %s" % (i+1, l.strip()[:180]))

# Find rhyming case rendering
results.append("\n=== case 'rhyming' in renderActivityContent ===")
for i, l in enumerate(lines):
    if "'rhyming'" in l and 'case' in l and i > 10000 and i < 12000:
        results.append("L%d: %s" % (i+1, l.strip()[:180]))

# Find blending case rendering
results.append("\n=== case 'blending' in renderActivityContent ===")
for i, l in enumerate(lines):
    if "'blending'" in l and 'case' in l and i > 10000 and i < 12000:
        results.append("L%d: %s" % (i+1, l.strip()[:180]))

# Find 'correctAnswer' set calls in isolation state
results.append("\n=== setIsolationState correctAnswer ===")
for i, l in enumerate(lines):
    if 'correctAnswer' in l and ('setIsolation' in l or 'isolation' in l.lower()):
        results.append("L%d: %s" % (i+1, l.strip()[:180]))

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
print("Written %d lines" % len(results))
