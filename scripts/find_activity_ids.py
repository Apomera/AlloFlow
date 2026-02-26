"""Find activity IDs and how rhyme/blend are referenced"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find ACTIVITIES array with IDs
print("=== ACTIVITIES array members ===")
for i, l in enumerate(lines):
    if 'ACTIVITIES' in l and ('const' in l or 'useMemo' in l):
        for j in range(i, min(len(lines), i+40)):
            if 'id:' in lines[j]:
                print("L%d: %s" % (j+1, lines[j].strip()[:150]))
        break

# Find what activity IDs are used in switch/case blocks  
print("\n=== Activity case statements ===")
for i, l in enumerate(lines):
    stripped = l.strip()
    if stripped.startswith("case '") and ('rhym' in stripped or 'blend' in stripped):
        print("L%d: %s" % (i+1, stripped[:120]))

# Find where blendingOptions and rhymeOptions are SET (not just read)
print("\n=== setBlendingOptions calls ===")
for i, l in enumerate(lines):
    if 'setBlendingOptions' in l:
        print("L%d: %s" % (i+1, l.strip()[:180]))

print("\n=== setRhymeOptions calls ===")  
for i, l in enumerate(lines):
    if 'setRhymeOptions' in l:
        print("L%d: %s" % (i+1, l.strip()[:180]))
