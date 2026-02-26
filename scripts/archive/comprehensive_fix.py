"""
Direct line removal of injection artifacts.
Based on the brace audit, these are the specific ranges to remove:

Zone 1: L17376-17399 (organizer, quick_start, move_up, move_down blocks INSIDE adventure)
Zone 2: L17400-17507 (duplicate export block inside adventure)
Zone 3: L17594-17664 (blocks inside cleanJson function)
Zone 4: L17667-17693 (more blocks inside cleanJson)

After removal, add move_up and move_down as flat keys at the top-level.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Starting: {len(lines)} lines")

# View the content at each zone boundary to confirm
zones_to_check = [
    (17376, 17399, "organizer/quick_start/move_up/move_down"),
    (17400, 17507, "duplicate export block"),
]

for start, end, desc in zones_to_check:
    print(f"\n--- Zone {desc}: L{start}-L{end} ---")
    print(f"  Start: {lines[start-1].strip()[:60]}")
    print(f"  End:   {lines[end-1].strip()[:60]}")

# Step 1: Remove Zone 1 (L17376-17399) and Zone 2 (L17400-17507)
# These are all inside the adventure section and shouldn't be
remove_ranges = set()

# Zone 1: organizer, quick_start, move_up, move_down (L17376-17399)
for i in range(17375, 17399):  # 0-indexed
    remove_ranges.add(i)

# Zone 2: duplicate export block (L17400-17507)
for i in range(17399, 17507):  # 0-indexed  
    remove_ranges.add(i)

# Zone 3: blocks inside cleanJson (L17594-17664)
# Need to re-check line numbers after zone 1+2 removal
# For now, let's do zone 1+2 first and see the result

new_lines = [line for i, line in enumerate(lines) if i not in remove_ranges]
removed = len(lines) - len(new_lines)
print(f"\nPhase 1: Removed {removed} lines (zones 1+2)")

# Save and then re-analyze
with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Intermediate: {len(new_lines)} lines")

# Now find cleanJson and remove injected blocks there
# Re-read the file
with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find cleanJson function
clean_json_start = None
for i, line in enumerate(lines):
    if 'const cleanJson' in line:
        clean_json_start = i
        break

if clean_json_start:
    print(f"\ncleanJson found at L{clean_json_start+1}")
    
    # Walk through cleanJson and find injection artifacts
    # These are lines that look like: key: { ... } or key: 'value',
    # that appear between JS code lines
    import re
    
    remove_set = set()
    in_function = False
    func_depth = 0
    
    for i in range(clean_json_start, min(clean_json_start + 200, len(lines))):
        s = lines[i].strip()
        
        if not in_function:
            if '{' in s:
                in_function = True
                func_depth = s.count('{') - s.count('}')
            continue
        
        func_depth += s.count('{') - s.count('}')
        
        if func_depth <= 0:
            break
        
        # Check if this looks like an injected localization block
        m = re.match(r'^\s+(\w+):\s*\{', s)
        if m:
            key = m.group(1)
            # These are known injected section names
            if key in ('socratic', 'quick_start', 'project_settings', 'profiles',
                       'mastery', 'languages_list', 'hints', 'grades', 'grades_short',
                       'fluency', 'chat_guide', 'cancel', 'blueprint', 'about',
                       'student_dashboard', 'prompts', 'error', 'chat', 'bot',
                       'toolbar', 'organizer', 'export'):
                # Mark this block for removal
                block_depth = s.count('{') - s.count('}')
                remove_set.add(i)
                j = i + 1
                while j < len(lines) and block_depth > 0:
                    block_depth += lines[j].count('{') - lines[j].count('}')
                    remove_set.add(j)
                    j += 1
                print(f"  Removing injected block '{key}' L{i+1}-L{j}")
                continue
        
        # Check for flat injected keys (not JS variables)
        m = re.match(r"^\s+(\w+):\s*'[^']*'", s)
        if m:
            key = m.group(1)
            if key not in ('cleaned', 'startIdx', 'endIdx', 'text', 'result',
                           'firstBrace', 'firstBracket', 'repaired'):
                # This is likely an injected key
                remove_set.add(i)
                print(f"  Removing injected flat key '{key}' at L{i+1}")
    
    if remove_set:
        new_lines2 = [line for i, line in enumerate(lines) if i not in remove_set]
        removed2 = len(lines) - len(new_lines2)
        print(f"\nPhase 2: Removed {removed2} lines from cleanJson")
        
        with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
            f.writelines(new_lines2)
        
        print(f"Final: {len(new_lines2)} lines")
    else:
        print("\nNo injected blocks found in cleanJson")
        print(f"Final: {len(lines)} lines")
else:
    print("cleanJson not found!")
    print(f"Final: {len(lines)} lines")
