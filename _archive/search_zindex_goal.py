"""Search for z-index issues and wordSoundsSessionGoal"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

out = open('_zindex_goal_search.txt', 'w', encoding='utf-8')

# Search for wordSoundsSessionGoal
out.write("=== wordSoundsSessionGoal references ===\n")
for i, line in enumerate(lines):
    if 'wordSoundsSessionGoal' in line:
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# Search for useState that declares session goal
out.write("\n=== sessionGoal state declarations ===\n")
for i, line in enumerate(lines):
    if 'sessionGoal' in line.lower() and ('usestate' in line.lower() or 'const [' in line.lower()):
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# Search for 'all resources' dropdown
out.write("\n=== 'all resources' / 'All Resources' ===\n")
for i, line in enumerate(lines):
    if 'all resources' in line.lower() or 'allresources' in line.lower():
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# Search for 'select group' / 'select profile'
out.write("\n=== 'select group' / 'select profile' ===\n")
for i, line in enumerate(lines):
    if 'select group' in line.lower() or 'select profile' in line.lower():
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# Search for resource history z-index
out.write("\n=== z-index values > 1000 ===\n")
count = 0
for i, line in enumerate(lines):
    if 'z-index' in line.lower() or 'zindex' in line.lower() or 'zIndex' in line:
        # Extract the z value
        import re
        vals = re.findall(r'[zZ][-_]?[iI]ndex[:\s]*(\d+)', line)
        if vals:
            for v in vals:
                if int(v) >= 1000:
                    out.write(f"  L{i+1}: z={v} | {line.strip()[:150]}\n")
                    count += 1
        elif any(x in line for x in ['zIndex:', 'z-index:', 'zIndex :']):
            out.write(f"  L{i+1}: {line.strip()[:150]}\n")
            count += 1

out.write(f"\n  Total high z-index entries (>=1000): {count}\n")

# Search for Word Sounds modal z-index
out.write("\n=== Word Sounds Modal z-index ===\n")
for i, line in enumerate(lines):
    if ('WordSoundsModal' in line or 'word-sounds-modal' in line or 'wordSoundsModal' in line) and ('z' in line.lower()):
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# Search for resource history pack
out.write("\n=== resource history / ResourceHistory ===\n")
for i, line in enumerate(lines):
    if 'resourcehistory' in line.lower() or 'resource-history' in line.lower() or 'historyPack' in line.lower():
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

out.close()
print("Done -> _zindex_goal_search.txt")
