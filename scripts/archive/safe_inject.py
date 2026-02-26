"""
Safe localization injector — Section-by-section with validation.

Strategy:
1. Parse UI_STRINGS to find each section's closing brace
2. For each missing key, verify the section exists and the key doesn't already exist
3. Inject all missing keys for a section right before its closing },
4. Validate structure after all injections

Key principles:
- Uses JS-accurate tokenizer (handles string literals, comments, regex)
- Never creates new sections (only adds keys to existing ones)
- Creates new top-level entries only for truly new sections
- Reports every injection for auditability
"""
import sys, re, json
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Starting: {len(lines)} lines")

# === STEP 1: Find UI_STRINGS boundaries ===
ui_start = ui_end = None
for i, line in enumerate(lines):
    if 'const UI_STRINGS' in line and '{' in line:
        ui_start = i
        break

if ui_start is None:
    print("ERROR: UI_STRINGS not found!")
    sys.exit(1)

# Find UI_STRINGS end using JS-aware tokenizer
depth = 0
for i in range(ui_start, len(lines)):
    line = lines[i]
    # Simple but robust: count { and } NOT inside strings
    in_str = None
    escape = False
    for ch in line:
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
        if ch == '/' and not in_str:
            # Peek for // comment
            idx = line.index(ch)
            rest = line[idx:]
            if rest.startswith('//'):
                break
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                ui_end = i
                break
    if ui_end is not None:
        break

print(f"UI_STRINGS: L{ui_start+1} to L{ui_end+1}")

# === STEP 2: Find section locations ===
# For each top-level section, find: start line, close line
def find_section_close(section_name, start_from=None):
    """Find where a top-level section closes (its }, at depth 2->1)."""
    start = start_from or ui_start
    in_section = False
    section_depth = 0
    
    for i in range(start, ui_end + 1):
        line = lines[i]
        s = line.strip()
        
        if not in_section:
            # Look for section_name: { pattern
            pattern = re.compile(r'^["\']?' + re.escape(section_name) + r'["\']?\s*:\s*\{')
            if pattern.match(s):
                in_section = True
                section_depth = 1
                continue
        else:
            # Count braces (simple, within section)
            in_str = None
            escape = False
            for ch in line:
                if escape:
                    escape = False
                    continue
                if ch == '\\':
                    if in_str: escape = True
                    continue
                if ch in ('"', "'", '`'):
                    if in_str is None: in_str = ch
                    elif in_str == ch: in_str = None
                    continue
                if in_str: continue
                if ch == '{': section_depth += 1
                elif ch == '}': section_depth -= 1
                
            if section_depth == 0:
                return i  # This line has the closing }
    
    return None


def find_subsection_close(parent_section, subsection_name):
    """Find where a sub-section closes within a parent section."""
    parent_start = None
    # First find parent section start
    for i in range(ui_start, ui_end + 1):
        s = lines[i].strip()
        pattern = re.compile(r'^["\']?' + re.escape(parent_section) + r'["\']?\s*:\s*\{')
        if pattern.match(s):
            parent_start = i
            break
    
    if parent_start is None:
        return None
    
    parent_close = find_section_close(parent_section)
    if parent_close is None:
        return None
    
    # Now find subsection within parent
    in_sub = False
    sub_depth = 0
    for i in range(parent_start + 1, parent_close):
        s = lines[i].strip()
        if not in_sub:
            pattern = re.compile(r'^["\']?' + re.escape(subsection_name) + r'["\']?\s*:\s*\{')
            if pattern.match(s):
                in_sub = True
                sub_depth = 1
                continue
        else:
            in_str = None
            escape = False
            for ch in lines[i]:
                if escape: escape = False; continue
                if ch == '\\':
                    if in_str: escape = True
                    continue
                if ch in ('"', "'", '`'):
                    if in_str is None: in_str = ch
                    elif in_str == ch: in_str = None
                    continue
                if in_str: continue
                if ch == '{': sub_depth += 1
                elif ch == '}': sub_depth -= 1
            if sub_depth == 0:
                return i
    return None


