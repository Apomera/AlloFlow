"""
Smart Key Injector: Adds missing UI_STRINGS keys WITHOUT comment markers.
Uses brace-aware section finding to insert only string-type keys at proper depth.
Skips sections that use arrays or non-string values.
Strips braces from within quoted strings before counting depth.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# === Find UI_STRINGS boundaries ===
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

print(f"UI_STRINGS: L{ui_start+1} to L{ui_end+1}")

# === Strip string contents to get structural braces only ===
def structural_braces(line):
    """Count { and } that are NOT inside string literals."""
    result = ''
    in_str = None
    escape = False
    for ch in line:
        if escape:
            escape = False
            continue
        if ch == '\\':
            escape = True
            continue
        if ch in ('"', "'", '`'):
            if in_str is None:
                in_str = ch
            elif in_str == ch:
                in_str = None
            continue
        if in_str is None:
            result += ch
    return result.count('{'), result.count('}')

# === Extract defined keys with string-aware brace counting ===
defined_keys = set()
path_stack = []
in_comment = False

for i in range(ui_start, ui_end + 1):
    line = lines[i]
    stripped = line.strip()
    if '/*' in stripped: in_comment = True
    if '*/' in stripped: in_comment = False; continue
    if in_comment or stripped.startswith('//'): continue
    
    opens, closes = structural_braces(line)
    
    m = re.match(r'^[\s]*"?(\w+)"?\s*:\s*[\[{]', stripped)
    if m and '{' in stripped:  # Section open
        path_stack.append(m.group(1))
        net = opens - closes
        if net <= 0:
            path_stack.pop()  # One-liner section
        continue
    
    m = re.match(r'^[\s]*"?(\w+)"?\s*:\s*[\'"`]', stripped)
    if m:
        full_key = '.'.join(path_stack + [m.group(1)])
        defined_keys.add(full_key)
        continue
    
    # Close braces
    net_close = closes - opens
    for _ in range(net_close):
        if path_stack: path_stack.pop()

print(f"Defined keys: {len(defined_keys)}")

# === Load orphan list from build_orphan_patch output ===
# Read the orphan patch data to get key -> fallback value mappings  
orphan_data = {}
try:
    with open('orphan_patch.txt', 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            m = re.match(r"^(.+?)\s*=\s*(.+)$", line)
            if m:
                orphan_data[m.group(1)] = m.group(2)
except FileNotFoundError:
    pass

# === Hardcoded missing keys from the diagnostic ===
all_keys_needed = {
    # Tour
    'tour.spotlight_message': 'Spotlight Message',
    # Word sounds (39 keys)
    'word_sounds.activity_length': '🎯 Items per Session',
    'word_sounds.activity_length_hint': 'Session completes after this many correct answers',
    'word_sounds.add_word': 'Add a word...',
    'word_sounds.blend_sounds': 'Blend Sounds',
    'word_sounds.correct_answer': '✅ Correct!',
    'word_sounds.custom_words_subtitle': 'Custom Words',
    'word_sounds.edit': 'Edit',
    'word_sounds.empty_bank_subtitle': 'Your word bank is empty',
    'word_sounds.empty_bank_title': 'No Words Yet',
    'word_sounds.exit': 'Exit',
    'word_sounds.exit_activity': 'Exit Activity',
    'word_sounds.find_sounds': 'Find Sounds',
    'word_sounds.flip_card': 'Flip Card',
    'word_sounds.hint': 'Hint',
    'word_sounds.image_alt_text': 'Image for {word}',
    'word_sounds.incorrect_answer': '❌ Try Again',
    'word_sounds.letter_tracing': 'Letter Tracing',
    'word_sounds.letter_tracing_subtitle': 'Practice Writing Letters',
    'word_sounds.next': 'Next →',
    'word_sounds.next_word': 'Next Word',
    'word_sounds.phoneme_display_label': 'Phonemes',
    'word_sounds.play_word': '🔊 Play Word',
    'word_sounds.progress': 'Progress',
    'word_sounds.replay': 'Replay',
    'word_sounds.results_title': '🏆 Results',
    'word_sounds.rhyme_time': 'Rhyme Time',
    'word_sounds.rhyme_time_subtitle': 'Find the Rhyming Word',
    'word_sounds.select_activity': 'Select Activity',
    'word_sounds.session_complete_title': '🎉 Session Complete!',
    'word_sounds.settings': '⚙️ Settings',
    'word_sounds.show_answer': 'Show Answer',
    'word_sounds.skip_word': 'Skip',
    'word_sounds.start_activity': 'Start Activity',
    'word_sounds.submit_response': 'Submit',
    'word_sounds.subtitle': 'Phonemic Awareness Activities',
    'word_sounds.syllable_clap': 'Syllable Clap',
    'word_sounds.title': 'Word Sounds Studio',
    'word_sounds.try_again': 'Try Again',
    'word_sounds.word_bank': 'Word Bank',
    # Export (70 keys - major groups)
    'export.filenames.assignment': 'Assignment',
    'export.filenames.bingo_cards': 'Bingo Cards',
    'export.filenames.escape_room': 'Escape Room',
    'export.filenames.flashcards': 'Flashcards',
    'export.filenames.glossary': 'Glossary',
    'export.filenames.lesson_plan': 'Lesson Plan',
    'export.filenames.quiz': 'Quiz',
    'export.filenames.simplified': 'Simplified Text',
    'export.filenames.text_analysis': 'Text Analysis',
    'export.filenames.timeline': 'Timeline',
    'export.filenames.visual_schedule': 'Visual Schedule',
    'export.filenames.worksheet': 'Worksheet',
    'export.storybook.title_page_text': 'Title Page',
    'export.storybook.glossary_page_title': 'Glossary',
    'export.storybook.published_by': 'Published by AlloFlow',
    'export.storybook.words_label': 'Words',
    'export.storybook.read_aloud_label': 'Read Aloud',
    'export.storybook.definitions_label': 'Definitions',
    # Languages list
    'languages_list.Spanish': 'Spanish',
    'languages_list.French': 'French',
    'languages_list.German': 'German',
    'languages_list.Mandarin': 'Mandarin',
    'languages_list.Arabic': 'Arabic',
    'languages_list.Hindi': 'Hindi',
    'languages_list.Portuguese': 'Portuguese',
    'languages_list.Japanese': 'Japanese',
    'languages_list.Korean': 'Korean',
    # Bingo
    'bingo.free_space_label': 'FREE',
    'bingo.grid_heading': 'Bingo Card',
    'bingo.card_number': 'Card #{number}',
    'bingo.subtitle_text': 'Match the definitions to win!',
    # Language selector
    'language_selector.search_placeholder': 'Search languages...',
    'language_selector.popular_label': 'Popular',
    'language_selector.all_label': 'All Languages',
    'language_selector.no_results': 'No languages found',
    # Common
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.retry': 'Retry',
    'common.cancel': 'Cancel',
    # Socratic
    'socratic.question_label': 'Question',
    'socratic.thinking_label': 'Thinking...',
    # Quick start
    'quick_start.paste_label': 'Paste Text',
    # Escape room
    'escape_room.puzzle_label': 'Puzzle',
    # Blueprint
    'blueprint.section_label': 'Section',
    # Toasts
    'toasts.generic_error': 'Something went wrong. Please try again.',
    # Codenames - these are NOT string keys, they're arrays. Skip.
}

# Filter to only truly missing
still_missing = {k: v for k, v in all_keys_needed.items() if k not in defined_keys}
print(f"Still missing: {len(still_missing)} keys")

# === Group by top-level section ===
sections = {}
for key, val in still_missing.items():
    parts = key.split('.')
    top_section = parts[0]
    sections.setdefault(top_section, []).append((key, val))

# === Find section insertion points using string-aware brace counting ===
def find_section_close(section_name):
    """Find the closing brace line for a top-level section in UI_STRINGS."""
    found = False
    depth = 0
    for i in range(ui_start, ui_end + 1):
        s = lines[i].strip()
        if s.startswith('//'):
            continue
        opens, closes = structural_braces(lines[i])
        if not found:
            if re.match(rf'^{re.escape(section_name)}\s*:\s*\{{', s):
                found = True
                depth = opens - closes
                if depth <= 0:
                    return i
                continue
        else:
            depth += opens - closes
            if depth <= 0:
                return i
    return None

def find_sub_section_close(parent_name, sub_name):
    """Find closing brace of a sub-section within a parent section."""
    parent_found = False
    parent_depth = 0
    sub_found = False
    sub_depth = 0
    
    for i in range(ui_start, ui_end + 1):
        s = lines[i].strip()
        if s.startswith('//'):
            continue
        opens, closes = structural_braces(lines[i])
        
        if not parent_found:
            if re.match(rf'^{re.escape(parent_name)}\s*:\s*\{{', s):
                parent_found = True
                parent_depth = opens - closes
                continue
        elif not sub_found:
            parent_depth += opens - closes
            if parent_depth <= 0:
                return None  # Parent closed without finding sub
            if re.match(rf'^{re.escape(sub_name)}\s*:\s*\{{', s):
                sub_found = True
                sub_depth = opens - closes
                if sub_depth <= 0:
                    return i
                continue
        else:
            sub_depth += opens - closes
            if sub_depth <= 0:
                return i
    return None

# === Build insertions ===
insertions = []

for section, items in sorted(sections.items()):
    # Separate flat keys from nested keys
    flat_keys = [(k, v) for k, v in items if k.count('.') == 1]
    nested_keys = [(k, v) for k, v in items if k.count('.') >= 2]
    
    # Insert flat keys before section close
    if flat_keys:
        close_line = find_section_close(section)
        if close_line is not None:
            new_lines_text = []
            for key, val in sorted(flat_keys):
                leaf = key.split('.')[-1]
                val_escaped = val.replace("'", "\\'")
                new_lines_text.append(f"    {leaf}: '{val_escaped}',\n")
            insertions.append((close_line, new_lines_text))
            print(f"  {section}: {len(flat_keys)} flat keys -> before L{close_line+1}")
        else:
            print(f"  !! Cannot find section: {section}")
    
    # Insert nested keys into sub-sections
    if nested_keys:
        # Group by sub-section
        sub_groups = {}
        for key, val in nested_keys:
            parts = key.split('.')
            sub = parts[1]
            leaf = '.'.join(parts[2:])
            sub_groups.setdefault(sub, []).append((leaf, val))
        
        for sub, sub_items in sorted(sub_groups.items()):
            sub_close = find_sub_section_close(section, sub)
            if sub_close is not None:
                new_lines_text = []
                for leaf, val in sorted(sub_items):
                    val_escaped = val.replace("'", "\\'")
                    new_lines_text.append(f"        {leaf}: '{val_escaped}',\n")
                insertions.append((sub_close, new_lines_text))
                print(f"  {section}.{sub}: {len(sub_items)} keys -> before L{sub_close+1}")
            else:
                # Create new sub-section before parent close
                parent_close = find_section_close(section)
                if parent_close is not None:
                    new_lines_text = [f"    {sub}: {{\n"]
                    for leaf, val in sorted(sub_items):
                        val_escaped = val.replace("'", "\\'")
                        new_lines_text.append(f"        {leaf}: '{val_escaped}',\n")
                    new_lines_text.append(f"    }},\n")
                    insertions.append((parent_close, new_lines_text))
                    print(f"  {section}.{sub}: creating new sub-section ({len(sub_items)} keys)")
                else:
                    print(f"  !! Cannot find {section} for sub-section {sub}")

# === Apply insertions bottom-to-top ===
insertions.sort(key=lambda x: x[0], reverse=True)
total_added = 0
for idx, text_lines in insertions:
    for j, tl in enumerate(text_lines):
        lines.insert(idx + j, tl)
    total_added += len(text_lines)

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"\nAdded {total_added} lines via {len(insertions)} insertions")
print(f"Final: {len(lines)} lines")
