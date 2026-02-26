"""
Add all genuinely missing localization keys to UI_STRINGS.
Strategy: Find each section in UI_STRINGS and inject the missing keys.
For keys with no existing section, create a new section.
"""
import re

FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

le = '\r\n' if lines[0].endswith('\r\n') else '\n'

# All genuinely missing keys grouped by section, with sensible English defaults
MISSING_KEYS = {
    'quiz': {
        'hide_answer': 'Hide Answer',
        'reveal_answer': 'Reveal Answer',
        'lobby_waiting': 'Waiting for students to join...',
        'session_ended_success': 'Quiz session ended successfully!',
    },
    'escape_room': {
        'no_hint_available': 'No hint available for this puzzle.',
        'no_hints_remaining': 'No hints remaining!',
        'pause': 'Pause',
        'resume': 'Resume',
        'riddle_challenge': 'Riddle Challenge',
        'select_answer': 'Select an answer',
    },
    'common': {
        'adjusting': 'Adjusting...',
        'character': 'Character',
        'clear': 'Clear',
        'coming_soon': 'Coming Soon',
        'confirm': 'Confirm',
        'continue': 'Continue',
        'maximize': 'Maximize',
        'this_topic': 'this topic',
        'you': 'You',
    },
    'errors': {
        'generation_failed': 'Generation failed. Please try again.',
        'no_context_for_outcome': 'No context available for this outcome.',
        'no_session': 'No active session. Please start a session first.',
        'no_text': 'Please enter or paste some text first.',
    },
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
    'adventure': {
        'fallback_opening': 'Your adventure begins...',
        'generating_options_audio': 'Generating audio for options...',
        'save_reminder': 'Remember to save your adventure!',
        'system_simulation': 'System Simulation',
        'system_state': 'System State',
    },
    'session': {
        'error_end_session': 'Error ending session.',
        'local_mode_warning': 'Running in local mode. Student features are disabled.',
        'waiting_for_students': 'Waiting for students to connect...',
    },
    'groups': {
        'created': 'Group created!',
        'deleted': 'Group deleted.',
        'drag_to_reorder': 'Drag to reorder',
        'language_default': 'Default',
        'language_label': 'Language',
        'language_tooltip': 'Select content language for this group',
        'no_resources': 'No resources yet.',
        'resources_reordered': 'Resources reordered.',
        'waiting_students': 'Waiting for students...',
    },
    'timer': {
        'set_btn': 'Set Timer',
        'time_up_msg': "Time\\'s up!",
    },
    'simplified': {
        'complexity_rubric_title': 'Complexity Rubric',
        'gauge_aligned': 'Aligned',
        'gauge_complex': 'Complex',
        'gauge_simple': 'Simple',
    },
    'bingo': {
        'close_generator': 'Close Generator',
        'exit_caller_aria': 'Exit bingo caller',
        'launch_caller_aria': 'Launch bingo caller',
    },
    'chat_guide': {
        'advice_saved': 'Advice saved!',
        'advice_saved_raw': 'Raw advice saved.',
        'highlight_confirm': 'Highlight confirmed.',
        'history_saved_toast': 'Chat history saved!',
        'independent_welcome': 'Welcome to your independent workspace!',
        'save_actionable_btn': 'Save Actionable Items',
        'save_actionable_loading': 'Saving actionable items...',
    },
    'codenames': {
        'adjectives': 'Adjectives',
        'animals': 'Animals',
    },
    'language_selector': {
        'alert_invalid_json': 'Invalid JSON format.',
        'alert_parse_error': 'Error parsing language data.',
        'status_complete': 'Translation complete!',
        'status_custom_loaded': 'Custom language loaded.',
    },
    'languages_list': {
        'Arabic': 'Arabic',
        'French': 'French',
        'German': 'German',
        'Japanese': 'Japanese',
        'Mandarin': 'Mandarin',
        'Portuguese': 'Portuguese',
        'Russian': 'Russian',
        'Spanish': 'Spanish',
        'Vietnamese': 'Vietnamese',
    },
    'lesson_plan': {
        'activities_header': 'Activities',
        'assessment_header': 'Assessment',
        'objectives_header': 'Objectives',
    },
    'meta': {
        'family_guide': 'Family Guide',
        'study_guide': 'Study Guide',
        'udl_aligned': 'UDL Aligned',
    },
    'organizer': {
        # These may be nested under labels
    },
    'persona': {
        'conclude_locked': 'Conclude is locked until reflection is complete.',
        'error_boundary_fallback': 'Something went wrong. Please try again.',
        'generating_question': 'Generating question...',
        'prompt_label': 'Prompt',
        'reflection_complete': 'Reflection complete!',
        'save_tooltip': 'Save this conversation',
    },
    'quick_start': {
        'article_imported': 'Article imported successfully!',
        'copy_paste_instruction': 'Copy and paste your text, or use one of the quick start options below.',
        'error_auto_search': 'Auto-search failed.',
        'error_extract': 'Content extraction failed.',
        'error_no_urls': 'No URLs found.',
        'error_read_file': 'Error reading file.',
        'search_failed': 'Search failed. Please try again.',
    },
    'bot_events': {
        'brainstorming_start': 'Brainstorming started!',
    },
    'games': {
        # fill_blank.input_label is nested
    },
    'input': {
        'drafting_story_outline': 'Drafting story outline...',
    },
    'outline': {
        # labels.generate_outcome is nested
    },
    'output': {
        'col_image': 'Image',
    },
    'process': {
        'grammar_fix_truncation': 'Fixing grammar truncation...',
    },
    'status': {
        'generating': 'Generating...',
    },
    'status_steps': {
        'brainstorming': 'Brainstorming ideas...',
    },
    'tips': {
        'pro_tip_label': 'Pro Tip',
    },
    'tour': {
        'spotlight_title': 'Spotlight',
    },
}