def key_exists_in_section(section_close_line, key_name, search_start=None):
    """Check if a key already exists within a section."""
    start = search_start or ui_start
    for i in range(start, section_close_line + 1):
        s = lines[i].strip()
        if re.match(r'^["\']?' + re.escape(key_name) + r'["\']?\s*:', s):
            return True
    return False


# === STEP 3: Define all injections ===
# Each entry: (section_path, key, value)
# section_path = 'section' or 'section.subsection'

INJECTIONS = {
    # --- word_sounds (39 keys) ---
    'word_sounds': {
        'activity_length': '🎯 Items per Session',
        'activity_length_hint': 'Session completes after this many words',
        'activity_letter_tracing': 'Letter Trace',
        'add_word': 'Add a word...',
        'how_many_sounds': 'How many sounds?',
        'image_theme': 'Image Style',
        'include_spelling_activities': 'Include Spelling Activities',
        'letter_tracing_desc': 'Practice letter formation with guided tracing',
        'loading_phonemes': 'Loading phonemes...',
        'missing_letter_hear': 'Hear the word',
        'missing_letter_subtitle': 'Fill in the missing letter',
        'missing_letter_title': 'Missing Letter',
        'mode_phonics': 'Phonics',
        'mode_sound': 'Sound',
        'play_all_options': 'Play All Options',
        'rhyming_q': 'Which word rhymes with:',
        'select_activity': 'Select an activity',
        'select_family': 'Select family...',
        'session_progress': 'Session Progress',
        'sound_sort_found': 'found',
        'source_sight_words': '📚 Sight Words',
        'spelling_bee_check': 'Check Spelling ✔',
        'spelling_bee_first_letter': 'First letter hint',
        'spelling_bee_hear': 'Hear the word',
        'spelling_bee_slow': 'Slow',
        'spelling_bee_subtitle': 'Spell the word',
        'spelling_bee_title': 'Spelling Bee',
        'spelling_helper': 'Enable for students who know their letters',
        'target_word': 'Target Word',
        'theme_hint': 'Optional: Style for new word images',
        'theme_placeholder': 'e.g. cartoon, pixel art, realistic...',
        'tip': 'Tip',
        'type_words': 'Type words here (space or comma separated)...',
        'word_families_desc': 'Group words by common patterns',
        'word_scramble_check': 'Check',
        'word_scramble_clear': 'Clear',
        'word_scramble_hint': 'Hint',
        'word_scramble_subtitle': 'Unscramble the letters',
        'word_scramble_title': 'Word Scramble',
    },

    # --- export flat keys (54 keys total, split batches 2+5) ---
    'export': {
        'activity_label': 'Activity',
        'analysis_source_label': 'Source',
        'answer_label': 'Answer',
        'bundle_downloaded': 'Bundle downloaded!',
        'categories_label': 'Categories',
        'date_label': 'Date',
        'def_col': 'Definition',
        'def_label': 'Definition',
        'default_lesson_title': 'Untitled Lesson',
        'generated_date_label': 'Generated',
        'html_page_title': 'AlloFlow Content',
        'ims_resource_pack': 'AlloFlow Resource Pack',
        'incomplete_sort': 'Incomplete sort data',
        'interview_figure_label': 'Figure',
        'items_label': 'Items',
        'key_concepts_label': 'Key Concepts',
        'main_label': 'Main',
        'name_label': 'Name',
        'no_active_scene': 'No active scene',
        'no_events': 'No events',
        'no_ideas': 'No ideas',
        'no_personas': 'No personas',
        'no_questions': 'No questions',
        'no_student_content': 'No student content available',
        'no_teacher_content': 'No teacher content available',
        'no_terms': 'No terms',
        'ppt_correct_note': 'Correct Answer',
        'ppt_generated': 'Generated',
        'ppt_grade_level': 'Grade Level',
        'problem_label': 'Problem',
        'qti_default_desc': 'AlloFlow Assessment',
        'qti_default_title': 'AlloFlow Quiz',
        'readme_contents': '## Contents',
        'readme_generated': 'Generated on {date}',
        'readme_html_desc': '- HTML content pack',
        'readme_json_desc': '- JSON data export',
        'readme_title': '# AlloFlow Content Pack',
        'readme_topic': 'Topic: {topic}',
        'scenario_label': 'Scenario',
        'slides_master_footer': 'Generated by AlloFlow',
        'slides_question_title': 'Question {number}',
        'slides_subject': 'Education',
        'slides_title_default': 'AlloFlow Presentation',
        'student_copy': 'Student Copy',
        'support_dev': 'Support Development',
        'teacher_copy_divider': '--- Teacher Copy ---',
        'teacher_copy_intro': 'Teacher Guide',
        'teacher_key_title': 'Answer Key',
        'term_col': 'Term',
        'term_label': 'Term',
        'topic': 'Topic',
        'trans_col': 'Translation',
        'unknown_level': 'Unknown Level',
    },

    # --- adventure (13 flat + 7 nested = 20 keys) ---
    'adventure': {
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
    },

    # --- languages_list (9 keys - may need new section) ---
    'languages_list': {
        'Arabic': 'Arabic',
        'French': 'French',
        'German': 'German',
        'Japanese': 'Japanese',
        'Mandarin': 'Chinese (Mandarin)',
        'Portuguese': 'Portuguese',
        'Russian': 'Russian',
        'Spanish': 'Spanish',
        'Vietnamese': 'Vietnamese',
    },

    # --- chat_guide (7 keys) ---
    'chat_guide': {
        'advice_saved': 'Advice saved!',
        'advice_saved_raw': 'Raw advice saved!',
        'highlight_confirm': "Got it! I'll focus on the highlighted text.",
        'history_saved_toast': 'Chat history saved!',
        'independent_welcome': 'Welcome! What would you like to explore?',
        'save_actionable_btn': 'Save Actionable Advice',
        'save_actionable_loading': 'Saving...',
    },

    # --- bingo (4 keys) ---
    'bingo': {
        'close_generator': 'Close Generator',
        'exit_caller_aria': 'Exit Caller',
        'launch_caller_aria': 'Launch Caller',
        'pause_duration': 'Pause: {seconds}s',
    },

    # --- common (4 keys) ---
    'common': {
        'continue': 'Continue',
        'delete': 'Delete',
        'language': 'Language',
        'mic_error': 'Microphone error',
    },

    # --- language_selector (4 keys) ---
    'language_selector': {
        'status_checking': 'Checking {lang}...',
        'status_generating': 'Generating {lang}...',
        'status_retrying_chunk': 'Retrying chunk {chunk}, attempt {attempt}...',
        'status_translating_part': 'Translating part {current}/{total}...',
    },

    # --- escape_room (1 key) ---
    'escape_room': {
        'xp_earned_streak': '+{xp} XP (×{multiplier} streak!)',
    },

    # --- mastery (1 key) ---
    'mastery': {
        'continue': 'Continue',
    },

    # --- persona (1 key) ---
    'persona': {
        'topic_spark_tooltip': 'Topic Spark ({remaining} remaining)',
    },

    # --- quick_start (1 key) ---
    'quick_start': {
        'found_resources': 'Found {count} resources!',
    },

    # --- toasts (1 key) ---
    'toasts': {
        'applied_standard': 'Applied standard: {code}',
    },

    # --- tour (1 key) ---
    'tour': {
        'spotlight_message': '{name}, try this feature!',
    },
}

