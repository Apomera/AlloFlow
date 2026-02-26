filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# The regex should be new RegExp('\\n{2,}') in the source (which becomes /\n{2,}/ at runtime)
# But it was written as \\\\n which is literal \\n (4 chars: \\n)
# Fix: replace with proper escaping
old = "new RegExp('\\\\\\\\n{2,}')"
new = "new RegExp('\\\\n{2,}')"

if old in content:
    content = content.replace(old, new, 1)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed double-escape in RegExp")
else:
    # Check what's actually there
    idx = content.find("new RegExp(")
    if idx > 0:
        snippet = repr(content[idx:idx+40])
        print(f"Current RegExp: {snippet}")
        # Check the actual bytes
        actual = content[idx:idx+30]
        print(f"Actual chars: {[c for c in actual]}")
