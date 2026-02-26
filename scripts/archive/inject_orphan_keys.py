"""
Inject missing UI_STRINGS keys into AlloFlowANTI.txt
Strategy: Find each top-level section in UI_STRINGS and append missing keys there.
For sections that don't exist, create them at the end of UI_STRINGS.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

# === Find UI_STRINGS block ===
ui_start = ui_end = None
brace_depth = 0
for i, line in enumerate(lines):
    if 'const UI_STRINGS' in line and '{' in line:
        ui_start = i
        brace_depth = line.count('{') - line.count('}')
        continue
    if ui_start is not None and ui_end is None:
        brace_depth += line.count('{') - line.count('}')
        if brace_depth <= 0:
            ui_end = i
            break

print(f"UI_STRINGS: lines {ui_start+1} to {ui_end+1}")

# === Extract defined keys ===
defined_keys = set()
key_stack = []
for i in range(ui_start, ui_end + 1):
    line = lines[i].strip()
    if line.startswith('//') or line.startswith('/*') or line.startswith('*'):
        continue
    open_match = re.match(r"(\w+)\s*:\s*\{", line)
    if open_match:
        key_stack.append(open_match.group(1))
        continue
    val_match = re.match(r"(\w+)\s*:\s*['\"`]", line)
    if val_match:
        full_key = '.'.join(key_stack + [val_match.group(1)])
        defined_keys.add(full_key)
        continue
    if line.startswith('}') or line == '},':
        if key_stack:
            key_stack.pop()

# === Collect real orphan t() calls with their fallback strings ===
orphans = {}

for i, line in enumerate(lines):
    if ui_start <= i <= ui_end:
        continue
    
    # t('key', 'fallback') or t('key')
    for match in re.finditer(r"""\bt\(\s*['"]([a-zA-Z_][a-zA-Z0-9_.]+)['"](?:\s*,\s*['"]([^'"]*?)['"])?\s*[,)]""", line):
        key = match.group(1)
        fallback = match.group(2)
        start_pos = match.start()
        prefix = line[:start_pos].rstrip()
        if prefix.endswith('.') or 'createElement(' in prefix:
            continue
        if len(key) <= 2 and '.' not in key:
            continue
        if key.startswith('allo_'):
            continue
        if key not in defined_keys and key not in orphans:
            orphans[key] = fallback
    
    # ts('key', 'fallback') or ts('key')
    for match in re.finditer(r"""\bts\(\s*['"]([a-zA-Z_][a-zA-Z0-9_.]+)['"](?:\s*,\s*['"]([^'"]*?)['"])?\s*[,)]""", line):
        key = match.group(1)
        fallback = match.group(2)
        start_pos = match.start()
        prefix = line[:start_pos].rstrip()
        if prefix.endswith('.'):
            continue
        if key not in defined_keys and key not in orphans:
            orphans[key] = fallback

# Also check for || "fallback" patterns like: ts('key') || 'Fallback Text'
for i, line in enumerate(lines):
    if ui_start <= i <= ui_end:
        continue
    for match in re.finditer(r"""\bts?\(\s*['"]([a-zA-Z_][a-zA-Z0-9_.]+)['"]\s*\)\s*\|\|\s*['"]([^'"]+)['"]""", line):
        key = match.group(1)
        fallback = match.group(2)
        if key in orphans and not orphans[key]:
            orphans[key] = fallback

print(f"Orphans to fix: {len(orphans)}")

# === Group by top-level section ===
groups = {}
for key, fb in orphans.items():
    parts = key.split('.')
    top = parts[0]
    if top not in groups:
        groups[top] = {}
    # Build nested sub-path
    sub_path = '.'.join(parts[1:]) if len(parts) > 1 else key
    leaf = parts[-1]
    groups[top][key] = (sub_path, leaf, fb)

# === Find insertion points for each section ===
# For each top-level section, find the LAST line before its closing brace
section_positions = {}
current_section = None
section_brace_depth = 0

for i in range(ui_start, ui_end + 1):
    line = lines[i].strip()
    if line.startswith('//') or line.startswith('/*') or line.startswith('*'):
        continue
    
    # Top-level section opening
    if section_brace_depth == 0:
        m = re.match(r"(\w+)\s*:\s*\{", line)
        if m:
            current_section = m.group(1)
            section_brace_depth = line.count('{') - line.count('}')
            if section_brace_depth == 0:
                # One-liner section
                section_positions[current_section] = i
                current_section = None
            continue
    
    if current_section:
        section_brace_depth += line.count('{') - line.count('}')
        if section_brace_depth <= 0:
            # This is the closing brace of the section
            section_positions[current_section] = i  # Insert BEFORE this line
            current_section = None
            section_brace_depth = 0

print(f"Found {len(section_positions)} existing sections")

# === Build patches ===
# For each group, we either insert into an existing section or create a new one
insertions = []  # (line_index, text_to_insert)

for top, keys_dict in sorted(groups.items()):
    if top in section_positions:
        # Insert before the closing brace of this section
        insert_at = section_positions[top]
        new_lines = []
        
        # Group by sub-section (e.g., export.storybook.* goes under storybook: {})
        sub_groups = {}
        for key, (sub_path, leaf, fb) in sorted(keys_dict.items()):
            parts = sub_path.split('.')
            if len(parts) > 1:
                sub_key = parts[0]
                if sub_key not in sub_groups:
                    sub_groups[sub_key] = []
                sub_groups[sub_key].append((parts[-1], fb, key))
            else:
                if '__flat__' not in sub_groups:
                    sub_groups['__flat__'] = []
                sub_groups['__flat__'].append((leaf, fb, key))
        
        new_lines.append(f"        // --- ORPHAN FIX: {len(keys_dict)} missing {top}.* keys ---")
        
        for sub_key, items in sorted(sub_groups.items()):
            if sub_key == '__flat__':
                for leaf, fb, full_key in items:
                    val = fb if fb else leaf.replace('_', ' ').title()
                    val = val.replace("'", "\\'")
                    new_lines.append(f"        {leaf}: '{val}',")
            else:
                # Check if sub-section already exists
                sub_section_key = f"{top}.{sub_key}"
                # Check if ANY key with this prefix exists in defined_keys
                sub_exists = any(k.startswith(sub_section_key + '.') for k in defined_keys)
                
                if not sub_exists:
                    new_lines.append(f"        {sub_key}: {{")
                    for leaf, fb, full_key in items:
                        val = fb if fb else leaf.replace('_', ' ').title()
                        val = val.replace("'", "\\'")
                        new_lines.append(f"            {leaf}: '{val}',")
                    new_lines.append(f"        }},")
                else:
                    # Sub-section exists, add flat keys
                    for leaf, fb, full_key in items:
                        val = fb if fb else leaf.replace('_', ' ').title()
                        val = val.replace("'", "\\'")
                        new_lines.append(f"        {leaf}: '{val}', // {full_key}")
        
        insertions.append((insert_at, '\n'.join(new_lines)))
    else:
        # Create new section
        new_lines = [f"    {top}: {{"]
        for key, (sub_path, leaf, fb) in sorted(keys_dict.items()):
            val = fb if fb else leaf.replace('_', ' ').title()
            val = val.replace("'", "\\'")
            new_lines.append(f"        {leaf}: '{val}',")
        new_lines.append(f"    }},")
        # Insert before UI_STRINGS closing brace
        insertions.append((ui_end, '\n'.join(new_lines)))

# Sort insertions from bottom to top to avoid line shift issues
insertions.sort(key=lambda x: x[0], reverse=True)

# Apply insertions
for insert_at, text in insertions:
    lines.insert(insert_at, text)

# Write result
with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print(f"\nApplied {len(insertions)} patches ({len(orphans)} keys added)")
print("File saved.")