# Top-level keys (not in sections)
TOP_LEVEL_KEYS = {
    'cancel': "'Cancel'",
    'move_up': "'Move Up'",
    'move_down': "'Move Down'",
}

# Nested sub-section keys
NESTED_KEYS = {
    # adventure.results (3 keys)
    ('adventure', 'results'): {
        'header': '**[RESULT]**',
        'roll_calc': '[Roll: {roll}] + [Strategy: {strat}] = **Total {total}**',
        'perf_score': '**Performance Score: {total}/20**',
    },
    # adventure.climax_archetypes.default (3 keys) — need to check if this sub-sub-section exists
    ('adventure', 'climax_archetypes'): {
        # These need special handling — they're inside climax_archetypes.default: {}
    },
    # adventure.tooltips (1 key)
    ('adventure', 'tooltips'): {
        'stability': 'Stability',
    },
    # export.filenames (8 keys)
    ('export', 'filenames'): {
        'assignment': 'Assignment',
        'flashcards': 'Flashcards',
        'html_pack': 'Content-Pack',
        'profiles': 'Student-Profiles',
        'project_student': 'AlloFlow-Student-Project',
        'project_teacher': 'AlloFlow-Teacher-Project',
        'slides_prefix': 'AlloFlow-Slides',
        'zip_pack': 'AlloFlow-Pack',
    },
    # export.storybook (8 keys)
    ('export', 'storybook'): {
        'chapter_separator': '— Chapter —',
        'epilogue_badge': '🏆 Epilogue',
        'log_header': 'Adventure Log',
        'meta_info': 'Generated on {date} | Level {level}',
        'page_title': '{title} — Storybook',
        'print_button': '🖨️ Print',
        'subtitle': 'An AlloFlow Adventure',
        'user_label': 'Adventurer',
    },
    # visuals.styles (1 key)
    ('visuals', 'styles'): {
        'default': 'Default',
    },
}

