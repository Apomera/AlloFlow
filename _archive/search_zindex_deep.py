"""Deep search for z-index and dropdown context"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

out = open('_zindex_deep.txt', 'w', encoding='utf-8')

# Show context around z-index=9999 at L11040
out.write("=== Z-INDEX 9999 at L11040 (±5 lines) ===\n")
for i in range(11034, 11046):
    out.write(f"  L{i+1}: {lines[i].rstrip()[:180]}\n")

# Show context around z-index=10999 at L34694
out.write("\n=== Z-INDEX 10999 at L34694 (±5 lines) ===\n")
for i in range(34688, 34700):
    out.write(f"  L{i+1}: {lines[i].rstrip()[:180]}\n")

# Show context around z-index=9999 at L71890
out.write("\n=== Z-INDEX 9999 at L71890 (±5 lines) ===\n")
for i in range(71884, min(71896, len(lines))):
    out.write(f"  L{i+1}: {lines[i].rstrip()[:180]}\n")

# Find the Word Sounds modal overlay z-index
out.write("\n=== 'fixed inset-0' or modal overlay patterns ===\n")
for i, line in enumerate(lines):
    if 'fixed inset-0' in line and 'z-' in line:
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# Find all zIndex values (inline styles)
out.write("\n=== All inline zIndex values ===\n")
import re
for i, line in enumerate(lines):
    matches = re.findall(r'zIndex:\s*(\d+)', line)
    for m in matches:
        out.write(f"  L{i+1}: zIndex={m} | {line.strip()[:150]}\n")

# Find filter_all / All Resources dropdown
out.write("\n=== filter_all / 'All Resources' dropdown ===\n")
for i, line in enumerate(lines):
    if 'filter_all' in line or 'filterType' in line.lower() or 'resourceFilter' in line:
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# Find Select Group / Profile dropdown
out.write("\n=== select_default / group dropdown ===\n")
for i, line in enumerate(lines):
    if 'select_default' in line or 'selectedGroup' in line or 'groupFilter' in line:
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# Check wordSoundsSessionGoal prop at L3106 context
out.write("\n=== L3106 wordSoundsSessionGoal context ===\n")
for i in range(3098, 3115):
    out.write(f"  L{i+1}: {lines[i].rstrip()[:180]}\n")

# Check L65070 prop passing
out.write("\n=== L65070 wordSoundsSessionGoal prop ===\n")
for i in range(65060, 65080):
    if i < len(lines):
        out.write(f"  L{i+1}: {lines[i].rstrip()[:180]}\n")

out.close()
print("Done -> _zindex_deep.txt")
