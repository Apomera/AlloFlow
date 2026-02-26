"""Check which keys are still missing after the nuclear fix"""
import re

FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
content = f.read()
f.close()

# Quick check: which of our keys exist?
keys_to_check = {
    'gauge_aligned': 'simplified',
    'hide_answer': 'quiz', 
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
}

for key, section in sorted(keys_to_check.items()):
    found = key + ':' in content or key + ': ' in content
    print(("OK  " if found else "MISS") + "  " + section + "." + key)
