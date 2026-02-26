"""
Add confirmed missing keys to ui_strings.js.
For each namespace, finds the closing brace and inserts new keys before it.
All keys were verified missing via Python-based search.
"""
import re

UI_FILE = 'ui_strings.js'

# All 44 confirmed missing keys with their English values
# Grouped by namespace for insertion
KEYS_TO_ADD = {
    'adventure': {
        # adventure.tooltips is a nested object
        '_nested': {
            'tooltips': {
                'stability': 'Stability: {value}%',
            }
        }
    },
    'bingo': {
        'exit_caller_aria': 'Exit Bingo Caller',
    },
    'common': {
        'confirm_action': 'Confirm',
        'continued': 'Cont.',
        'family_guide': 'Family Guide',
        'family_learning_guide': 'Family Learning Guide',
        'gemini_bridge': 'Gemini Bridge',
        'ready': 'Ready',
        'standard_audit': 'Standard Audit',
        'study_guide': 'Study Guide',
        'tool_simplified': 'Text Adaptation',
        'udl_aligned': 'UDL Aligned',
        'udl_lesson_plan': 'UDL Lesson Plan',
    },
    'errors': {
        'load_failed': 'Failed to load saved configuration',
        'storage_full': 'Storage full \\u2014 could not save',
    },
    'escape_room': {
        'all_solved_bonus': '\\ud83c\\udfc6 All puzzles solved! +{xp} XP bonus!',
        'config_saved': '\\ud83d\\udcbe Escape Room saved! Load it anytime from settings.',
        'invalid_save': 'Saved data is corrupted',
        'load_saved': 'Load Saved',
        'loaded_saved': '\\ud83d\\udcc2 Saved Escape Room loaded! Review and launch when ready.',
        'no_saved': 'No saved Escape Room found',
        'preview_confirmed': '\\u2705 Escape Room locked \\u2014 ready to play!',
        'xp_earned_streak': '+{xp} XP ({multiplier}x streak bonus!)',
    },
    'export': {
        'answer_key_title': 'Answer Key',
    },
    'fluency': {
        'custom_norms': 'Custom (Manual)',
        'custom_wcpm': 'Target WCPM',
        'prosody_expression': 'Expression',
        'prosody_pacing': 'Pacing',
        'prosody_phrasing': 'Phrasing',
    },
    'fullpack': {
        'group_all': '\\ud83c\\udfaf All Groups',
        'group_current': 'Current Settings',
        'group_tooltip': 'Generate for a specific group or all groups',
    },
    'language_selector': {
        'status_retrying_chunk': 'Retrying chunk {chunk} (attempt {attempt} of {maxAttempts})...',
    },
    'meta': {
        'multi_part': 'Multi-part',
        'processing_sections': 'Text is long. Processing {count} sections...',
    },
    'persona': {
        'topic_spark_tooltip': 'Get a topic suggestion ({remaining} remaining)',
    },
    'process': {
        'enter_text': 'Please enter or paste text first',
    },
    'roster': {
        'bridge_mode_btn': '\\ud83c\\udf10 Bridge Mode',
    },
    'toasts': {
        'applied_standard': 'Applied standard: {code}',
    },
    'tour': {
        'spotlight_message': 'Say hello to {name}!',
    },
    'visual_director': {
        'panel_refined': 'Panel refined!',
    },
    'visuals': {
        'replace_image': 'Replace',
        'restore_ai_image': 'Restore AI image',
        'restore_original': 'Restore',
        'upload_image': 'Upload your own image',
    },
    'wizard': {
        'step_codename': 'Pick Your Codename!',
    },
}

with open(UI_FILE, 'r', encoding='utf-8') as f:
    content = f.read()

added_count = 0

for namespace, keys in KEYS_TO_ADD.items():
    # Handle nested objects (like adventure.tooltips)
    nested = keys.pop('_nested', {})
    
    if keys:
        # Find the namespace block and its closing section
        # Strategy: find "namespace: {" then insert before its closing "}"
        # We look for the namespace key, then find where to insert
        
        # Find the namespace declaration
        ns_pattern = rf"['\"]?{namespace}['\"]?\s*:\s*\{{"
        ns_match = re.search(ns_pattern, content)
        
        if not ns_match:
            print(f"WARNING: Namespace '{namespace}' not found in ui_strings.js!")
            continue
        
        # Find the closing brace for this namespace by counting braces
        start_pos = ns_match.end()
        depth = 1
        pos = start_pos
        while pos < len(content) and depth > 0:
            if content[pos] == '{':
                depth += 1
            elif content[pos] == '}':
                depth -= 1
            pos += 1
        
        # pos now points right after the closing brace
        # Insert new keys before it (at pos - 1)
        insert_pos = pos - 1
        
        # Build the entries to insert
        entries = []
        for key, value in keys.items():
            # Escape value for JS string
            escaped_value = value.replace("'", "\\'")
            entries.append(f"    {key}: '{escaped_value}',")
        
        insert_text = '\n' + '\n'.join(entries) + '\n'
        content = content[:insert_pos] + insert_text + content[insert_pos:]
        added_count += len(entries)
        print(f"  Added {len(entries)} keys to '{namespace}'")
    
    # Handle nested objects
    for sub_ns, sub_keys in nested.items():
        # Find namespace.sub_ns block
        full_ns = f"{namespace}"
        ns_pattern = rf"['\"]?{namespace}['\"]?\s*:\s*\{{"
        ns_match = re.search(ns_pattern, content)
        if not ns_match:
            print(f"WARNING: Namespace '{namespace}' not found for nested '{sub_ns}'!")
            continue
        
        # Look for sub_ns within the namespace
        sub_pattern = rf"['\"]?{sub_ns}['\"]?\s*:\s*\{{"
        sub_match = re.search(sub_pattern, content[ns_match.start():])
        
        if sub_match:
            # Found existing sub-namespace, insert into it
            abs_pos = ns_match.start() + sub_match.end()
            depth = 1
            pos = abs_pos
            while pos < len(content) and depth > 0:
                if content[pos] == '{':
                    depth += 1
                elif content[pos] == '}':
                    depth -= 1
                pos += 1
            
            insert_pos = pos - 1
            entries = []
            for key, value in sub_keys.items():
                escaped_value = value.replace("'", "\\'")
                entries.append(f"        {key}: '{escaped_value}',")
            
            insert_text = '\n' + '\n'.join(entries) + '\n'
            content = content[:insert_pos] + insert_text + content[insert_pos:]
            added_count += len(entries)
            print(f"  Added {len(entries)} keys to '{namespace}.{sub_ns}'")
        else:
            # Need to create the sub-namespace block
            # Find the closing brace of the parent namespace
            start_pos = ns_match.end()
            depth = 1
            pos = start_pos
            while pos < len(content) and depth > 0:
                if content[pos] == '{':
                    depth += 1
                elif content[pos] == '}':
                    depth -= 1
                pos += 1
            
            insert_pos = pos - 1
            entries = []
            for key, value in sub_keys.items():
                escaped_value = value.replace("'", "\\'")
                entries.append(f"        {key}: '{escaped_value}',")
            
            sub_block = f"\n    {sub_ns}: {{\n" + '\n'.join(entries) + "\n    },\n"
            content = content[:insert_pos] + sub_block + content[insert_pos:]
            added_count += len(entries)
            print(f"  Created '{namespace}.{sub_ns}' with {len(entries)} keys")

with open(UI_FILE, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print(f"\nDone! Added {added_count} keys total to {UI_FILE}")
