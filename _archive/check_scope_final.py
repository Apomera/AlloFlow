"""Final check: Any raw reference to wordSoundsSessionGoal 
outside function/component scope?"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

# We know:
# L1301: declared in WordSoundsGenerator function
# L3057: WordSoundsModal starts
# L3106: destructured from props (default=10)
# L7936: used inside WordSoundsModal
# L31383: AlloFlowContent starts
# L32371: declared in AlloFlowContent
# L65071: passed as prop

# Find component boundaries to check scope
out = open('_scope_final.txt', 'w', encoding='utf-8')

# Find WordSoundsGenerator boundaries
out.write("=== Component Boundaries ===\n")
for i, line in enumerate(lines):
    if 'WordSoundsGenerator' in line and ('function' in line or 'const' in line):
        out.write(f"  WordSoundsGenerator starts at L{i+1}\n")
    if 'WordSoundsModal' in line and ('function' in line or 'const' in line):
        out.write(f"  WordSoundsModal starts at L{i+1}\n")
    if 'AlloFlowContent' in line and ('function' in line or 'const' in line):
        out.write(f"  AlloFlowContent starts at L{i+1}\n")

# The two inner references are L1701/L1723/L1727 (inside WordSoundsGenerator) 
# and L7936 (inside WordSoundsModal). Both should be in scope.
# But what if there are references OUTSIDE these component functions?
# Let's check lines 0-1200 and lines after the components

# Check if there are any references before WordSoundsGenerator
out.write("\n=== References before any component (top-level) ===\n")
for i in range(0, 1200):
    if 'wordSoundsSessionGoal' in lines[i]:
        out.write(f"  L{i+1}: {lines[i].strip()[:180]}\n")

# References between components
out.write("\n=== References between WordSoundsGenerator end and WordSoundsModal start ===\n")
# WS Generator probably ends around L1800, WS Modal starts at L3057
for i in range(1800, 3057):
    if 'wordSoundsSessionGoal' in lines[i]:
        out.write(f"  L{i+1}: {lines[i].strip()[:180]}\n")

# Check at the very end of file (after all components)  
out.write("\n=== References after AlloFlowContent (L73000+) ===\n")
for i in range(73000, len(lines)):
    if 'wordSoundsSessionGoal' in lines[i]:
        out.write(f"  L{i+1}: {lines[i].strip()[:180]}\n")

out.close()
print("Done -> _scope_final.txt")
