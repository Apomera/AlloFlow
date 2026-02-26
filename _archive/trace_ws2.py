filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Walk backwards from line 61574 to find ALL activeView conditionals
# that might be wrapping the WordSoundsModal
print("=== activeView conditionals between lines 60000-61575 ===")
for i in range(60000, 61575):
    line = lines[i]
    if 'activeView ===' in line:
        indent = len(line) - len(line.lstrip())
        print(f"  Line {i+1} (indent={indent}): {line.rstrip()[:130]}")

# Also check if the modal is inside a glossary-specific block
print("\n=== Checking parent { blocks enclosing line 61574 ===")
# Simple brace counting backwards
target = 61573  # 0-indexed
depth = 0
for i in range(target, max(0, target - 500), -1):
    line = lines[i]
    # Count closing and opening braces
    opens = line.count('{')
    closes = line.count('}')
    depth += closes - opens
    if depth < 0:
        # We've found a parent block
        print(f"  Parent block opener at line {i+1} (depth={depth}): {line.rstrip()[:140]}")
        if 'activeView' in line:
            print(f"    *** THIS IS THE ENCLOSING activeView CONDITIONAL ***")
            break
        depth = 0  # Reset to find higher parents
