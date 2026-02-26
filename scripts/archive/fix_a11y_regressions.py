"""
Fix all 4 regressions from the accessibility patches:
1. Duplicate role="dialog" at L25799/25801
2. Duplicate aria-label on <aside> at L62320/62322
3. Duplicate className at L62629/62635
4. Broken input at L72547-72549 (premature />, dangling quote)
"""

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

count = 0

# FIX 1: Duplicate role="dialog" on L25801
# L25799: role="dialog"
# L25801: role="dialog" onClick={e => e.stopPropagation()}
# Solution: Remove the duplicate role from L25801, keep just onClick
OLD1 = '''                        role="dialog"
                        aria-label={t('concept_map.venn.choose_dest_aria')}
                        role="dialog" onClick={e => e.stopPropagation()}'''
NEW1 = '''                        role="dialog"
                        aria-label={t('concept_map.venn.choose_dest_aria')}
                        onClick={e => e.stopPropagation()}'''
if OLD1 in content:
    content = content.replace(OLD1, NEW1, 1)
    count += 1
    print("  ✅ Fix 1: Removed duplicate role='dialog'")
else:
    print("  ❌ Fix 1: Pattern not found")

# FIX 2: Duplicate aria-label on <aside>
# L62320: <aside aria-label="Sidebar"
# L62322: aria-label={t('sidebar.tools_header')}
# Solution: Remove our static "Sidebar" label, keep the dynamic t() one
OLD2 = '<aside aria-label="Sidebar" '
NEW2 = '<aside '
if OLD2 in content:
    content = content.replace(OLD2, NEW2, 1)
    count += 1
    print("  ✅ Fix 2: Removed duplicate aria-label on <aside>")
else:
    print("  ❌ Fix 2: Pattern not found")

# FIX 3: Duplicate className on input at L62629/62635
# L62629: className="w-full"  (truncated leftover)
# L62635: className="flex-grow ..."  (the real one)
# Solution: Remove the truncated className="w-full"
OLD3 = '''<input aria-label="Enter ai standard query"
                                            className="w-full"
                                            type="text"'''
NEW3 = '''<input aria-label="Enter ai standard query"
                                            type="text"'''
if OLD3 in content:
    content = content.replace(OLD3, NEW3, 1)
    count += 1
    print("  ✅ Fix 3: Removed duplicate className='w-full'")
else:
    print("  ❌ Fix 3: Pattern not found")

# FIX 4: Broken input at L72547-72549
# L72547: <input aria-label="Text field"
# L72548: />          <-- premature close!
# L72549: "           <-- dangling quote!
# L72550+: type="text" value={item.event} ...
# Solution: Remove the premature /> and dangling ", merge with next attributes
OLD4 = '''<input aria-label="Text field"
                                                    />
  " '''
NEW4 = '''<input aria-label="Text field"
  '''
if OLD4 in content:
    content = content.replace(OLD4, NEW4, 1)
    count += 1
    print("  ✅ Fix 4: Removed premature /> and dangling quote")
else:
    # Try with different whitespace
    print("  ⚠️ Fix 4: Exact pattern not found, trying line-by-line...")
    lines = content.split('\n')
    for i, line in enumerate(lines):
        # Look for the broken pattern: aria-label="Text field" followed by /> then "
        if 'aria-label="Text field"' in line and i + 2 < len(lines):
            next1 = lines[i+1].strip()
            next2 = lines[i+2].strip()
            if next1 == '/>' and next2.startswith('"'):
                # This is the broken pattern
                # Remove the /> line and the " line, let the input flow to its real attributes
                lines[i+1] = ''
                lines[i+2] = ''
                count += 1
                print(f"  ✅ Fix 4: Removed broken /> at L{i+2} and dangling quote at L{i+3}")
    content = '\n'.join(lines)

# Also check for any other duplicate role="dialog" patterns
# Pattern: role="dialog" onClick={e => e.stopPropagation()} where role= already exists nearby
lines = content.split('\n')
dup_roles_fixed = 0
for i, line in enumerate(lines):
    if 'role="dialog" onClick=' in line:
        # Check if there's already a role="dialog" within the previous 5 lines
        for j in range(max(0, i-5), i):
            if 'role="dialog"' in lines[j] and j != i:
                # Duplicate! Remove role="dialog" from current line
                lines[i] = line.replace('role="dialog" ', '', 1)
                dup_roles_fixed += 1
                print(f"  ✅ Removed additional duplicate role='dialog' at L{i+1}")
                break

if dup_roles_fixed > 0:
    content = '\n'.join(lines)
    count += dup_roles_fixed

# Clean up any double blank lines
while '\n\n\n' in content:
    content = content.replace('\n\n\n', '\n\n')

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n✅ Fixed {count} regressions")
