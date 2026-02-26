"""
Build patch: Extract fallback strings from orphan t() calls and generate 
UI_STRINGS entries to add.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# === Find UI_STRINGS block end ===
ui_start = ui_end = None
brace_depth = 0
for i, line in enumerate(lines, 1):
    if 'const UI_STRINGS' in line and '{' in line:
        ui_start = i
        brace_depth = line.count('{') - line.count('}')
        continue
    if ui_start and not ui_end:
        brace_depth += line.count('{') - line.count('}')
        if brace_depth <= 0:
            ui_end = i
            break

# === Extract defined keys ===
defined_keys = set()
key_stack = []
for i in range(ui_start - 1, ui_end):
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

# === Extract orphan t() calls with fallback values ===
orphans = {}  # key -> (line_num, fallback_or_context)

for i, line in enumerate(lines, 1):
    if ui_start <= i <= ui_end:
        continue
    
    # Match t('key', 'fallback') or t('key') with surrounding context
    for match in re.finditer(r"""\bt\(\s*['"]([a-zA-Z_][a-zA-Z0-9_.]+)['"](?:\s*,\s*['"]([^'"]*?)['"])?\s*\)""", line):
        key = match.group(1)
        fallback = match.group(2)
        start_pos = match.start()
        prefix = line[:start_pos].rstrip()
        
        if prefix.endswith('.'):
            continue
        if 'createElement(' in prefix:
            continue
        if prefix.endswith('Event(') or prefix.endswith('new Event('):
            continue
        if len(key) <= 2 and '.' not in key:
            continue
        if key.startswith('allo_'):
            continue
            
        if key not in defined_keys and key not in orphans:
            orphans[key] = (i, fallback, line.strip()[:120])
    
    # Also check ts() 
    for match in re.finditer(r"""\bts\(\s*['"]([a-zA-Z_][a-zA-Z0-9_.]+)['"](?:\s*,\s*['"]([^'"]*?)['"])?\s*\)""", line):
        key = match.group(1)
        fallback = match.group(2)
        start_pos = match.start()
        prefix = line[:start_pos].rstrip()
        if prefix.endswith('.'):
            continue
        if key not in defined_keys and key not in orphans:
            orphans[key] = (i, fallback, line.strip()[:120])

# === Group by top-level key and generate UI_STRINGS entries ===
groups = {}
for key, (ln, fb, ctx) in sorted(orphans.items()):
    parts = key.split('.')
    top = parts[0]
    if top not in groups:
        groups[top] = []
    groups[top].append((key, ln, fb, ctx))

# Generate the entries
output = []
output.append(f"// Total orphan keys to add: {len(orphans)}")
output.append(f"// Grouped by {len(groups)} top-level categories\n")

for top, items in sorted(groups.items()):
    output.append(f"// === {top} ({len(items)} keys) ===")
    for key, ln, fb, ctx in items:
        parts = key.split('.')
        leaf = parts[-1]
        
        # Try to derive a sensible default value
        if fb:
            value = fb
        else:
            # Convert key to readable text: 'spelling_bee_title' -> 'Spelling Bee Title'
            readable = leaf.replace('_', ' ').title()
            value = readable
        
        # Show as: key: "value", // L{ln} — context
        output.append(f'    // L{ln}: {ctx[:80]}')
        value_escaped = value.replace('"', '\\"')
        output.append(f'    {leaf}: "{value_escaped}",')
    output.append("")

with open('orphan_keys_patch.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output))
print(f"Generated {len(orphans)} entries in orphan_keys_patch.txt")

# Also print summary
print(f"\nBy category:")
for top, items in sorted(groups.items(), key=lambda x: -len(x[1])):
    has_fb = sum(1 for _, _, fb, _ in items if fb)
    print(f"  {top}: {len(items)} keys ({has_fb} with fallbacks, {len(items)-has_fb} need manual text)")
