"""Quick check for remaining duplicate const handler declarations."""
import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

handler_locations = {}
for i, line in enumerate(lines):
    m = re.match(r'\s*const\s+(handle\w+)\s*=', line)
    if m:
        name = m.group(1)
        if name not in handler_locations:
            handler_locations[name] = []
        handler_locations[name].append(i + 1)

dups = {k: v for k, v in handler_locations.items() if len(v) > 1}

with open('dup_check.txt', 'w', encoding='utf-8') as f:
    f.write(f"Total unique handler names: {len(handler_locations)}\n")
    f.write(f"Handlers with duplicate declarations: {len(dups)}\n")
    for name, locs in sorted(dups.items()):
        f.write(f"  {name}: lines {locs}\n")

print(f"Duplicates: {len(dups)} - written to dup_check.txt")
