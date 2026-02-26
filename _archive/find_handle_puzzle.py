"""Find handlePuzzleSolved and show all lines with 'prev'"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

# Find handlePuzzleSolved
for i, line in enumerate(lines):
    if 'handlePuzzleSolved' in line and ('const ' in line or 'function ' in line):
        print("Found at L" + str(i+1))
        # Show 80 lines
        for j in range(i, min(i + 80, len(lines))):
            marker = " >>> " if 'prev' in lines[j].lower() else "     "
            print(marker + "L" + str(j+1) + ": " + lines[j].rstrip()[:200])
        break
