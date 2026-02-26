"""Replace JSON.parse(JSON.stringify(...)) with structuredClone(...)."""
FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()

import re

# Pattern: JSON.parse(JSON.stringify(EXPR))
# We need to match balanced parens inside JSON.stringify(...)
count = 0
result = []
i = 0
target = 'JSON.parse(JSON.stringify('
while i < len(c):
    pos = c.find(target, i)
    if pos == -1:
        result.append(c[i:])
        break
    
    result.append(c[i:pos])
    
    # Find the matching closing paren for JSON.stringify(
    inner_start = pos + len(target)
    depth = 1
    j = inner_start
    while j < len(c) and depth > 0:
        if c[j] == '(':
            depth += 1
        elif c[j] == ')':
            depth -= 1
        j += 1
    # j now points past the closing ) of JSON.stringify(...)
    # We need one more ) for JSON.parse(...)
    stringify_content = c[inner_start:j-1]  # content inside JSON.stringify()
    
    # Expect closing paren for JSON.parse
    if j < len(c) and c[j] == ')':
        result.append(f'structuredClone({stringify_content})')
        i = j + 1
        count += 1
        print(f"  Replaced #{count}: structuredClone({stringify_content[:50]}...)")
    else:
        # Mismatch, keep original
        result.append(target)
        i = pos + len(target)

c = ''.join(result)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(c)

print(f"\nTotal replacements: {count}")
print(f"Remaining JSON.parse(JSON.stringify: {c.count('JSON.parse(JSON.stringify')}")
print(f"structuredClone count: {c.count('structuredClone(')}")
