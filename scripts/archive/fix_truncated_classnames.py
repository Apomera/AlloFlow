"""
Find and remove truncated className lines that were left behind
by the broken label heuristic.

Pattern: A className= line that ends with a quote (") instead of 
proper `}` or a complete className string, followed by another 
className= within the same element.
"""
import re

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

fixes = 0
i = 0
while i < len(lines):
    line = lines[i].rstrip()
    
    # Check for truncated className: className={`... ending with "
    if 'className={`' in line and line.endswith('"'):
        # This looks truncated - check if there's another className nearby
        for j in range(i+1, min(i+10, len(lines))):
            if 'className=' in lines[j]:
                # Found duplicate - this line is garbage
                print(f"  L{i+1}: REMOVING truncated: {line.strip()[:80]}")
                lines[i] = ''
                fixes += 1
                break
            if '/>' in lines[j]:
                break
    
    # Also check for className="..." that's clearly truncated
    # Pattern: className="partial text" with no proper CSS class names
    if re.match(r'^\s+className="\w{1,3}-"$', line.strip()):
        # Very short truncated className like `w-"` 
        for j in range(i+1, min(i+10, len(lines))):
            if 'className=' in lines[j]:
                print(f"  L{i+1}: REMOVING truncated short: {line.strip()[:80]}")
                lines[i] = ''
                fixes += 1
                break
            if '/>' in lines[j]:
                break
    
    i += 1

# Also check the specific known issues
content = ''.join(lines)

# Fix 1: The L62163 issue - truncated className followed by real one
# Pattern: className={`...bo"  (truncated with dangling quote)
bad_patterns = [
    ('className={`w-1/3 text-xs border bo"', ''),  # Remove truncated line
]

for old, new in bad_patterns:
    if old in content:
        content = content.replace(old, new, 1)
        fixes += 1
        print(f"  Fixed specific pattern: {old[:50]}")

# Clean up any empty lines created
while '\n\n\n' in content:
    content = content.replace('\n\n\n', '\n\n')

# Also fix the L62644-area issue from the earlier fix
# Check L62644 area in the other standards finder (teacher dashboard version)
lines = content.split('\n')
for i, line in enumerate(lines):
    s = line.strip()
    if s.startswith('className="w-"'):
        # This is a truncated className
        for j in range(i+1, min(i+10, len(lines))):
            if 'className=' in lines[j]:
                print(f"  L{i+1}: REMOVING className=\"w-\": {s[:60]}")
                lines[i] = ''
                fixes += 1
                break
            if '/>' in lines[j]:
                break

content = '\n'.join(lines)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n✅ Total truncated classNames fixed: {fixes}")

# Verify no remaining issues
remaining = 0
lines = content.split('\n')
for i, line in enumerate(lines):
    if 'className={`' in line and line.rstrip().endswith('"'):
        remaining += 1
        print(f"  ⚠️ Still broken L{i+1}: {line.strip()[:80]}")

print(f"Remaining possibly broken classNames: {remaining}")
