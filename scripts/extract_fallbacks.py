"""Extract fallback text for missing keys by examining code context."""
import re

SRC_FILE = 'AlloFlowANTI.txt'

# Keys without fallback text from the first pass
KEYS_NEEDING_FALLBACK = [
    'adventure.tooltips.stability',
    'bingo.exit_caller_aria',
    'common.family_guide',
    'common.family_learning_guide',
    'common.study_guide',
    'common.udl_aligned',
    'common.udl_lesson_plan',
    'escape_room.all_solved_bonus',
    'escape_room.xp_earned_streak',
    'language_selector.status_retrying_chunk',
    'meta.processing_sections',
    'persona.topic_spark_tooltip',
    'tour.spotlight_message',
    'errors.load_failed',  # check this one too
    'meta.multi_part',
]

with open(SRC_FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for key in KEYS_NEEDING_FALLBACK:
    print(f"\n--- {key} ---")
    for i, line in enumerate(lines, 1):
        if f"'{key}'" in line or f'"{key}"' in line:
            # Show context: 1 line before and after
            start = max(0, i - 2)
            end = min(len(lines), i + 1)
            for j in range(start, end):
                marker = ' >>>' if j == i - 1 else '    '
                print(f"  {marker} L{j+1}: {lines[j].rstrip()[:150]}")
            break
    else:
        print(f"  (not found as literal string)")
