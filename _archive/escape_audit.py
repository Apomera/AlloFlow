"""Full Escape Room state audit - output to file"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

import re
out = open('_escape_audit.txt', 'w', encoding='utf-8')

# 1. All escape-related useState
out.write("=== ESCAPE ROOM useState DECLARATIONS ===\n")
for i, line in enumerate(lines):
    if 'useState' in line and ('escape' in line.lower() or 'Escape' in line):
        out.write(f"  L{i+1}: {line.strip()[:160]}\n")

# 2. All escape-related setState calls with locations
out.write("\n=== ESCAPE ROOM setState CALLS ===\n")
setters = {}
for i, line in enumerate(lines):
    matches = re.findall(r'set(Escape\w+)', line)
    for m in matches:
        key = f'set{m}'
        if key not in setters:
            setters[key] = []
        setters[key].append(i+1)

for name in sorted(setters.keys()):
    locs = setters[name]
    out.write(f"  {name}: {len(locs)} calls at {locs[:10]}{'...' if len(locs) > 10 else ''}\n")

# 3. Escape Room component definitions
out.write("\n=== ESCAPE ROOM COMPONENTS ===\n")
for i, line in enumerate(lines):
    if ('EscapeRoom' in line or 'escapeRoom' in line) and ('const ' in line or 'function ' in line) and ('useState' not in line):
        out.write(f"  L{i+1}: {line.strip()[:160]}\n")

# 4. Direct references to escapeRoomState properties
out.write("\n=== escapeRoomState PROPERTY ACCESS ===\n")
prop_access = {}
for i, line in enumerate(lines):
    matches = re.findall(r'escapeRoomState\.(\w+)', line)
    for m in matches:
        if m not in prop_access:
            prop_access[m] = 0
        prop_access[m] += 1

for prop, count in sorted(prop_access.items(), key=lambda x: -x[1]):
    out.write(f"  .{prop}: {count} refs\n")

# 5. escapeRoomState spread/destructure
out.write("\n=== escapeRoomState SPREADS/DESTRUCTURES ===\n")
for i, line in enumerate(lines):
    if '...escapeRoomState' in line or 'escapeRoomState,' in line:
        out.write(f"  L{i+1}: {line.strip()[:160]}\n")

out.close()
print("Done -> _escape_audit.txt")
