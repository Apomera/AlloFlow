"""Deeper check: is WordSoundsContent defined inside AlloFlowContent 
or before it? That determines scope."""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

out = open('_scope_check.txt', 'w', encoding='utf-8')

# WordSoundsContent definition
out.write("=== WordSoundsContent definition ===\n")
for i, line in enumerate(lines):
    if 'WordSoundsContent' in line and ('function ' in line or 'const ' in line):
        if 'WordSoundsContent' in line.split('=')[0] if '=' in line else True:
            out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# AlloFlowContent definition
out.write("\n=== AlloFlowContent definition ===\n")
for i, line in enumerate(lines):
    if 'AlloFlowContent' in line and ('function ' in line or 'const ' in line):
        out.write(f"  L{i+1}: {line.strip()[:180]}\n")

# WordSoundsContent is at ~L3070, AlloFlowContent at L31382
# WordSoundsContent is BEFORE AlloFlowContent - so it's a separate component
# The error "at AlloFlowContent" in the React stack trace means
# AlloFlowContent CALLED the render that triggered the error

# Check: where exactly does the error blob:78195 correspond to?
# The blob compiles everything linearly, so line 78195 could be
# anywhere in the compiled output. The error is from WordSoundsContent.

# Let's find if wordSoundsSessionGoal is used in the component BODY 
# before props destructuring
out.write("\n=== WordSoundsContent props destructuring ===\n")
ws_start = None
for i, line in enumerate(lines):
    if 'function WordSoundsContent' in line or 'const WordSoundsContent' in line:
        ws_start = i
        break

if ws_start:
    # Find where props are destructured
    out.write(f"  Component starts at L{ws_start+1}\n")
    # Show first 40 lines of the component
    for i in range(ws_start, min(ws_start + 60, len(lines))):
        if 'wordSoundsSessionGoal' in lines[i]:
            out.write(f"  L{i+1}: {lines[i].strip()[:180]}\n")

# Check if the error is actually in AlloFlowContent's use (L65070 area)
# Maybe the variable at L32370 is used before it's declared?
out.write("\n=== All wordSoundsSessionGoal in AlloFlowContent (after L31382) ===\n")
for i in range(31381, len(lines)):
    if 'wordSoundsSessionGoal' in lines[i]:
        out.write(f"  L{i+1}: {lines[i].strip()[:180]}\n")

out.close()
print("Done -> _scope_check.txt")
