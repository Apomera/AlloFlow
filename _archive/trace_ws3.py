filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find ALL activeView conditionals in the range
for i in range(60200, 61575):
    line = lines[i]
    if 'activeView ===' in line:
        indent = len(line) - len(line.lstrip())
        print(f"L{i+1} (indent {indent}): {line.strip()[:140]}")
