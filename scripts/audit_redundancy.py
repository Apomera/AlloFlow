"""
Deep redundancy check: read actual HELP_STRINGS text content for each unwired key 
and its existing wired siblings, compare meaningfully.
Also find UI elements that should get data-help-key.
"""
import re, json

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# === Step 1: Extract HELP_STRINGS block (L35079-35900 approximately) ===
# Find help strings definitions with full content
help_texts = {}
for i, line in enumerate(lines):
    stripped = line.strip()
    # Match 'key_name': "long text here...",
    m = re.match(r"'(\w+)'\s*:\s*\"(.+)\",?\s*$", stripped)
    if not m:
        m = re.match(r"'(\w+)'\s*:\s*'(.+)',?\s*$", stripped)
    if m and len(m.group(1)) > 3:
        help_texts[m.group(1)] = {'line': i+1, 'text': m.group(2)}

# === Step 2: Find all data-help-key usage ===
used_keys = {}
for i, l in enumerate(lines):
    for m in re.finditer(r'data-help-key="([^"]+)"', l):
        used_keys[m.group(1)] = i+1
    for m in re.finditer(r"data-help-key='([^']+)'", l):
        used_keys[m.group(1)] = i+1

# === Step 3: Analyze each unwired key ===
unwired = [
    'alignment_generate_button','alignment_grade_select','alignment_standard_select',
    'brainstorm_simulation_detailed','brainstorm_step_count_detailed',
    'concept_sort_categories_detailed','concept_sort_input','concept_sort_item_count',
    'glossary_word_sounds','group_karaoke_toggle',
    'header_actions','header_tools','header_utils','header_settings',
    'math_difficulty','math_problem_count','math_show_work',
    'persona_selection','persona_custom_instructions_detailed','persona_free_response_detailed','persona_mode_toggle',
    'quiz_difficulty_mix','quiz_question_types',
    'timeline_count_detailed','timeline_topic_detailed',
    'visuals_low_quality','word_sounds_mic',
    'lesson_plan_assessment','lesson_plan_differentiation','lesson_plan_duration',
    'lesson_plan_generate_button','lesson_plan_objectives',
    'escape_room_matching_columns','escape_room_matching_submit',
    'escape_room_sequence_check','escape_room_sequence_list',
]

report = []
for key in unwired:
    # Get feature prefix
    parts = key.split('_')
    if parts[0] in ('concept', 'escape', 'lesson', 'word', 'group'):
        feature = parts[0] + '_' + parts[1]
    else:
        feature = parts[0]
    
    # Check if this key has help text content
    has_text = key in help_texts
    text_preview = help_texts[key]['text'][:120] if has_text else 'NO HELP TEXT DEFINED'
    text_line = help_texts[key]['line'] if has_text else 0
    
    # Find wired siblings with help text
    wired_siblings = {}
    for uk in used_keys:
        if uk.startswith(feature + '_') or uk == feature:
            if uk in help_texts:
                wired_siblings[uk] = help_texts[uk]['text'][:120]
    
    # Check for content-level redundancy
    is_redundant = False
    redundant_with = None
    if has_text:
        this_text = help_texts[key]['text'].lower()
        for sib_key, sib_text in wired_siblings.items():
            sib_lower = sib_text.lower()
            # Check significant word overlap
            this_words = set(w for w in re.findall(r'\w{5,}', this_text))
            sib_words = set(w for w in re.findall(r'\w{5,}', sib_lower))
            if this_words and sib_words:
                overlap = len(this_words & sib_words) / min(len(this_words), len(sib_words))
                if overlap > 0.6:
                    is_redundant = True
                    redundant_with = sib_key
                    break
    
    report.append({
        'key': key,
        'line': text_line,
        'has_text': has_text,
        'text': text_preview,
        'redundant': is_redundant,
        'redundant_with': redundant_with,
        'wired_sibling_count': len(wired_siblings),
    })

# Output
redundant = [r for r in report if r['redundant']]
no_text = [r for r in report if not r['has_text']]
unique = [r for r in report if r['has_text'] and not r['redundant']]

print('=== SUMMARY ===')
print('Total unwired: %d' % len(report))
print('Has help text + unique: %d (WIRE THESE)' % len(unique))
print('Has help text + redundant: %d (DELETE)' % len(redundant))
print('No help text defined: %d (CONFIG-ONLY, DELETE)' % len(no_text))
print()

print('=== REDUNDANT (delete help text) ===')
for r in redundant:
    print('  %s L%d -> %s' % (r['key'], r['line'], r['redundant_with']))
    print('    Text: %s' % r['text'][:80])
print()

print('=== NO HELP TEXT (config mapping only) ===')
for r in no_text:
    print('  %s (only in config mapping, no help text)' % r['key'])
print()

print('=== UNIQUE (wire to UI) ===')
for r in unique:
    print('  %s L%d (%d siblings)' % (r['key'], r['line'], r['wired_sibling_count']))
    print('    Text: %s...' % r['text'][:80])

# Save JSON
with open('redundancy_deep.json', 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=2, ensure_ascii=True)
