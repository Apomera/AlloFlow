"""Check which keys are still missing after the nuclear fix - output to file"""
import re

FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
content = f.read()
f.close()

keys_to_check = {
    'gauge_aligned': 'simplified', 'complexity_rubric_title': 'simplified',
    'gauge_complex': 'simplified', 'gauge_simple': 'simplified',
    'hide_answer': 'quiz', 'reveal_answer': 'quiz',
    'no_hint_available': 'escape_room',
    'generation_failed': 'errors',
    'coming_soon': 'common',
    'close_generator': 'bingo',
    'advice_saved': 'chat_guide',
    'set_btn': 'timer',
    'brainstorming_start': 'bot_events',
    'drafting_story_outline': 'input',
    'col_image': 'output',
    'pro_tip_label': 'tips',
    'spotlight_title': 'tour',
    'copied_to_clipboard': 'toasts',
    'waiting_for_students': 'session',
    'grammar_fix_truncation': 'process',
    'generating': 'status',
    'brainstorming': 'status_steps',
    'article_imported': 'quick_start',
    'adjectives': 'codenames',
    'alert_invalid_json': 'language_selector',
}

out = open('_check_results.txt', 'w')
missing = []
for key, section in sorted(keys_to_check.items()):
    found = (key + ': "') in content or (key + ':') in content
    status = "OK  " if found else "MISS"
    out.write(status + "  " + section + "." + key + "\n")
    if not found:
        missing.append(section + "." + key)

out.write("\nMissing: " + str(len(missing)) + "\n")
for m in missing:
    out.write("  " + m + "\n")
out.close()

print("Missing: " + str(len(missing)))
for m in missing:
    print("  " + m)
