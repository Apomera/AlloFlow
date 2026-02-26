"""
Clean approach:
1. Remove ALL previously injected ORPHAN FIX blocks and misplaced keys
2. Find the CORRECT insertion points using a careful brace-aware scan 
3. Insert clean keys at the right spots
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Starting line count: {len(lines)}")

# === STEP 1: Remove ALL ORPHAN FIX blocks ===
clean_lines = []
i = 0
removed_orphan = 0
while i < len(lines):
    line = lines[i]
    if '// --- ORPHAN FIX' in line:
        removed_orphan += 1
        # Skip comment and all following key/sub-section lines
        j = i + 1
        while j < len(lines):
            s = lines[j].strip()
            if re.match(r'^\w+:\s*[\'""]', s):
                removed_orphan += 1
                j += 1
            elif re.match(r'^\w+:\s*\{', s):
                depth = s.count('{') - s.count('}')
                removed_orphan += 1
                j += 1
                while j < len(lines) and depth > 0:
                    depth += lines[j].count('{') - lines[j].count('}')
                    removed_orphan += 1
                    j += 1
            else:
                break
        i = j
        continue
    clean_lines.append(line)
    i += 1

print(f"Removed {removed_orphan} ORPHAN FIX lines")

# === STEP 2: Remove ALL inject_final.py artifacts ===
# These are the 13 adventure keys and tooltips block that were misplaced
# Also remove duplicate keys from inject_orphan_v2.py
# We look for specific patterns that shouldn't exist
lines = clean_lines
clean_lines = []
removed_inject = 0

# Find UI_STRINGS boundaries first
ui_start = ui_end = None
bd = 0
for i, line in enumerate(lines):
    if 'const UI_STRINGS' in line and '{' in line:
        ui_start = i
        bd = line.count('{') - line.count('}')
        continue
    if ui_start is not None and ui_end is None:
        bd += line.count('{') - line.count('}')
        if bd <= 0:
            ui_end = i
            break

# Track which keys we've seen in each section to find duplicates
# But this is complex. Instead, let's just search for specific known-bad patterns.

# Remove duplicate adventure entries that were placed between adventure section and grades section
# These appear as flat keys with 4-space indent right before 'grades: {' or after adventure closing
in_adventure = False
adventure_depth = 0
adventure_keys_seen = set()
inside_adventure_section = False

i = 0
while i < len(lines):
    line = lines[i]
    stripped = line.strip()
    
    # Track adventure section
    if stripped.startswith('adventure:') and '{' in stripped and i > 11000 and i < 18000:
        inside_adventure_section = True
        adventure_depth = stripped.count('{') - stripped.count('}')
        adventure_keys_seen.clear()
        clean_lines.append(line)
        i += 1
        continue
    
    if inside_adventure_section:
        adventure_depth += stripped.count('{') - stripped.count('}')
        
        # Track flat keys at adventure level (4-space indent)
        key_match = re.match(r'^    (\w+):\s*[\'"]', line)
        if key_match:
            key = key_match.group(1)
            if key in adventure_keys_seen:
                removed_inject += 1
                i += 1
                continue  # Skip duplicate
            adventure_keys_seen.add(key)
        
        if adventure_depth <= 0:
            inside_adventure_section = False
    
    clean_lines.append(line)
    i += 1

print(f"Removed {removed_inject} duplicate adventure keys")

# === STEP 3: Now add the truly missing keys properly ===
lines = clean_lines

# Re-find UI_STRINGS
ui_start = ui_end = None
bd = 0
for i, line in enumerate(lines):
    if 'const UI_STRINGS' in line and '{' in line:
        ui_start = i
        bd = line.count('{') - line.count('}')
        continue
    if ui_start is not None and ui_end is None:
        bd += line.count('{') - line.count('}')
        if bd <= 0:
            ui_end = i
            break

print(f"UI_STRINGS: L{ui_start+1} to L{ui_end+1} ({ui_end - ui_start + 1} lines)")

# Extract currently defined keys with robust parser
defined_keys = set()
path_stack = []
in_comment = False

for i in range(ui_start, ui_end + 1):
    line = lines[i]
    stripped = line.strip()
    if '/*' in stripped: in_comment = True
    if '*/' in stripped: in_comment = False; continue
    if in_comment or stripped.startswith('//'): continue
    
    m = re.match(r'^[\s]*"?(\w+)"?\s*:\s*\{', stripped)
    if m:
        path_stack.append(m.group(1))
        if stripped.count('}') >= stripped.count('{'):
            path_stack.pop()
        continue
    
    m = re.match(r'^[\s]*"?(\w+)"?\s*:\s*[\'"`]', stripped)
    if m:
        full_key = '.'.join(path_stack + [m.group(1)])
        defined_keys.add(full_key)
        continue
    
    close_count = stripped.count('}') - stripped.count('{')
    for _ in range(close_count):
        if path_stack: path_stack.pop()

print(f"Defined keys after cleanup: {len(defined_keys)}")

# Find what's still needed
all_needed = {
    # Adventure flat keys
    'adventure.back_to_resume': 'Back to Resume',
    'adventure.fallback_opening': 'Your adventure begins in an unexplored land...',
    'adventure.generating_options_audio': 'Generating audio for options...',
    'adventure.interrupted_desc': 'The storyteller lost connection or generated an invalid response.',
    'adventure.interrupted_title': 'Adventure Interrupted',
    'adventure.paused_desc': 'A previous journey is waiting for you.',
    'adventure.paused_title': 'Adventure Paused',
    'adventure.retry_action': 'Retry Action',
    'adventure.save_reminder': 'Consider saving your adventure progress!',
    'adventure.setup_subtitle': 'Configure your journey',
    'adventure.start_overwrite': 'Start New Game (Overwrite)',
    'adventure.system_simulation': 'System Simulation',
    'adventure.system_state': 'System State',
    'adventure.tooltips.stability': 'System Stability',
    # Chat guide keys
    'chat_guide.blueprint.analyzing': 'Analyzing your text...',
    'chat_guide.blueprint.auto_fill_stop': 'Auto-fill stopped.',
    'chat_guide.blueprint.change_fail': 'Could not apply changes.',
    'chat_guide.blueprint.complete': 'Blueprint complete!',
    'chat_guide.blueprint.error': 'Error generating blueprint.',
    'chat_guide.blueprint.presented': 'Here is your lesson blueprint.',
    'chat_guide.blueprint.reset': 'Blueprint has been reset.',
    'chat_guide.blueprint.updated': 'Blueprint updated successfully.',
    'chat_guide.flow.adapting_text': 'Adapting text for grade {grade}...',
    'chat_guide.flow.added_lang': 'Added {lang} translation.',
    'chat_guide.flow.creating_worksheet': 'Creating worksheet...',
    'chat_guide.flow.generating_glossary': 'Generating glossary...',
    'chat_guide.flow.generating_text': 'Generating text for grade {grade}...',
    'chat_guide.flow.generating_visual': 'Generating visual...',
    'chat_guide.flow.initial_prompt_context': 'I see you have some content ready. Let me help you build a lesson.',
    'chat_guide.flow.integrating_interest': 'Integrating student interest: {interest}',
    'chat_guide.flow.interest_check': 'Would you like to add a student interest connection?',
    'chat_guide.flow.keyword_pack': 'Keyword Pack',
    'chat_guide.flow.keyword_step': 'Keyword Step',
    'chat_guide.flow.no_langs_warning': 'No languages selected for translation.',
    'chat_guide.flow.offer_analysis': 'Would you like me to analyze this text?',
    'chat_guide.flow.offer_glossary': 'Would you like me to generate a glossary?',
    'chat_guide.flow.offer_text': 'Would you like adapted text for grade {grade}?',
    'chat_guide.flow.offer_visual': 'Would you like me to generate a visual?',
    'chat_guide.flow.option_pack': 'Option Pack',
    'chat_guide.flow.option_step': 'Option Step',
    'chat_guide.flow.running_analysis': 'Running analysis...',
    'chat_guide.flow.skipping_analysis': 'Skipping analysis.',
    'chat_guide.flow.skipping_text': 'Skipping text generation.',
    'chat_guide.flow.skipping_visual': 'Skipping visual generation.',
    'chat_guide.flow.source_prompt': 'Please provide or paste your source text.',
    'chat_guide.flow.start_scratch': 'Starting from scratch. What topic would you like to teach?',
    'chat_guide.pack.comprehensive': 'Comprehensive',
    'chat_guide.pack.count_selection': 'How many items would you like in your pack?',
    'chat_guide.pack.designing': 'Designing pack with {count} items...',
    'chat_guide.pack.error': 'Error creating pack.',
    # About special case
    'about.features_list': 'Features List',
}

still_missing = {k: v for k, v in all_needed.items() if k not in defined_keys}
print(f"Still missing: {len(still_missing)} keys")
for k in sorted(still_missing):
    print(f"  {k}")

# Find insertion points for each section using careful brace counting
def find_section_end_careful(section_path):
    """Find the closing brace line index for a section given by dot-separated path."""
    parts = section_path.split('.')
    current_level = 0  # Which part of the path we're looking for
    depth = 0
    tracking = False
    
    for i in range(ui_start, ui_end + 1):
        s = lines[i].strip()
        if s.startswith('//'):
            continue
        
        if not tracking:
            pattern = parts[current_level]
            if re.match(rf'^"?{re.escape(pattern)}"?\s*:\s*\{{', s):
                current_level += 1
                if current_level < len(parts):
                    continue  # Need to go deeper
                # We've found our target section
                tracking = True
                depth = s.count('{') - s.count('}')
                if depth <= 0:
                    return i
                continue
        else:
            depth += s.count('{') - s.count('}')
            if depth <= 0:
                return i
    return None

# Group missing keys by section
groups = {}
for key, val in still_missing.items():
    parts = key.split('.')
    if len(parts) == 2:
        section = parts[0]
        groups.setdefault(section, []).append((parts[1], val, 1))  # depth 1
    elif len(parts) == 3:
        section = parts[0] + '.' + parts[1]
        groups.setdefault(section, []).append((parts[2], val, 2))  # depth 2
    elif len(parts) == 4:
        section = parts[0] + '.' + parts[1] + '.' + parts[2]
        groups.setdefault(section, []).append((parts[3], val, 3))  # depth 3

# Build insertions
insertions = []
for section, items in sorted(groups.items()):
    close_line = find_section_end_careful(section)
    if close_line is not None:
        indent = '    ' * (items[0][2])
        new_text = '\n'.join(f"{indent}{leaf}: '{val}'," for leaf, val, _ in sorted(items))
        insertions.append((close_line, new_text))
        print(f"  {section}: {len(items)} keys -> insert before L{close_line+1}")
    else:
        # Try parent section
        parent = '.'.join(section.split('.')[:-1])
        sub_name = section.split('.')[-1]
        parent_close = find_section_end_careful(parent) if parent else None
        
        if parent_close is not None:
            depth = section.count('.') + 1
            indent = '    ' * depth
            sub_indent = '    ' * (depth - 1)
            new_text_lines = [f"{sub_indent}{sub_name}: {{"]
            for leaf, val, _ in sorted(items):
                val_escaped = val.replace("'", "\\'")
                new_text_lines.append(f"{indent}{leaf}: '{val_escaped}',")
            new_text_lines.append(f"{sub_indent}}},")
            new_text = '\n'.join(new_text_lines)
            insertions.append((parent_close, new_text))
            print(f"  {section}: creating sub-section in {parent} before L{parent_close+1}")
        else:
            print(f"  !! Cannot find section: {section}")

# Apply insertions from bottom to top
insertions.sort(key=lambda x: x[0], reverse=True)
for idx, text in insertions:
    lines.insert(idx, text + '\n')

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"\nFinal line count: {len(lines)}")
print("Done!")
