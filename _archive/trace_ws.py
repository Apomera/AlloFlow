"""
Trace the JSX nesting to understand what parent conditionals
the WordSoundsModal (line 61574) and preview card (line 60873) are under.
"""
filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Check the parent conditionals around the WordSoundsModal (line 61574)
# Walk backwards from line 61574 to find enclosing conditional blocks
print("=== Context around WordSoundsModal (line 61574) ===")
for i in range(61565, min(len(lines), 61580)):
    print(f"  {i+1}: {lines[i].rstrip()[:150]}")

# Walk backwards from the modal to find the enclosing activeView conditional
print("\n=== Walking back to find parent activeView conditional ===")
# Look for the nearest {activeView === or {(activeView === before line 61574
for i in range(61573, 60000, -1):
    line = lines[i]
    if 'activeView ===' in line and ('{' in line or '(' in line):
        print(f"  Found at line {i+1}: {line.rstrip()[:150]}")
        # Show context
        for j in range(max(0, i-2), min(len(lines), i+3)):
            print(f"    {j+1}: {lines[j].rstrip()[:150]}")
        break

# Check where the preview card's parent block ends
print("\n=== Preview card context (line 60870-60900) ===")
for i in range(60870, min(len(lines), 60900)):
    print(f"  {i+1}: {lines[i].rstrip()[:150]}")

# The key question: is the WordSoundsModal inside a {activeView === 'simplified' && (...)} block?
# If so, it won't render when activeView is 'word-sounds'
print("\n=== Checking if modal is inside activeView === 'simplified' block ===")
in_simplified = False
for i in range(60000, 61580):
    line = lines[i]
    if "activeView === 'simplified'" in line:
        in_simplified = True
        print(f"  ENTERED simplified block at line {i+1}: {line.rstrip()[:120]}")
    if i >= 61570 and i <= 61580:
        print(f"  >>> Line {i+1}: {lines[i].rstrip()[:120]}")
