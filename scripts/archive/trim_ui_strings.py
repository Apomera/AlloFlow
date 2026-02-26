"""
Find and remove unused UI_STRINGS sections — Tier 3.
Uses string-aware brace counting to handle help text containing { }.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

original_count = len(lines)
print(f"Starting: {original_count} lines")

def find_section_range(section_name, lines):
    """Find a top-level UI_STRINGS section using string-aware brace counting."""
    for i, line in enumerate(lines):
        # Match section_name: { at depth 1 (inside UI_STRINGS)
        stripped = line.strip()
        if re.match(r'^' + re.escape(section_name) + r'\s*:\s*\{', stripped):
            # Found section start — now count braces with string awareness
            depth = 0
            for j in range(i, min(i + 5000, len(lines))):
                in_str = None
                escape = False
                for ch in lines[j]:
                    if escape:
                        escape = False
                        continue
                    if ch == '\\':
                        if in_str:
                            escape = True
                        continue
                    if ch in ('"', "'", '`'):
                        if in_str is None:
                            in_str = ch
                        elif in_str == ch:
                            in_str = None
                        continue
                    if in_str:
                        continue
                    if ch == '{':
                        depth += 1
                    elif ch == '}':
                        depth -= 1
                        if depth == 0:
                            return (i, j)  # (start, end) 0-indexed inclusive
                if depth == 0 and j > i:
                    return (i, j)
            print(f"  !! {section_name} section didn't close (depth={depth})")
            return None
    return None

# === STEP 1: Find help_mode section ===
result = find_section_range('help_mode', lines)
if result:
    hm_start, hm_end = result
    hm_size = hm_end - hm_start + 1
    print(f"help_mode: L{hm_start+1}-L{hm_end+1} ({hm_size} lines)")
    
    # Find the activate and deactivate lines
    activate_line = None
    deactivate_line = None
    for k in range(hm_start, hm_end + 1):
        s = lines[k].strip()
        if s.startswith('activate:'):
            activate_line = k
        elif s.startswith('deactivate:'):
            deactivate_line = k
    
    if activate_line:
        print(f"  activate at L{activate_line+1}")
    if deactivate_line:
        print(f"  deactivate at L{deactivate_line+1}")
    
    # Strategy: Keep only activate and deactivate, remove everything else
    # Rebuild the section with just those 2 keys
    new_section = [
        lines[hm_start],  # help_mode: {
        lines[activate_line] if activate_line else "    activate: 'Turn on Help Mode',\n",
        lines[deactivate_line] if deactivate_line else "    deactivate: 'Turn off Help Mode',\n",
    ]
    
    # Check if closing brace has trailing comma
    closing = lines[hm_end].strip()
    if closing == '},' or closing == '}':
        new_section.append(lines[hm_end])
    else:
        new_section.append('  },\n')
    
    lines_saved = hm_size - len(new_section)
    print(f"  Keeping {len(new_section)} lines, removing {lines_saved}")
    
    # Replace the section
    lines[hm_start:hm_end + 1] = new_section
    print(f"  help_mode trimmed: {hm_size} -> {len(new_section)} lines")
else:
    print("help_mode section NOT FOUND")

# After help_mode trimming, check new line count
print(f"\nAfter help_mode trim: {len(lines)} lines (removed {original_count - len(lines)})")

# === STEP 2: Find other large unused sections ===
# From our parity check, these sections have many unused keys:
# adventure: 258, quiz: 122, escape_room: 66, toasts: 55, games: 43
# But these are mixed (some keys used, some not). Only remove ENTIRE section if ALL keys unused.
# For safety, let's only trim help_mode in this pass.

# === STEP 3: Write and validate ===
with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

final_count = len(lines)
total_removed = original_count - final_count
print(f"\n=== SUMMARY ===")
print(f"Original: {original_count} lines")
print(f"Final: {final_count} lines")
print(f"Removed: {total_removed} lines")

# Validate
print("\nValidating UI_STRINGS structure...")
depth = 0
ui_found = False
for i, line in enumerate(lines):
    if 'const UI_STRINGS' in line and '{' in line:
        ui_found = True
    if not ui_found:
        continue
    
    in_str = None
    escape = False
    for ch in line:
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
                print(f"  UI_STRINGS closes at L{i+1} — BALANCED ✅")
                ui_found = False
                break
    if not ui_found:
        break

if ui_found:
    print(f"  !! UNBALANCED — depth={depth} ❌")
