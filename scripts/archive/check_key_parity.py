"""
Refined t() ↔ UI_STRINGS parity check.
Filters out false positives by requiring the literal function name `t(` or `ts(`
followed by a string arg, excluding React.createElement, Event, storageDB, etc.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# === Find UI_STRINGS block ===
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

# === Extract REAL t() calls only ===
# Must match: t('key') or t("key") where t is called as a standalone function
# NOT: React.createElement('div'), storageDB.get('key'), Event('name'), etc.
# Pattern: word boundary + t + ( + quote + dotted.key + quote
# Negative lookbehind for . (method call) and for uppercase (class name)

real_orphans = {}
real_used = set()

for i, line in enumerate(lines, 1):
    if ui_start <= i <= ui_end:
        continue
    
    # Find all potential t('key') patterns
    for match in re.finditer(r"""\bt\(\s*['"]([a-zA-Z_][a-zA-Z0-9_.]+)['"]\s*[,)]""", line):
        key = match.group(1)
        start_pos = match.start()
        
        # Check what comes BEFORE the t( — exclude method calls like storageDB.get(
        prefix = line[:start_pos].rstrip()
        
        # Skip if preceded by . (method call like storageDB.get, window.dispatchEvent)
        if prefix.endswith('.'):
            continue
        # Skip if preceded by createElement( (React element creation)
        if 'createElement(' in prefix or 'createElement (' in prefix:
            continue
        # Skip if it's Event('name')
        if prefix.endswith('Event(') or prefix.endswith('new Event('):
            continue
        # Skip if it's a string literal being compared
        if '===' in prefix and prefix.rstrip().endswith("'") :
            continue
        # Skip if single char keys like t('a'), t('T') -- likely not i18n keys
        if len(key) <= 2 and '.' not in key:
            continue
        # Skip storageDB keys
        if key.startswith('allo_'):
            continue
            
        real_used.add(key)
        if key not in defined_keys:
            if key not in real_orphans:
                real_orphans[key] = i

    # Also check ts() calls
    for match in re.finditer(r"""\bts\(\s*['"]([a-zA-Z_][a-zA-Z0-9_.]+)['"]\s*[,)]""", line):
        key = match.group(1)
        start_pos = match.start()
        prefix = line[:start_pos].rstrip()
        if prefix.endswith('.'):
            continue
        real_used.add(key)
        if key not in defined_keys:
            if key not in real_orphans:
                real_orphans[key] = i

# === Print results ===
print(f"UI_STRINGS defined keys: {len(defined_keys)}")
print(f"Real t()/ts() keys (filtered): {len(real_used)}")
print(f"Real orphan keys (WILL SHOW RAW STRINGS): {len(real_orphans)}")
print()

# Group by prefix
prefixes = {}
for key, ln in sorted(real_orphans.items(), key=lambda x: x[0]):
    p = key.split('.')[0]
    if p not in prefixes:
        prefixes[p] = []
    prefixes[p].append((key, ln))

for p, items in sorted(prefixes.items()):
    print(f"[{p}] ({len(items)} keys):")
    for key, ln in items:
        # Show the line content for context
        line_content = lines[ln-1].strip()[:100]
        print(f"  L{ln}: t('{key}')")
        print(f"        {line_content}")
    print()

# === Unused keys ===
unused = defined_keys - real_used
print(f"Unused UI_STRINGS keys (defined but never used): {len(unused)}")
# Show first 30 by prefix
unused_prefixes = {}
for key in sorted(unused):
    p = key.split('.')[0]
    if p not in unused_prefixes:
        unused_prefixes[p] = 0
    unused_prefixes[p] += 1

print("\nBy category:")
for p, count in sorted(unused_prefixes.items(), key=lambda x: -x[1]):
    print(f"  {p}: {count} unused")

print(f"\n{'='*70}")
print(f"SUMMARY")
print(f"{'='*70}")
print(f"Defined:     {len(defined_keys)}")
print(f"Used:        {len(real_used)}")
print(f"ORPHANS:     {len(real_orphans)} ← BROKEN, will show raw key text!")
print(f"Unused:      {len(unused)} ← dead but harmless")
print(f"Match rate:  {len(real_used - set(real_orphans.keys()))}/{len(real_used)} ({100*len(real_used - set(real_orphans.keys()))//max(1,len(real_used))}%)")
