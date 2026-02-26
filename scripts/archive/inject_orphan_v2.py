"""
Second pass: Fix remaining 41 orphan keys by inserting them into
the CORRECT nested sub-sections within UI_STRINGS.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# === Keys that need to be added with their paths and values ===
missing_keys = {
    # about section - special case (returnObjects)
    'about.features_list': ('about', 'features_list', 'Features List'),
    
    # adventure section - these need to go inside adventure: {}
    'adventure.back_to_resume': ('adventure', 'back_to_resume', 'Back to Resume'),
    'adventure.climax_archetypes.default.label': ('adventure.climax_archetypes.default', 'label', 'Default'),
    'adventure.climax_archetypes.default.left': ('adventure.climax_archetypes.default', 'left', 'Left'),
    'adventure.climax_archetypes.default.right': ('adventure.climax_archetypes.default', 'right', 'Right'),
    'adventure.fallback_opening': ('adventure', 'fallback_opening', 'Your adventure begins here...'),
    'adventure.generating_options_audio': ('adventure', 'generating_options_audio', 'Generating audio for options...'),
    'adventure.interrupted_desc': ('adventure', 'interrupted_desc', 'The adventure was interrupted. You can retry or start a new one.'),
    'adventure.interrupted_title': ('adventure', 'interrupted_title', 'Adventure Interrupted'),
    'adventure.paused_desc': ('adventure', 'paused_desc', 'The adventure is paused. Resume when ready.'),
    'adventure.paused_title': ('adventure', 'paused_title', 'Adventure Paused'),
    'adventure.results.header': ('adventure.results', 'header', '📊 Results'),
    'adventure.results.perf_score': ('adventure.results', 'perf_score', 'Performance Score: {total}'),
    'adventure.results.roll_calc': ('adventure.results', 'roll_calc', 'Roll Calculation'),
    'adventure.retry_action': ('adventure', 'retry_action', 'Retry'),
    'adventure.save_reminder': ('adventure', 'save_reminder', '💾 Consider saving your adventure progress!'),
    'adventure.setup_subtitle': ('adventure', 'setup_subtitle', 'Configure your adventure settings'),
    'adventure.start_overwrite': ('adventure', 'start_overwrite', 'Start New (Overwrite)'),
    'adventure.system_simulation': ('adventure', 'system_simulation', 'System Simulation'),
    'adventure.system_state': ('adventure', 'system_state', 'System State'),
    'adventure.tooltips.stability': ('adventure.tooltips', 'stability', 'System Stability'),
    
    # cancel - top-level
    'cancel': ('__top__', 'cancel', 'Cancel'),
    
    # export.filenames - need to go inside existing export.filenames sub-section
    'export.filenames.assignment': ('export.filenames', 'assignment', 'Assignment'),
    'export.filenames.flashcards': ('export.filenames', 'flashcards', 'Flashcards'),
    'export.filenames.html_pack': ('export.filenames', 'html_pack', 'Content-Pack'),
    'export.filenames.profiles': ('export.filenames', 'profiles', 'Student-Profiles'),
    'export.filenames.project_student': ('export.filenames', 'project_student', 'AlloFlow-Student-Project'),
    'export.filenames.project_teacher': ('export.filenames', 'project_teacher', 'AlloFlow-Teacher-Project'),
    'export.filenames.slides_prefix': ('export.filenames', 'slides_prefix', 'AlloFlow-Slides'),
    'export.filenames.zip_pack': ('export.filenames', 'zip_pack', 'AlloFlow-Pack'),
    
    # export.storybook - need new sub-section inside export
    'export.storybook.chapter_separator': ('export.storybook', 'chapter_separator', '— Chapter —'),
    'export.storybook.epilogue_badge': ('export.storybook', 'epilogue_badge', '🏆 Epilogue'),
    'export.storybook.log_header': ('export.storybook', 'log_header', 'Adventure Log'),
    'export.storybook.meta_info': ('export.storybook', 'meta_info', 'Generated on {date} | Level {level}'),
    'export.storybook.page_title': ('export.storybook', 'page_title', '{title} — Storybook'),
    'export.storybook.print_button': ('export.storybook', 'print_button', '🖨️ Print'),
    'export.storybook.subtitle': ('export.storybook', 'subtitle', 'An AlloFlow Adventure'),
    'export.storybook.user_label': ('export.storybook', 'user_label', 'Adventurer'),
    
    # move_up / move_down - top-level
    'move_up': ('__top__', 'move_up', 'Move Up'),
    'move_down': ('__top__', 'move_down', 'Move Down'),
    
    # visuals.styles.default
    'visuals.styles.default': ('visuals.styles', 'default', 'Default'),
}

lines = content.split('\n')

# Find UI_STRINGS block
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

# === Strategy: Find each section/sub-section and append keys ===
# We need to find specific locations:
# 1. The end of adventure: { ... } section
# 2. The end of export.filenames: { ... } sub-section  
# 3. Create export.storybook: { ... } sub-section
# 4. End of about: { ... }
# 5. End of visuals: { ... } (or visuals.styles: { ... })
# 6. Just before UI_STRINGS closing brace for top-level keys

def find_section_end(lines, start, end, section_path):
    """Find the closing brace of a section identified by path like 'adventure' or 'export.filenames'"""
    parts = section_path.split('.')
    current_depth = 0
    target_depth = len(parts)
    found_depth = 0
    tracking = False
    section_start = None
    
    for i in range(start, end + 1):
        line = lines[i].strip()
        
        # Try to match each level of the path
        if found_depth < target_depth:
            pattern = parts[found_depth]
            if re.match(rf'{pattern}\s*:\s*\{{', line):
                found_depth += 1
                if found_depth == target_depth:
                    tracking = True
                    current_depth = line.count('{') - line.count('}')
                    section_start = i
                continue
        
        if tracking:
            current_depth += line.count('{') - line.count('}')
            if current_depth <= 0:
                return i  # This is the closing brace line
    
    return None

# Group missing keys by their insertion target
insertion_targets = {}
for key, (parent, leaf, value) in missing_keys.items():
    if parent not in insertion_targets:
        insertion_targets[parent] = []
    insertion_targets[parent].append((leaf, value))

# Find insertion points and build patches
patches = []  # (line_index, text)

for parent, items in insertion_targets.items():
    if parent == '__top__':
        # Insert before UI_STRINGS closing brace
        new_lines = []
        for leaf, value in items:
            value = value.replace("'", "\\'")
            new_lines.append(f"    {leaf}: '{value}',")
        patches.append((ui_end, '\n'.join(new_lines)))
    else:
        section_end = find_section_end(lines, ui_start, ui_end, parent)
        if section_end is not None:
            new_lines = []
            # Determine indentation
            indent = '        '  # 8 spaces for 2-level nesting
            depth = parent.count('.') + 1
            if depth >= 2:
                indent = '            '  # 12 spaces for 3-level nesting
            if depth >= 3:
                indent = '                '  # 16 spaces for 4-level nesting
            
            for leaf, value in items:
                value = value.replace("'", "\\'")
                new_lines.append(f"{indent}{leaf}: '{value}',")
            patches.append((section_end, '\n'.join(new_lines)))
            print(f"  ✅ Found {parent} section end at line {section_end+1}, inserting {len(items)} keys")
        else:
            print(f"  ⚠️ Could not find section: {parent}")
            # Try to create the sub-section inside the parent
            parent_parts = parent.split('.')
            parent_section = parent_parts[0]
            sub_section = '.'.join(parent_parts[1:])
            
            parent_end = find_section_end(lines, ui_start, ui_end, parent_section)
            if parent_end is not None:
                new_lines = []
                sub_indent = '        '
                new_lines.append(f"{sub_indent}{sub_section}: {{")
                for leaf, value in items:
                    value = value.replace("'", "\\'")
                    new_lines.append(f"{sub_indent}    {leaf}: '{value}',")
                new_lines.append(f"{sub_indent}}},")
                patches.append((parent_end, '\n'.join(new_lines)))
                print(f"  ✅ Creating {parent} sub-section inside {parent_section} at line {parent_end+1}")
            else:
                print(f"  ❌ Cannot find parent {parent_section} either!")

# Sort patches from bottom to top
patches.sort(key=lambda x: x[0], reverse=True)

print(f"\nApplying {len(patches)} patches...")
for line_idx, text in patches:
    lines.insert(line_idx, text)

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print("Done! File saved.")
