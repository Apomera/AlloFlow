import re

f = open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt', 'r', encoding='utf-8')
data = f.read()
f.close()

# Strategy: Find the "Solve Problem" or submit button in the math sidebar
# and its associated onClick handler. Then we'll add a useEffect that
# programmatically triggers it when StemLab's Generate All fires.

# Find ALL instances of "mathMode" near onClick to locate the math submit button
lines = data.split('\n')
for i, line in enumerate(lines):
    if 'Solve' in line and 'Problem' in line:
        print(f'L{i+1}: {line[:120].strip()}')
    if 'setActiveView' in line and 'math' in line:
        # Show context
        ctx = lines[max(0,i-2):i+3]
        for j, c in enumerate(ctx):
            print(f'  L{i-1+j}: {c[:120].strip()}')
        print()

# Also find where activeView === 'math' triggers generation
print('\n--- activeView math sections ---')
for i, line in enumerate(lines):
    if "activeView === 'math'" in line or 'activeView==="math"' in line:
        print(f'L{i+1}: {line[:120].strip()}')