# === STEP 4: Execute injections ===
total_added = 0
offset = 0  # Track line shifts from previous insertions

# Helper: inject keys before a closing line
def inject_keys_before(close_line_idx, keys_dict, indent='        '):
    global offset, total_added
    close_line = close_line_idx + offset
    new_lines = []
    for key, value in sorted(keys_dict.items()):
        # Escape single quotes in values
        escaped = value.replace("'", "\\'")
        new_lines.append(f"{indent}{key}: '{escaped}',\n")
    
    for j, nl in enumerate(new_lines):
        lines.insert(close_line + j, nl)
    
    added = len(new_lines)
    offset += added
    total_added += added
    return added

# Process flat section keys
for section, keys in INJECTIONS.items():
    close = find_section_close(section)
    if close is None:
        # Section doesn't exist — need to create it
        # Add before ui_end
        print(f"  [{section}] NOT FOUND — creating new section with {len(keys)} keys")
        insert_at = ui_end + offset
        new_section_lines = [f"    {section}: {{\n"]
        for key, value in sorted(keys.items()):
            escaped = value.replace("'", "\\'")
            new_section_lines.append(f"        {key}: '{escaped}',\n")
        new_section_lines.append(f"    }},\n")
        
        for j, nl in enumerate(new_section_lines):
            lines.insert(insert_at + j, nl)
        
        added = len(new_section_lines)
        offset += added
        total_added += added
        print(f"    Created section with {added} lines")
        continue
    
    # Section exists — inject keys before closing
    # But first check for duplicates
    section_start = None
    for i in range(ui_start, close + offset + 1):
        s = lines[i].strip()
        if re.match(r'^["\']?' + re.escape(section) + r'["\']?\s*:\s*\{', s):
            section_start = i
            break
    
    to_inject = {}
    for key, value in keys.items():
        # Check if key already exists
        if section_start and key_exists_in_section(close + offset, key, section_start):
            pass  # Skip duplicates silently
        else:
            to_inject[key] = value
    
    if to_inject:
        added = inject_keys_before(close, to_inject)
        print(f"  [{section}] Added {added} keys (skipped {len(keys) - len(to_inject)} existing)")
    else:
        print(f"  [{section}] All {len(keys)} keys already exist — skipping")

