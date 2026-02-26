"""
FINAL FIX: Validate entire UI_STRINGS brace structure.
Find ALL key-value lines that are at the wrong indentation level for their section.
Remove misplaced keys, then re-insert at the correct position (just before the 
section-level closing }).
"""
import re

FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

le = '\r\n' if lines[0].endswith('\r\n') else '\n'

# Find UI_STRINGS block  
ui_start = None
ui_end = None
for i, line in enumerate(lines):
    if 'const UI_STRINGS' in line:
        ui_start = i
        depth = 0
        for j in range(i, min(i + 10000, len(lines))):
            for ch in lines[j]:
                if ch == '{': depth += 1
                elif ch == '}': depth -= 1
            if depth == 0 and j > i:
                ui_end = j
                break
        break

print("UI_STRINGS: L" + str(ui_start+1) + " to L" + str(ui_end+1))

# Known injected keys (the ones we added) - they all have specific values
INJECTED_VALUES = {
    'adjusting', 'character', 'clear', 'coming_soon', 'confirm', 'maximize',
    'this_topic', 'you',  # common
    'hide_answer', 'reveal_answer', 'lobby_waiting', 'session_ended_success',  # quiz
    'no_hint_available', 'no_hints_remaining', 'pause', 'resume', 'riddle_challenge', 'select_answer',  # escape_room
    'generation_failed', 'no_context_for_outcome', 'no_session', 'no_text',  # errors
    'fallback_opening', 'generating_options_audio', 'save_reminder', 'system_simulation', 'system_state',  # adventure
    'error_end_session', 'local_mode_warning', 'waiting_for_students',  # session
    'created', 'deleted', 'drag_to_reorder', 'language_default', 'language_label', 'language_tooltip', 'no_resources', 'resources_reordered', 'waiting_students',  # groups
    'set_btn', 'time_up_msg',  # timer
    'complexity_rubric_title', 'gauge_aligned', 'gauge_complex', 'gauge_simple',  # simplified
    'close_generator', 'exit_caller_aria', 'launch_caller_aria',  # bingo
    'advice_saved', 'advice_saved_raw', 'highlight_confirm', 'history_saved_toast', 'independent_welcome', 'save_actionable_btn', 'save_actionable_loading',  # chat_guide
    'adjectives', 'animals',  # codenames
    'alert_invalid_json', 'alert_parse_error', 'status_complete', 'status_custom_loaded',  # language_selector
    'activities_header', 'assessment_header', 'objectives_header',  # lesson_plan
    'family_guide', 'study_guide', 'udl_aligned',  # meta
    'conclude_locked', 'error_boundary_fallback', 'generating_question', 'prompt_label', 'reflection_complete', 'save_tooltip',  # persona
    'article_imported', 'copy_paste_instruction', 'error_auto_search', 'error_extract', 'error_no_urls', 'error_read_file', 'search_failed',  # quick_start
    'brainstorming_start',  # bot_events
    'drafting_story_outline',  # input
    'col_image',  # output
    'grammar_fix_truncation',  # process
    'generating',  # status (key name)
    'brainstorming',  # status_steps
    'pro_tip_label',  # tips
    'spotlight_title',  # tour
    'generate_outcome',  # outline
    'broadcast_error', 'options_broadcast_success',  # adventure.toasts
    'cause', 'effect', 'end', 'problem_label', 'solutions',  # organizer.labels
    'input_label',  # games.fill_blank
}

# Also inject values for languages
INJECTED_VALUES.update({'Arabic', 'French', 'German', 'Japanese', 'Mandarin', 'Portuguese', 'Russian', 'Spanish', 'Vietnamese'})

