"""Fix: Remove leftover old banner remnants AND audit Escape Room state"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

le = '\r\n' if lines[0].endswith('\r\n') else '\n'
changes = []
original = len(lines)

# ====================================================================
# FIX: Remove leftover old banner (L1682-1694 has old review button)
# ====================================================================
# Find the old remnant: starts with "preloadedWords.length > 5"
remnant_start = None
remnant_end = None
for i in range(1675, 1700):
    if i >= len(lines):
        break
    if 'preloadedWords.length > 5' in lines[i]:
        remnant_start = i
    if remnant_start and lines[i].strip() == ')}' and i > remnant_start:
        remnant_end = i
        break

if remnant_start and remnant_end:
    removed = remnant_end - remnant_start + 1
    del lines[remnant_start:remnant_end + 1]
    changes.append(f"FIX: Removed leftover old banner remnants (L{remnant_start+1}-{remnant_end+1}, {removed} lines)")
else:
    print(f"WARNING: Could not find remnant (start={remnant_start}, end={remnant_end})")

# ====================================================================
# AUDIT: Find all Escape Room related useState declarations
# ====================================================================
print("\n=== ESCAPE ROOM useState DECLARATIONS ===")
escape_states = []
for i, line in enumerate(lines):
    if 'useState' in line and ('escape' in line.lower() or 'Escape' in line):
        stripped = line.strip()
        escape_states.append((i+1, stripped[:140]))
        print(f"  L{i+1}: {stripped[:140]}")

# Find all escape room related state setters
print("\n=== ESCAPE ROOM setState CALLS (count) ===")
escape_setters = {}
for i, line in enumerate(lines):
    if 'setEscape' in line:
        # Extract the setter name
        import re
        matches = re.findall(r'setEscape\w+', line)
        for m in matches:
            escape_setters[m] = escape_setters.get(m, 0) + 1

for name, count in sorted(escape_setters.items()):
    print(f"  {name}: {count} calls")

# Also find the escape room component
print("\n=== ESCAPE ROOM COMPONENTS ===")
for i, line in enumerate(lines):
    if 'EscapeRoom' in line and ('const ' in line or 'function ' in line):
        print(f"  L{i+1}: {line.strip()[:140]}")
    if 'StudentEscapeRoomOverlay' in line and ('const ' in line or 'React.memo' in line):
        print(f"  L{i+1}: {line.strip()[:140]}")

# Write fixed file
f = open(FILE, 'w', encoding='utf-8')
f.write(''.join(lines))
f.close()

print(f"\n{len(changes)} fixes applied. Lines: {original} -> {len(lines)}")
