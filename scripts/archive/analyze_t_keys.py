"""
Deep analysis of unresolved t() keys.
Determines whether they're:
1. Parser limitation (key exists but was missed by shallow parsing)
2. Actually missing from UI_STRINGS
3. Dynamic keys that shouldn't be checked
"""
import sys, re, json
from collections import Counter, defaultdict
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()
    content = ''.join(lines)

# ============================================================
# STEP 1: Find UI_STRINGS boundaries
# ============================================================
ui_start = ui_end = None
for i, line in enumerate(lines):
    if 'const UI_STRINGS' in line and '{' in line:
        ui_start = i
        break

if ui_start:
    depth = 0
    in_str = None
    escape = False
    for i in range(ui_start, len(lines)):
        for ch in lines[i]:
            if escape: escape = False; continue
            if ch == '\\':
                if in_str: escape = True
                continue
            if ch in ('"', "'", '`'):
                if in_str is None: in_str = ch
                elif in_str == ch: in_str = None
                continue
            if in_str: continue
            if ch == '{': depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    ui_end = i
                    break
        if ui_end: break

print(f"UI_STRINGS: L{ui_start+1}-L{ui_end+1} ({ui_end-ui_start+1} lines)")

# ============================================================
# STEP 2: Extract ALL keys at ALL nesting levels
# ============================================================
ui_block = ''.join(lines[ui_start:ui_end+1])

# More robust key extraction using indentation tracking
all_ui_keys = set()
path_stack = []
prev_indent = -1

for i in range(ui_start + 1, ui_end):
    line = lines[i]
    stripped = line.rstrip()
    if not stripped.strip():
        continue
    
    # Calculate indentation (number of leading spaces)
    indent = len(line) - len(line.lstrip())
    
    # Check if this is a closing brace
    if stripped.strip().startswith('}'):
        if path_stack:
            path_stack.pop()
        continue
    
    # Check if this is a key definition
    # Match: key: { (section opener) or key: "value", or key: 'value',
    m_section = re.match(r'^(\s+)(\w+)\s*:\s*\{', line)
    m_leaf = re.match(r'^(\s+)(\w+)\s*:\s*["\']', line)
    m_leaf_template = re.match(r'^(\s+)(\w+)\s*:\s*`', line)
    
    if m_section:
        key = m_section.group(2)
        key_indent = len(m_section.group(1))
        # Pop stack until we're at the right level
        while path_stack and path_stack[-1][1] >= key_indent:
            path_stack.pop()
        path_stack.append((key, key_indent))
        # Also register the path itself (some t() calls reference sections)
        full_path = '.'.join(p[0] for p in path_stack)
        all_ui_keys.add(full_path)
    elif m_leaf or m_leaf_template:
        m = m_leaf or m_leaf_template
        key = m.group(2)
        key_indent = len(m.group(1))
        # Pop stack until parent
        while path_stack and path_stack[-1][1] >= key_indent:
            path_stack.pop()
        full_path = '.'.join(p[0] for p in path_stack) + '.' + key if path_stack else key
        all_ui_keys.add(full_path)

print(f"Extracted {len(all_ui_keys)} unique key paths from UI_STRINGS")

# ============================================================
# STEP 3: Extract all t() calls
# ============================================================
t_calls_raw = re.findall(r"""\bt\(\s*['"]([^'"]+)['"]\s*\)""", content)
t_calls_raw += re.findall(r"""\bt\(\s*`([^`$]+)`\s*\)""", content)

# Filter to static dotted keys only
static_keys = set(k for k in t_calls_raw if '.' in k and '${' not in k and '+' not in k and ' ' not in k)
print(f"Found {len(static_keys)} unique static t() keys")

# ============================================================
# STEP 4: Find unresolved
# ============================================================
resolved = static_keys & all_ui_keys
unresolved = static_keys - all_ui_keys

print(f"\nResolved: {len(resolved)}")
print(f"Unresolved: {len(unresolved)}")

# ============================================================
# STEP 5: Categorize unresolved by section
# ============================================================
sections = defaultdict(list)
for key in sorted(unresolved):
    parts = key.split('.')
    section = parts[0] if parts else 'unknown'
    sections[section].append(key)

print(f"\n{'='*60}")
print("UNRESOLVED KEYS BY SECTION")
print(f"{'='*60}")
for section in sorted(sections.keys()):
    keys = sections[section]
    print(f"\n📁 {section} ({len(keys)} keys)")
    for k in keys[:5]:
        print(f"   {k}")
    if len(keys) > 5:
        print(f"   ... and {len(keys)-5} more")

# ============================================================
# STEP 6: Check if they exist as raw strings in UI_STRINGS
# ============================================================
# Some keys might exist but our parser missed them
# Do a brute-force string search
false_negatives = []
truly_missing = []
for key in sorted(unresolved):
    # The leaf key (last segment) should appear in UI_STRINGS
    leaf = key.split('.')[-1]
    # Search for this leaf key definition in UI_STRINGS block
    pattern = re.compile(r'^\s+' + re.escape(leaf) + r'\s*:', re.MULTILINE)
    found_in_ui = False
    for i in range(ui_start, ui_end+1):
        if pattern.search(lines[i]):
            found_in_ui = True
            break
    if found_in_ui:
        false_negatives.append(key)
    else:
        truly_missing.append(key)

print(f"\n{'='*60}")
print("DIAGNOSIS")
print(f"{'='*60}")
print(f"Parser false negatives (key exists, parser missed path): {len(false_negatives)}")
print(f"Truly missing (leaf key not found anywhere in UI_STRINGS): {len(truly_missing)}")

# Save detailed results
with open('t_key_analysis.txt', 'w', encoding='utf-8') as f:
    f.write(f"UI_STRINGS keys extracted: {len(all_ui_keys)}\n")
    f.write(f"Static t() calls: {len(static_keys)}\n")
    f.write(f"Resolved: {len(resolved)}\n")
    f.write(f"Unresolved: {len(unresolved)}\n")
    f.write(f"Parser false negatives: {len(false_negatives)}\n")
    f.write(f"Truly missing: {len(truly_missing)}\n\n")
    
    f.write("=== TRULY MISSING KEYS ===\n")
    for section in sorted(set(k.split('.')[0] for k in truly_missing)):
        keys = [k for k in truly_missing if k.startswith(section + '.')]
        f.write(f"\n{section} ({len(keys)} keys):\n")
        for k in keys:
            f.write(f"  {k}\n")
    
    f.write("\n=== PARSER FALSE NEGATIVES (key exists but path wasn't traced) ===\n")
    for section in sorted(set(k.split('.')[0] for k in false_negatives)):
        keys = [k for k in false_negatives if k.startswith(section + '.')]
        f.write(f"\n{section} ({len(keys)} keys):\n")
        for k in keys:
            f.write(f"  {k}\n")

print(f"\nDetailed results saved to t_key_analysis.txt")