# Find each section in UI_STRINGS and inject keys
# UI_STRINGS is at roughly L10853-16961
ui_start = None
for i, line in enumerate(lines):
    if 'const UI_STRINGS' in line:
        ui_start = i
        break

if not ui_start:
    print("ERROR: UI_STRINGS not found")
    exit(1)

total_added = 0

for section, keys in MISSING_KEYS.items():
    if not keys:
        continue
    
    # Find the section header in UI_STRINGS: "section: {"
    section_line = None
    for i in range(ui_start, min(ui_start + 7000, len(lines))):
        # Match: "    section: {"  or "    section:{"
        stripped = lines[i].strip()
        if stripped.startswith(section + ':') and '{' in stripped:
            section_line = i
            break
        elif stripped.startswith("'" + section + "':") and '{' in stripped:
            section_line = i
            break
    
    if section_line is not None:
        # Find the closing } of this section
        brace_count = 0
        section_end = None
        for j in range(section_line, min(section_line + 2000, len(lines))):
            for ch in lines[j]:
                if ch == '{': brace_count += 1
                elif ch == '}': brace_count -= 1
            if brace_count == 0:
                section_end = j
                break
        
        if section_end:
            # Insert keys just before the closing }
            new_lines = []
            for key, value in sorted(keys.items()):
                new_lines.append("      " + key + ": '" + value.replace("'", "\\'") + "'," + le)
            
            # Insert before section_end
            for idx, new_line in enumerate(new_lines):
                lines.insert(section_end + idx, new_line)
            
            total_added += len(keys)
            print("Added " + str(len(keys)) + " keys to '" + section + "' section (at L" + str(section_end + 1) + ")")
        else:
            print("WARNING: Could not find end of '" + section + "' section")
    else:
        print("SKIP: Section '" + section + "' not found in UI_STRINGS (may need manual creation)")

print("\nTotal keys added: " + str(total_added))

f = open(FILE, 'w', encoding='utf-8')
f.write(''.join(lines))
f.close()
print("Lines: " + str(len(lines)))
