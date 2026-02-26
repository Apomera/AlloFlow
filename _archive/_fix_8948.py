import sys

with open('AlloFlowANTI.txt', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Fix: Replace optional chaining in alloBotRef animation calls with explicit checks
# These patterns were added by the animation patch

old = 'alloBotRef?.current?.playAnimation'
new = 'alloBotRef && alloBotRef.current && alloBotRef.current.playAnimation'

count = content.count(old)
print(f"Found {count} occurrences of optional chaining pattern")

content = content.replace(old, new)

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

# Verify
with open('AlloFlowANTI.txt', 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

remaining = sum(1 for l in lines if 'alloBotRef?.current?.playAnimation' in l)
fixed = sum(1 for l in lines if 'alloBotRef && alloBotRef.current && alloBotRef.current.playAnimation' in l)
print(f"Remaining optional chaining: {remaining}")
print(f"Fixed explicit checks: {fixed}")
print("Done!")
