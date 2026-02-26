"""Final dup check - minimal output."""
import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find handleCopyToClipboard
for i, line in enumerate(lines):
    if 'handleCopyToClipboard' in line and ('const ' in line or 'function ' in line):
        print(f"DECL L{i+1}: {line.strip()[:120]}")

# Check ALL const handleXxx = React.useCallback for duplicates against const handleXxx = (non-useCallback)
uc_handlers = {}
for i, line in enumerate(lines):
    m = re.match(r'\s*const\s+(handle\w+)\s*=\s*React\.useCallback', line)
    if m:
        name = m.group(1)
        if name not in uc_handlers:
            uc_handlers[name] = []
        uc_handlers[name].append(i+1)

# Find non-useCallback handlers that share names with useCallback ones
for i, line in enumerate(lines):
    m = re.match(r'\s*const\s+(handle\w+)\s*=\s*(?!React\.useCallback)', line)
    if m and m.group(1) in uc_handlers:
        print(f"CONFLICT: {m.group(1)} has useCallback at L{uc_handlers[m.group(1)]} AND regular at L{i+1}")

print(f"Total useCallback handlers in Tier 2 block area: {sum(len(v) for v in uc_handlers.values())}")
print("DONE")
