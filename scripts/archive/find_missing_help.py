"""
Get the FULL list of what the validator considers missing.
We need to compare the validator's help coverage check results
with what the esbuild warned about.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Same logic as validator Check 5
help_start = help_end = None
lines = content.split('\n')
for i, line in enumerate(lines):
    if 'const HELP_STRINGS' in line and '{' in line:
        help_start = i
        break

if help_start:
    depth = 0
    for i in range(help_start, len(lines)):
        for ch in lines[i]:
            if ch == '{': depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    help_end = i
                    break
        if help_end: break

# Extract help keys
help_keys = set()
if help_start and help_end:
    for i in range(help_start, help_end + 1):
        # Bareword keys
        m = re.match(r'\s+(\w+)\s*:', lines[i])
        if m and m.group(1) not in ('const', 'HELP_STRINGS'):
            help_keys.add(m.group(1))
        # Quoted keys
        m2 = re.match(r"\s+'(\w+)'\s*:", lines[i])
        if m2:
            help_keys.add(m2.group(1))

# Extract data-help-key values
help_attrs = set(re.findall(r'data-help-key="([^"]+)"', content))

missing = sorted(help_attrs - help_keys)
extra = sorted(help_keys - help_attrs)

print(f"HELP_STRINGS: L{help_start+1}-L{help_end+1}")
print(f"  Keys defined: {len(help_keys)}")
print(f"  data-help-key attrs: {len(help_attrs)}")
print(f"  Missing (in code, not in HELP_STRINGS): {len(missing)}")
for k in missing:
    print(f"    {k}")
print(f"  Extra (in HELP_STRINGS, not in code): {len(extra)}")
if extra:
    for k in sorted(extra)[:10]:
        print(f"    {k}")
    if len(extra) > 10:
        print(f"    ... and {len(extra)-10} more")
