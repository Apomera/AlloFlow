"""Find where wordSoundsSessionGoal is used before its declaration at L3106 or L32370,
and examine the z-index CSS at L11040 more carefully."""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

out = open('_goal_zindex_fix.txt', 'w', encoding='utf-8')

# Check which component the error is in
# The error says "at AlloFlowContent" - that's the inner component
# Find AlloFlowContent definition
out.write("=== AlloFlowContent definition ===\n")
for i, line in enumerate(lines):
    if 'AlloFlowContent' in line and ('function ' in line or 'const ' in line or '= (' in line):
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# Find wordSoundsSessionGoal usage at L7936 context (from earlier search)
out.write("\n=== wordSoundsSessionGoal at L7936 context ===\n")
for i in range(7930, 7942):
    out.write(f"  L{i+1}: {lines[i].rstrip()[:180]}\n")

# Check if AlloFlowContent is where L3106 lives (it destructures the prop)
# or if the error comes from using it before the component renders
out.write("\n=== AlloFlowContent function declaration area ===\n")
for i, line in enumerate(lines):
    if 'function AlloFlowContent' in line or 'const AlloFlowContent' in line:
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")
        # Show next 20 lines
        for j in range(i+1, min(i+20, len(lines))):
            out.write(f"  L{j+1}: {lines[j].rstrip()[:180]}\n")
        break

# Check the CSS z-index context for fixing
out.write("\n=== CSS z-index 9999 context (L11030-11055) ===\n")
for i in range(11029, 11055):
    out.write(f"  L{i+1}: {lines[i].rstrip()[:180]}\n")

# Check if the Word Sounds modal has its own z-index
out.write("\n=== Word Sounds Modal container (L1650 area) ===\n")
for i in range(1645, 1660):
    out.write(f"  L{i+1}: {lines[i].rstrip()[:180]}\n")

# Also check the outer wrapper at L65030-65050 where WordSoundsContent is rendered
out.write("\n=== WordSoundsContent render site (L65030-65060) ===\n")
for i in range(65030, min(65060, len(lines))):
    out.write(f"  L{i+1}: {lines[i].rstrip()[:180]}\n")

out.close()
print("Done -> _goal_zindex_fix.txt")