# Injected values as strings
INJECTED_VAL_STRINGS = {
    'Adjusting...', 'Character', 'Clear', 'Coming Soon', 'Confirm', 'Continue', 'Maximize',
    'this topic', 'You', 'Hide Answer', 'Reveal Answer', 'Waiting for students to join...',
    'Quiz session ended successfully!', 'No hint available for this puzzle.', 'No hints remaining!',
    'Pause', 'Resume', 'Riddle Challenge', 'Select an answer', 'Generation failed. Please try again.',
    'No context available for this outcome.', 'No active session. Please start a session first.',
    'Please enter or paste some text first.', 'Your adventure begins...',
    'Generating audio for options...', 'Remember to save your adventure!', 'System Simulation',
    'System State', 'Error ending session.', 'Running in local mode. Student features are disabled.',
    'Waiting for students to connect...', 'Group created!', 'Group deleted.', 'Drag to reorder',
    'Default', 'Language', 'Select content language for this group', 'No resources yet.',
    'Resources reordered.', 'Waiting for students...', 'Set Timer', "Time\\'s up!",
    'Complexity Rubric', 'Aligned', 'Complex', 'Simple', 'Close Generator', 'Exit bingo caller',
    'Launch bingo caller', 'Advice saved!', 'Raw advice saved.', 'Highlight confirmed.',
    'Chat history saved!', 'Welcome to your independent workspace!', 'Save Actionable Items',
    'Saving actionable items...', 'Adjectives', 'Animals', 'Invalid JSON format.',
    'Error parsing language data.', 'Translation complete!', 'Custom language loaded.',
    'Activities', 'Assessment', 'Objectives', 'Family Guide', 'Study Guide', 'UDL Aligned',
    'Conclude is locked until reflection is complete.', 'Something went wrong. Please try again.',
    'Generating question...', 'Prompt', 'Reflection complete!', 'Save this conversation',
    'Article imported successfully!', 'Drafting story outline...', 'Image',
    'Fixing grammar truncation...', 'Generating...', 'Brainstorming ideas...', 'Pro Tip',
    'Spotlight', 'Generate Outcome', 'Your answer', 'Brainstorming started!',
    'Failed to broadcast adventure update.', 'Options broadcast to students!',
    'Cause', 'Effect', 'End', 'Problem', 'Solutions',
}

# Step 1: Remove ALL injected key lines from UI_STRINGS
removed_keys = []
to_remove = []
for i in range(ui_start, ui_end + 1):
    line = lines[i].strip()
    # Match key: "value", pattern
    m = re.match(r'^(\w+|"[^"]+")\s*:\s*"([^"]*)",?\s*$', line)
    if m:
        key = m.group(1).strip('"')
        val = m.group(2)
        if key in INJECTED_VALUES or val in INJECTED_VAL_STRINGS:
            # Verify this is actually our injected key, not an original one
            # Our injected keys use 8-space indent (inside nested) or 4-space indent
            # Actually, just check if the value matches our injected values
            if val in INJECTED_VAL_STRINGS:
                to_remove.append(i)
                removed_keys.append((key, val))

print("Removing " + str(len(to_remove)) + " injected key lines")

# Remove in reverse to maintain indices
for idx in reversed(to_remove):
    del lines[idx]

# Step 2: Find each section again and re-add keys at the correct position
# Recalculate ui_start/ui_end
for i, line in enumerate(lines):
    if 'const UI_STRINGS' in line:
        ui_start = i
        depth = 0
        for j in range(i, min(i + 10000, len(lines))):
            for ch in lines[j]:
                if ch == '{': depth += 1
                elif ch == '}': depth -= 1
            if depth == 0 and j > i:
                ui_end = j
                break
        break

