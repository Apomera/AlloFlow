"""
Cross-reference all t() keys against UI_STRINGS definitions.
Find the UI_STRINGS object, extract all defined keys, then report which t() keys are missing.
"""
import re

FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
content = f.read()
f.close()

lines = content.split('\n')

# 1. Find UI_STRINGS block boundaries
ui_start = None
ui_end = None
brace_count = 0
for i, line in enumerate(lines):
    if 'const UI_STRINGS' in line:
        ui_start = i
        for j in range(i, min(i + 10000, len(lines))):
            for ch in lines[j]:
                if ch == '{': brace_count += 1
                elif ch == '}': brace_count -= 1
            if brace_count == 0 and j > i:
                ui_end = j
                break
        break

print("UI_STRINGS: L" + str(ui_start+1) + " to L" + str(ui_end+1) + " (" + str(ui_end - ui_start) + " lines)")

# 2. Extract all defined keys from UI_STRINGS section
# Build the nested key structure by tracking sections
ui_section = '\n'.join(lines[ui_start:ui_end+1])

# Parse the nested structure to extract dot-notation keys
# Track current path components  
defined_keys = set()
path_stack = []
in_ui = False

for i in range(ui_start, ui_end + 1):
    line = lines[i].strip()
    
    # Skip comments
    if line.startswith('//') or line.startswith('/*'):
        continue
    
    # Match section headers: quiz: {
    section_match = re.match(r"(\w+)\s*:\s*\{", line)
    if section_match and ':' in line and '{' in line:
        key = section_match.group(1)
        if key not in ('const', 'return', 'function', 'if', 'else', 'for', 'while', 'switch', 'case'):
            path_stack.append(key)
    
    # Match leaf keys: key: "value" or key: 'value' or key: `value`
    leaf_match = re.match(r"(\w+)\s*:\s*[\"'`]", line)
    if leaf_match and path_stack:
        leaf_key = leaf_match.group(1)
        full_key = '.'.join(path_stack) + '.' + leaf_key
        defined_keys.add(full_key)
    
    # Check for closing braces (pop stack)
    if line.startswith('}') or line == '},':
        if path_stack:
            path_stack.pop()

# 3. Extract all t() keys used
used_keys = set()
pattern = r"t\(['\"]([^'\"]+)['\"]\)"
for match in re.finditer(pattern, content):
    used_keys.add(match.group(1))

# Also capture t('key') || 'fallback' pattern keys
pattern2 = r"t\(['\"]([^'\"]+)['\"]\)\s*\|\|"
for match in re.finditer(pattern2, content):
    used_keys.add(match.group(1))

# 4. Find missing keys
missing = used_keys - defined_keys
present = used_keys & defined_keys

# Filter out dynamic keys (containing variables)
static_missing = sorted([k for k in missing if not any(c in k for c in ['$', '+', '`'])])

# Group by prefix
groups = {}
for k in static_missing:
    prefix = k.split('.')[0] if '.' in k else 'root'
    if prefix not in groups:
        groups[prefix] = []
    groups[prefix].append(k)

out = open('_missing_keys.txt', 'w', encoding='utf-8')
out.write("Defined keys: " + str(len(defined_keys)) + "\n")
out.write("Used keys: " + str(len(used_keys)) + "\n")
out.write("Present (matched): " + str(len(present)) + "\n")
out.write("Missing (static): " + str(len(static_missing)) + "\n\n")

for prefix in sorted(groups.keys()):
    keys = groups[prefix]
    out.write("=== " + prefix + " (" + str(len(keys)) + " missing) ===\n")
    for k in sorted(keys):
        out.write("  " + k + "\n")
    out.write("\n")

# Also show quiz section specifically
out.write("\n=== QUIZ DEFINED KEYS ===\n")
for k in sorted(defined_keys):
    if k.startswith('quiz.'):
        out.write("  " + k + "\n")

out.close()
print("Done -> _missing_keys.txt")
print("Missing: " + str(len(static_missing)) + " keys")