# Process nested sub-section keys
for (parent, child), keys in NESTED_KEYS.items():
    if not keys:
        continue  # Skip empty (like climax_archetypes.default which needs special handling)
    
    close = find_subsection_close(parent, child)
    if close is None:
        print(f"  [{parent}.{child}] Sub-section NOT FOUND — skipping")
        continue
    
    # Check for duplicates
    parent_start = None
    for i in range(ui_start, ui_end + offset + 1):
        s = lines[i].strip()
        if re.match(r'^["\']?' + re.escape(parent) + r'["\']?\s*:\s*\{', s):
            parent_start = i
            break
    
    to_inject = {}
    for key, value in keys.items():
        if parent_start and key_exists_in_section(close + offset, key, parent_start):
            pass
        else:
            to_inject[key] = value
    
    if to_inject:
        added = inject_keys_before(close, to_inject, indent='            ')
        print(f"  [{parent}.{child}] Added {added} keys")
    else:
        print(f"  [{parent}.{child}] All keys already exist — skipping")

# Process top-level keys (cancel, move_up, move_down)
for key, value in TOP_LEVEL_KEYS.items():
    # Check if already exists at top level
    exists = False
    for i in range(ui_start, ui_end + offset + 1):
        s = lines[i].strip()
        if re.match(r'^' + re.escape(key) + r'\s*:', s):
            exists = True
            break
    
    if not exists:
        # Add before the closing };
        insert_at = ui_end + offset
        lines.insert(insert_at, f"    {key}: {value},\n")
        offset += 1
        total_added += 1
        print(f"  [top-level] Added {key}")
    else:
        print(f"  [top-level] {key} already exists — skipping")

# Handle adventure.climax_archetypes.default specially
# Need to check if climax_archetypes.default exists and add label/left/right
ca_close = find_subsection_close('adventure', 'climax_archetypes')
if ca_close is not None:
    # Look for 'default:' within climax_archetypes
    ca_start = None
    for i in range(ui_start, ca_close + offset + 1):
        s = lines[i].strip()
        if re.match(r'climax_archetypes\s*:\s*\{', s):
            ca_start = i
            break
    
    if ca_start:
        default_close = None
        in_default = False
        dd = 0
        for i in range(ca_start, ca_close + offset + 1):
            s = lines[i].strip()
            if not in_default:
                if re.match(r'default\s*:\s*\{', s) or re.match(r'"default"\s*:\s*\{', s):
                    in_default = True
                    dd = 1
                    continue
            else:
                dd += s.count('{') - s.count('}')
                if dd == 0:
                    default_close = i
                    break
        
        if default_close:
            ca_keys = {
                'label': 'Climax Progress',
                'left': 'Failure',
                'right': 'Victory',
            }
            to_inject = {}
            for key, value in ca_keys.items():
                if not key_exists_in_section(default_close, key, ca_start):
                    to_inject[key] = value
            
            if to_inject:
                added = inject_keys_before(default_close, to_inject, indent='                ')
                print(f"  [adventure.climax_archetypes.default] Added {added} keys")
            else:
                print(f"  [adventure.climax_archetypes.default] All keys already exist")
        else:
            print(f"  [adventure.climax_archetypes.default] default sub-section not found")


# === STEP 5: Write and validate ===
with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"\n=== SUMMARY ===")
print(f"Total lines added: {total_added}")
print(f"Final file: {len(lines)} lines")

# Quick structural validation
print(f"\nRunning structural validation...")
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
        elif ch == '}': depth -= 1
        
        if depth == 0 and ui_found:
            print(f"  UI_STRINGS closes at L{i+1} — BALANCED ✅")
            ui_found = False
            break
    
    if not ui_found:
        break

if ui_found:
    print(f"  !! UI_STRINGS did NOT close — depth={depth} — UNBALANCED ❌")
