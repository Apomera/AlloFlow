"""
Help Coverage Gap Audit
Finds:
1. data-help-key values with NO matching HELP_STRINGS entry (dead clicks)
2. HELP_STRINGS entries with NO matching data-help-key usage (orphan strings)
3. data-help-key values that also have localized t('help_mode.KEY') coverage
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()
    lines = content.split('\n')

# 1. Extract all data-help-key values
data_keys = set()
data_key_lines = {}  # key -> [line numbers]
for i, line in enumerate(lines):
    for m in re.finditer(r'data-help-key="([^"]+)"', line):
        key = m.group(1)
        data_keys.add(key)
        data_key_lines.setdefault(key, []).append(i + 1)

# 2. Extract all HELP_STRINGS keys
help_strings_keys = set()
in_help_strings = False
brace_depth = 0
for i, line in enumerate(lines):
    if 'const HELP_STRINGS = {' in line:
        in_help_strings = True
        brace_depth = 1
        continue
    if in_help_strings:
        brace_depth += line.count('{') - line.count('}')
        if brace_depth <= 0:
            break
        # Match keys: 'key': or key:
        m = re.match(r"\s*(?:'([^']+)'|(\w+))\s*:", line)
        if m:
            key = m.group(1) or m.group(2)
            if key and key != '//' and not key.startswith('//'):
                help_strings_keys.add(key)

# 3. Find gaps
dead_clicks = data_keys - help_strings_keys  # In DOM, not in HELP_STRINGS
orphan_strings = help_strings_keys - data_keys  # In HELP_STRINGS, not in DOM

# 4. Check if dead clicks might have localized coverage via t('help_mode.KEY')
localized_keys = set()
for m in re.finditer(r"t\('help_mode\.([^']+?)'\)", content):
    localized_keys.add(m.group(1))

# Separate dead clicks into truly dead vs potentially localized
truly_dead = []
localized_fallback = []
for key in sorted(dead_clicks):
    if key in localized_keys or key + '_title' in localized_keys:
        localized_fallback.append(key)
    else:
        truly_dead.append(key)

# Also check tour step coverage (tier 2 fallback)
tour_keys = set()
for m in re.finditer(r"id:\s*'([^']+)'", content):
    tour_keys.add(m.group(1))

tour_covered = [k for k in truly_dead if k in tour_keys]
truly_dead_final = [k for k in truly_dead if k not in tour_keys]

# Output
out = open('help_gap_audit.txt', 'w', encoding='utf-8')

out.write("=" * 80 + "\n")
out.write("HELP COVERAGE GAP AUDIT\n")
out.write("=" * 80 + "\n\n")
out.write(f"Total data-help-key values in DOM: {len(data_keys)}\n")
out.write(f"Total HELP_STRINGS entries:        {len(help_strings_keys)}\n\n")

out.write("-" * 80 + "\n")
out.write(f"DEAD CLICKS ({len(truly_dead_final)}) — data-help-key in DOM but NO help text anywhere\n")
out.write("Users click these in help mode and NOTHING happens.\n")
out.write("-" * 80 + "\n")
for key in sorted(truly_dead_final):
    locs = data_key_lines.get(key, [])
    loc_str = ', '.join(f'L{l}' for l in locs[:3])
    if len(locs) > 3:
        loc_str += f' (+{len(locs)-3} more)'
    out.write(f"  {key:55s} @ {loc_str}\n")

out.write(f"\n")
out.write("-" * 80 + "\n")
out.write(f"TOUR-COVERED ({len(tour_covered)}) — no HELP_STRINGS but matched a tour step ID\n")
out.write("These fall through to tour text (Tier 2 fallback).\n")
out.write("-" * 80 + "\n")
for key in sorted(tour_covered):
    out.write(f"  {key}\n")

out.write(f"\n")
out.write("-" * 80 + "\n")
out.write(f"LOCALIZED ({len(localized_fallback)}) — no HELP_STRINGS but has t('help_mode.KEY')\n")
out.write("These get text from translations, so they work if locale is loaded.\n")
out.write("-" * 80 + "\n")
for key in sorted(localized_fallback):
    out.write(f"  {key}\n")

out.write(f"\n")
out.write("-" * 80 + "\n")
out.write(f"ORPHAN STRINGS ({len(orphan_strings)}) — HELP_STRINGS entry but no data-help-key in DOM\n")
out.write("These strings exist but no element references them.\n")
out.write("-" * 80 + "\n")
for key in sorted(orphan_strings):
    out.write(f"  {key}\n")

out.close()
print(f"Wrote help_gap_audit.txt")
print(f"\nSummary:")
print(f"  Dead clicks (nothing happens):  {len(truly_dead_final)}")
print(f"  Tour-covered fallback:          {len(tour_covered)}")
print(f"  Localized (t() coverage):       {len(localized_fallback)}")
print(f"  Orphan strings (unused):        {len(orphan_strings)}")
print("DONE")