# Group removed keys by their section
SECTION_KEYS = {
    'common': {'adjusting': 'Adjusting...', 'character': 'Character', 'clear': 'Clear',
               'coming_soon': 'Coming Soon', 'confirm': 'Confirm', '"continue"': 'Continue',
               'maximize': 'Maximize', 'this_topic': 'this topic', 'you': 'You'},
    'quiz': {'hide_answer': 'Hide Answer', 'reveal_answer': 'Reveal Answer',
             'lobby_waiting': 'Waiting for students to join...', 'session_ended_success': 'Quiz session ended successfully!'},
    'escape_room': {'no_hint_available': 'No hint available for this puzzle.',
                    'no_hints_remaining': 'No hints remaining!', 'pause': 'Pause', 'resume': 'Resume',
                    'riddle_challenge': 'Riddle Challenge', 'select_answer': 'Select an answer'},
    'errors': {'generation_failed': 'Generation failed. Please try again.',
               'no_context_for_outcome': 'No context available for this outcome.',
               'no_session': 'No active session. Please start a session first.',
               'no_text': 'Please enter or paste some text first.'},
    'adventure': {'fallback_opening': 'Your adventure begins...',
                  'generating_options_audio': 'Generating audio for options...',
                  'save_reminder': 'Remember to save your adventure!',
                  'system_simulation': 'System Simulation', 'system_state': 'System State'},
    'session': {'error_end_session': 'Error ending session.',
                'local_mode_warning': 'Running in local mode. Student features are disabled.',
                'waiting_for_students': 'Waiting for students to connect...'},
    'groups': {'created': 'Group created!', 'deleted': 'Group deleted.', 'drag_to_reorder': 'Drag to reorder',
               'language_default': 'Default', 'language_label': 'Language',
               'language_tooltip': 'Select content language for this group',
               'no_resources': 'No resources yet.', 'resources_reordered': 'Resources reordered.',
               'waiting_students': 'Waiting for students...'},
    'timer': {'set_btn': 'Set Timer', 'time_up_msg': "Time's up!"},
    'simplified': {'complexity_rubric_title': 'Complexity Rubric', 'gauge_aligned': 'Aligned',
                   'gauge_complex': 'Complex', 'gauge_simple': 'Simple'},
    'bingo': {'close_generator': 'Close Generator', 'exit_caller_aria': 'Exit bingo caller',
              'launch_caller_aria': 'Launch bingo caller'},
    'chat_guide': {'advice_saved': 'Advice saved!', 'advice_saved_raw': 'Raw advice saved.',
                   'highlight_confirm': 'Highlight confirmed.', 'history_saved_toast': 'Chat history saved!',
                   'independent_welcome': 'Welcome to your independent workspace!',
                   'save_actionable_btn': 'Save Actionable Items', 'save_actionable_loading': 'Saving actionable items...'},
    'codenames': {'adjectives': 'Adjectives', 'animals': 'Animals'},
    'language_selector': {'alert_invalid_json': 'Invalid JSON format.', 'alert_parse_error': 'Error parsing language data.',
                          'status_complete': 'Translation complete!', 'status_custom_loaded': 'Custom language loaded.'},
    'languages_list': {'Arabic': 'Arabic', 'French': 'French', 'German': 'German', 'Japanese': 'Japanese',
                       'Mandarin': 'Mandarin', 'Portuguese': 'Portuguese', 'Russian': 'Russian',
                       'Spanish': 'Spanish', 'Vietnamese': 'Vietnamese'},
    'lesson_plan': {'activities_header': 'Activities', 'assessment_header': 'Assessment', 'objectives_header': 'Objectives'},
    'meta': {'family_guide': 'Family Guide', 'study_guide': 'Study Guide', 'udl_aligned': 'UDL Aligned'},
    'persona': {'conclude_locked': 'Conclude is locked until reflection is complete.',
                'error_boundary_fallback': 'Something went wrong. Please try again.',
                'generating_question': 'Generating question...', 'prompt_label': 'Prompt',
                'reflection_complete': 'Reflection complete!', 'save_tooltip': 'Save this conversation'},
    'quick_start': {'article_imported': 'Article imported successfully!',
                    'copy_paste_instruction': 'Copy and paste your text, or use one of the quick start options below.',
                    'error_auto_search': 'Auto-search failed.', 'error_extract': 'Content extraction failed.',
                    'error_no_urls': 'No URLs found.', 'error_read_file': 'Error reading file.',
                    'search_failed': 'Search failed. Please try again.'},
    'bot_events': {'brainstorming_start': 'Brainstorming started!'},
    'input': {'drafting_story_outline': 'Drafting story outline...'},
    'output': {'col_image': 'Image'},
    'process': {'grammar_fix_truncation': 'Fixing grammar truncation...'},
    'status': {'generating': 'Generating...'},
    'status_steps': {'brainstorming': 'Brainstorming ideas...'},
    'tips': {'pro_tip_label': 'Pro Tip'},
    'tour': {'spotlight_title': 'Spotlight'},
    'toasts': {
        'adventure_start_failed_retry': 'Adventure failed to start. Retrying...',
        'auto_repair_fallback': 'Auto-repair applied a fallback fix.',
        'connection_failed': 'Connection failed. Please check your network.',
        'connections_cleared': 'All connections cleared.',
        'copied_to_clipboard': 'Copied to clipboard!',
        'critical_error_return': 'A critical error occurred. Returning to safety.',
        'guide_generate_failed': 'Guide generation failed.',
        'ideas_generate_failed': 'Ideas generation failed.',
        'independent_project_loaded': 'Independent project loaded!',
        'invalid_project_file': 'Invalid project file format.',
        'lesson_ideas_generated': 'Lesson ideas generated!',
        'loaded_student_view': 'Loaded student view.',
        'nothing_to_copy': 'Nothing to copy.',
        'phonics_analyze_failed': 'Phonics analysis failed.',
        'project_loaded': 'Project loaded successfully!',
        'resource_assigned': 'Resource assigned.',
        'storage_disabled': 'Local storage is disabled or unavailable.',
        'unsupported_file_type': 'Unsupported file type.',
        'visual_glitch_rewind': 'Visual glitch detected. Rewinding...',
    },
}

