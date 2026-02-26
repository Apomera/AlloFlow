"""Find RhymeView component's edit mode section"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
OUT = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\scripts\rhyme_edit_audit.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

results = []

# Find RhymeView definition
results.append("=== RhymeView definition ===")
for i, l in enumerate(lines):
    if 'RhymeView' in l and ('const' in l or 'function' in l) and ('=>' in l or '{' in l):
        if 'React.useMemo' in l or 'React.memo' in l or 'useCallback' in l or '= (' in l:
            results.append("L%d: %s" % (i+1, l.strip()[:180]))

# Find isEditing inside RhymeView (within 200 lines of def)
for i, l in enumerate(lines):
    if 'RhymeView' in l and ('const' in l or 'function' in l) and ('useMemo' in l or 'memo' in l):
        start = i
        for j in range(i, min(len(lines), i+200)):
            if 'isEditing' in lines[j]:
                results.append("L%d: %s" % (j+1, lines[j].strip()[:180]))
        break

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
print("Written %d lines" % len(results))
