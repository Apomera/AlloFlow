"""Find where preloadInitialBatch is called"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

out = open('_preload_callers.txt', 'w', encoding='utf-8')

# preloadInitialBatch callers
out.write("=== preloadInitialBatch callers ===\n")
for i, line in enumerate(lines):
    if 'preloadInitialBatch' in line:
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# Where does wordPool get its words from? (handleStart → onStartGame → ?)
out.write("\n=== handleWordSoundsStartGame body ===\n")
for i in range(38126, min(38200, len(lines))):
    out.write(f"  L{i+1}: {lines[i].rstrip()[:180]}\n")

# What is onStartGame?
out.write("\n=== onStartGame / onStart references ===\n")
for i, line in enumerate(lines):
    if 'onStartGame' in line:
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

out.close()
print("Done -> _preload_callers.txt")
