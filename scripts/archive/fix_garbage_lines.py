"""
Comprehensive fix for ALL remaining corrupted <input> elements.

The corruption pattern is:
- line N: <input aria-label="Text field"
- line N+1: GARBAGE (truncated className, dangling /", etc.)
- line N+2...: the real attributes (type=, value=, onChange=, className=, etc.)

Fix: remove the garbage line entirely.
"""
import re

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

original_count = len(lines)
removed = []

# Pass 1: Remove lines that are clearly garbage from the corruption
i = 0
while i < len(lines):
    s = lines[i].strip()
    
    # Pattern 1: Line is just `/"` or similar dangling tag closers
    if s in ['/"', '/>', '/">', 'className="w-"', '/"']:
        # Check if the previous line has aria-label and next line has type= or value=
        if i > 0 and i + 1 < len(lines):
            prev = lines[i-1].strip()
            nxt = lines[i+1].strip()
            if 'aria-label=' in prev and (nxt.startswith('type=') or nxt.startswith('value=') or nxt.startswith('className=')):
                removed.append((i+1, s))
                lines[i] = ''
                print(f"  REMOVED L{i+1}: '{s}' (dangling tag closer)")
    
    # Pattern 2: Truncated className followed by another className
    if 'className={`' in s and s.endswith('"'):
        for j in range(i+1, min(i+10, len(lines))):
            if 'className=' in lines[j]:
                removed.append((i+1, s[:60]))
                lines[i] = ''
                print(f"  REMOVED L{i+1}: truncated className")
                break
            if '/>' in lines[j]:
                break
    
    # Pattern 3: className="w-" (truncated short className)
    if s == 'className="w-"' or s == "className='w-'" or re.match(r'^className="\w{1,5}-"$', s):
        for j in range(i+1, min(i+10, len(lines))):
            if 'className=' in lines[j]:
                removed.append((i+1, s))
                lines[i] = ''
                print(f"  REMOVED L{i+1}: truncated short className: {s}")
                break
            if '/>' in lines[j]:
                break
    
    i += 1

# Write back, filtering empty lines
content = ''.join(lines)

# Clean up double-blank-lines left by removals
while '\n\n\n' in content:
    content = content.replace('\n\n\n', '\n\n')

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n✅ Removed {len(removed)} garbage lines")
print(f"  Line count: {original_count} → {len(content.split(chr(10)))}")

# Verify: check for any remaining unclosed <input aria-label=... elements
lines = content.split('\n')
issues = 0
for i, line in enumerate(lines):
    s = line.strip()
    if s.startswith('/"') or s == '/"':
        issues += 1
        print(f"  ⚠️ Remaining issue L{i+1}: {s}")
    # Check for aria-label followed by immediate self-close on next line
    if 'aria-label=' in s and i + 1 < len(lines):
        nxt = lines[i+1].strip()
        if nxt in ['/"', '/>', '/">']:
            # Check if there should be more attributes
            if i + 2 < len(lines):
                after = lines[i+2].strip()
                if after.startswith('type=') or after.startswith('value='):
                    issues += 1
                    print(f"  ⚠️ Premature close L{i+2}: {nxt}")

print(f"\nRemaining issues: {issues}")
