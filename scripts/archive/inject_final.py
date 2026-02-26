"""
Final injection: Add the 49 truly missing keys to UI_STRINGS.
Uses the robust brace-aware section finder.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find UI_STRINGS block
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

def find_section_closing_brace(section_name, start=ui_start, end=ui_end):
    """Find the line index of the closing brace for a top-level section."""
    found = False
    depth = 0
    for i in range(start, end + 1):
        s = lines[i].strip()
        if s.startswith('//'):
            continue
        if not found:
            # Look for section: {
            if re.match(rf'^{re.escape(section_name)}\s*:\s*\{{', s):
                found = True  
                depth = s.count('{') - s.count('}')
                if depth <= 0:
                    return i  # One-liner
                continue
        else:
            depth += s.count('{') - s.count('}')
            if depth <= 0:
                return i  # This is the closing brace
    return None

def find_sub_section_closing_brace(parent_name, sub_name, start=ui_start, end=ui_end):
    """Find closing brace for a sub-section inside a parent section."""
    parent_found = False
    parent_depth = 0
    sub_found = False
    sub_depth = 0
    
    for i in range(start, end + 1):
        s = lines[i].strip()
        if s.startswith('//'):
            continue
        
        if not parent_found:
            if re.match(rf'^{re.escape(parent_name)}\s*:\s*\{{', s):
                parent_found = True
                parent_depth = s.count('{') - s.count('}')
                continue
        elif not sub_found:
            parent_depth += s.count('{') - s.count('}')
            if parent_depth <= 0:
                return None  # Parent ended without finding sub-section
            if re.match(rf'^{re.escape(sub_name)}\s*:\s*\{{', s):
                sub_found = True
                sub_depth = s.count('{') - s.count('}')
                if sub_depth <= 0:
                    return i
                continue
        else:
            sub_depth += s.count('{') - s.count('}')
            if sub_depth <= 0:
                return i
    return None

# === Adventure flat keys (add before the closing brace of adventure section) ===
adventure_keys = {
    'back_to_resume': 'Back to Resume',
    'fallback_opening': 'Your adventure begins in an unexplored land...',
    'generating_options_audio': 'Generating audio for options...',
    'interrupted_desc': 'The storyteller lost connection or generated an invalid response.',
    'interrupted_title': 'Adventure Interrupted',
    'paused_desc': 'A previous journey is waiting for you.',
    'paused_title': 'Adventure Paused',
    'retry_action': 'Retry Action',
    'save_reminder': 'Consider saving your adventure progress!',
    'setup_subtitle': 'Configure your journey',
    'start_overwrite': 'Start New Game (Overwrite)',
    'system_simulation': 'System Simulation',
    'system_state': 'System State',
}

# === Chat guide keys (need sub-sections) ===
chat_guide_blueprint = {
    'analyzing': 'Analyzing your text...',
    'auto_fill_stop': 'Auto-fill stopped.',
    'change_fail': 'Could not apply changes.',
    'complete': 'Blueprint complete!',
    'error': 'Error generating blueprint.',
    'presented': 'Here is your lesson blueprint.',
    'reset': 'Blueprint has been reset.',
    'updated': 'Blueprint updated successfully.',
}

chat_guide_flow = {
    'adapting_text': 'Adapting text for grade {grade}...',
    'added_lang': 'Added {lang} translation.',
    'creating_worksheet': 'Creating worksheet...',
    'generating_glossary': 'Generating glossary...',
    'generating_text': 'Generating text for grade {grade}...',
    'generating_visual': 'Generating visual...',
    'initial_prompt_context': 'I see you have some content ready. Let me help you build a lesson.',
    'integrating_interest': 'Integrating student interest: {interest}',
    'interest_check': 'Would you like to add a student interest connection?',
    'keyword_pack': 'Keyword Pack',
    'keyword_step': 'Keyword Step',
    'no_langs_warning': 'No languages selected for translation.',
    'offer_analysis': 'Would you like me to analyze this text?',
    'offer_glossary': 'Would you like me to generate a glossary?',
    'offer_text': 'Would you like adapted text for grade {grade}?',
    'offer_visual': 'Would you like me to generate a visual?',
    'option_pack': 'Option Pack',
    'option_step': 'Option Step',
    'running_analysis': 'Running analysis...',
    'skipping_analysis': 'Skipping analysis.',
    'skipping_text': 'Skipping text generation.',
    'skipping_visual': 'Skipping visual generation.',
    'source_prompt': 'Please provide or paste your source text.',
    'start_scratch': 'Starting from scratch. What topic would you like to teach?',
}

chat_guide_pack = {
    'comprehensive': 'Comprehensive',
    'count_selection': 'How many items would you like in your pack?',
    'designing': 'Designing pack with {count} items...',
    'error': 'Error creating pack.',
}

# === Build insertions ===
insertions = []  # (line_index, text_to_insert)

# 1. Adventure flat keys
adv_close = find_section_closing_brace('adventure')
if adv_close is not None:
    new_text = []
    for key, val in sorted(adventure_keys.items()):
        val_escaped = val.replace("'", "\\'")
        new_text.append(f"    {key}: '{val_escaped}',")
    insertions.append((adv_close, '\n'.join(new_text)))
    print(f"Adventure: inserting {len(adventure_keys)} keys before L{adv_close+1}")
else:
    print("ERROR: Could not find adventure section!")

# 2. Chat guide sub-sections
# Try to find existing blueprint/flow/pack sub-sections
bp_close = find_sub_section_closing_brace('chat_guide', 'blueprint')
flow_close = find_sub_section_closing_brace('chat_guide', 'flow')
pack_close = find_sub_section_closing_brace('chat_guide', 'pack')

cg_close = find_section_closing_brace('chat_guide')

if bp_close is not None:
    # Add to existing blueprint sub-section
    new_text = []
    for key, val in sorted(chat_guide_blueprint.items()):
        val_escaped = val.replace("'", "\\'")
        new_text.append(f"        {key}: '{val_escaped}',")
    insertions.append((bp_close, '\n'.join(new_text)))
    print(f"chat_guide.blueprint: inserting {len(chat_guide_blueprint)} keys before L{bp_close+1}")
elif cg_close is not None:
    # Create blueprint sub-section
    new_text = ['    blueprint: {']
    for key, val in sorted(chat_guide_blueprint.items()):
        val_escaped = val.replace("'", "\\'")
        new_text.append(f"        {key}: '{val_escaped}',")
    new_text.append('    },')
    insertions.append((cg_close, '\n'.join(new_text)))
    print(f"chat_guide.blueprint: creating new sub-section before L{cg_close+1}")

if flow_close is not None:
    new_text = []
    for key, val in sorted(chat_guide_flow.items()):
        val_escaped = val.replace("'", "\\'")
        new_text.append(f"        {key}: '{val_escaped}',")
    insertions.append((flow_close, '\n'.join(new_text)))
    print(f"chat_guide.flow: inserting {len(chat_guide_flow)} keys before L{flow_close+1}")
elif cg_close is not None:
    new_text = ['    flow: {']
    for key, val in sorted(chat_guide_flow.items()):
        val_escaped = val.replace("'", "\\'")
        new_text.append(f"        {key}: '{val_escaped}',")
    new_text.append('    },')
    insertions.append((cg_close, '\n'.join(new_text)))
    print(f"chat_guide.flow: creating new sub-section before L{cg_close+1}")

if pack_close is not None:
    new_text = []
    for key, val in sorted(chat_guide_pack.items()):
        val_escaped = val.replace("'", "\\'")
        new_text.append(f"        {key}: '{val_escaped}',")
    insertions.append((pack_close, '\n'.join(new_text)))
    print(f"chat_guide.pack: inserting {len(chat_guide_pack)} keys before L{pack_close+1}")
elif cg_close is not None:
    new_text = ['    pack: {']
    for key, val in sorted(chat_guide_pack.items()):
        val_escaped = val.replace("'", "\\'")
        new_text.append(f"        {key}: '{val_escaped}',")
    new_text.append('    },')
    insertions.append((cg_close, '\n'.join(new_text)))
    print(f"chat_guide.pack: creating new sub-section before L{cg_close+1}")

# Sort from bottom to top to avoid line shift
insertions.sort(key=lambda x: x[0], reverse=True)

for idx, text in insertions:
    lines.insert(idx, text + '\n')

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"\nDone! Applied {len(insertions)} insertions ({sum(len(v.split(chr(10))) for _, v in insertions)} lines)")