# For each section, find the SECTION-LEVEL closing } (depth 1 inside UI_STRINGS)
# and insert keys just before it
total_added = 0
for section, keys in SECTION_KEYS.items():
    # Find section: "  section: {"  at depth 1
    section_line = None
    for i in range(ui_start, ui_end):
        s = lines[i].strip()
        # Match "section: {" or "'section': {"  at indent level 2 (2 spaces)
        leading = len(lines[i]) - len(lines[i].lstrip())
        if (s.startswith(section + ':') or s.startswith("'" + section + "':")) and '{' in s:
            if leading <= 4:  # Top-level section (indented 2-4 spaces)
                section_line = i
                break
    
    if section_line is None:
        print("SKIP: Section '" + section + "' not found")
        continue
    
    # Find the section-level closing } (match the opening brace depth)
    depth = 0
    section_end = None
    for j in range(section_line, min(section_line + 3000, len(lines))):
        for ch in lines[j]:
            if ch == '{': depth += 1
            elif ch == '}': depth -= 1
        if depth == 0:
            section_end = j
            break
    
    if not section_end:
        print("SKIP: Can't find end of '" + section + "'")
        continue
    
    # Determine the indent for keys in this section  
    # Look at existing keys to determine indentation
    indent = '    '
    for j in range(section_line + 1, min(section_line + 10, section_end)):
        s = lines[j]
        if s.strip() and ':' in s and ('"' in s) and not s.strip().startswith('//'):
            leading = len(s) - len(s.lstrip())
            indent = ' ' * leading
            break
    
    # Add trailing comma to the last existing key if needed
    for j in range(section_end - 1, section_line, -1):
        if lines[j].strip() and not lines[j].strip().startswith('//'):
            stripped = lines[j].rstrip('\r\n').rstrip()
            if stripped.endswith('"') and not stripped.endswith('",'):
                lines[j] = stripped + ',' + le
            elif stripped.endswith('}') and not stripped.endswith('},') and j != section_end:
                lines[j] = stripped + ',' + le
            break
    
    # Build new key lines
    new_lines = []
    for key, val in sorted(keys.items()):
        escaped_val = val.replace('"', '\\"')
        new_lines.append(indent + key + ': "' + escaped_val + '",' + le)
    
    # Insert before section_end
    for idx, nl in enumerate(new_lines):
        lines.insert(section_end + idx, nl)
    
    total_added += len(keys)
    print("Added " + str(len(keys)) + " keys to '" + section + "'")

print("\nTotal keys re-added: " + str(total_added))
f = open(FILE, 'w', encoding='utf-8')
f.write(''.join(lines))
f.close()
print("Lines: " + str(len(lines)))
