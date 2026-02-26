"""
Fix approach: Instead of line-number-based removal, use content matching.
Remove specific problematic content patterns:
1. Lines with 'climax_archetypes.default:' (dot in key name = invalid JS)
2. Duplicate adventure keys that appear at 8-space indent after system_state
3. Duplicate results keys within the results: {} block
Also add the tooltips.stability entry.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# === Step 1: Find and fix the adventure section ===
# Locate the specific broken patterns

new_lines = []
skip_until_close = False
skip_depth = 0
removed = 0
in_results = False
results_keys_seen = set()
added_tooltips = False

i = 0
while i < len(lines):
    line = lines[i]
    stripped = line.strip()
    
    # Remove the malformed 'climax_archetypes.default:' block (dot in key name)
    if 'climax_archetypes.default:' in stripped and '{' in stripped:
        # Skip this block and its contents until closing brace
        depth = stripped.count('{') - stripped.count('}')
        removed += 1
        i += 1
        while i < len(lines) and depth > 0:
            depth += lines[i].count('{') - lines[i].count('}')
            removed += 1
            i += 1
        continue
    
    # Track if we're inside results: { } to detect duplicates
    if stripped.startswith('results:') and '{' in stripped and i > 14000 and i < 18000:
        in_results = True
        results_keys_seen.clear()
        new_lines.append(line)
        i += 1
        continue
    
    if in_results:
        # Check for duplicate keys within results
        key_match = re.match(r"\s+(\w+):\s*['\"]", stripped)
        if key_match:
            key = key_match.group(1)
            if key in results_keys_seen:
                # Duplicate - skip
                removed += 1
                i += 1
                continue
            results_keys_seen.add(key)
        if stripped.startswith('},') or stripped == '}':
            in_results = False
    
    # Skip duplicate adventure keys that appear at wrong indent after system_state
    # These are 8-space indent keys that duplicate the 4-space entries
    if i > 14000 and i < 18000:
        # Check if this line is a duplicate of a preceding adventure key
        dup_match = re.match(r"        (back_to_resume|fallback_opening|generating_options_audio|"
                            r"interrupted_desc|interrupted_title|paused_desc|paused_title|"
                            r"retry_action|save_reminder|setup_subtitle|start_overwrite|"
                            r"system_simulation|system_state):\s*'", stripped)
        if dup_match:
            # Check if this same key already exists at 4-space indent nearby
            for j in range(max(0, i-30), i):
                prev = lines[j].strip()
                if prev.startswith(dup_match.group(1) + ':') and prev != stripped:
                    # Duplicate at different indent - remove
                    removed += 1
                    i += 1
                    continue
    
    # Add tooltips block after system_state key (only once)
    if (not added_tooltips and 
        '    system_state:' in line and 
        'System State' in line and 
        i > 14000 and i < 18000):
        new_lines.append(line)
        # Check if tooltips already exists in next few lines
        has_tooltips = False
        for j in range(i+1, min(i+5, len(lines))):
            if 'tooltips:' in lines[j]:
                has_tooltips = True
                break
        if not has_tooltips:
            new_lines.append('    tooltips: {\n')
            new_lines.append('        stability: "System Stability",\n')
            new_lines.append('    },\n')
            added_tooltips = True
            print(f"Added tooltips block after L{i+1}")
        i += 1
        continue
    
    new_lines.append(line)
    i += 1

print(f"Removed {removed} lines")
print(f"Added tooltips: {added_tooltips}")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Final line count: {len(new_lines)}")
