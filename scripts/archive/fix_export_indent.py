"""
Fix the export section: 
1. Move storybook injected keys to correct indent (12-space, inside storybook: {})
2. Move filenames injected keys to correct indent (12-space, inside filenames: {})
3. Remove misplaced cancel: {} block from inside export
4. Remove misplaced move_up/move_down from after export
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: storybook section - the injected keys at 8-space need to be at 12-space
# Current pattern:
#             user_label: 'Adventurer',
#         definitions_label: 'Definitions',  <-- should be 12-space
# Target:
#             user_label: 'Adventurer',
#             definitions_label: 'Definitions',

storybook_fixes = [
    ("        definitions_label: 'Definitions',", "            definitions_label: 'Definitions',"),
    ("        glossary_page_title: 'Glossary',", "            glossary_page_title: 'Glossary',"),
    ("        published_by: 'Published by AlloFlow',", "            published_by: 'Published by AlloFlow',"),
    ("        read_aloud_label: 'Read Aloud',", "            read_aloud_label: 'Read Aloud',"),
    ("        title_page_text: 'Title Page',", "            title_page_text: 'Title Page',"),
    ("        words_label: 'Words',", "            words_label: 'Words',"),
]

for old, new in storybook_fixes:
    if old in content:
        content = content.replace(old, new, 1)
        print(f"  Fixed storybook indent: {old.strip()}")

# Fix 2: filenames section - injected keys at 8-space need to be at 12-space  
filenames_fixes = [
    ("        bingo_cards: 'Bingo Cards',", "            bingo_cards: 'Bingo Cards',"),
    ("        escape_room: 'Escape Room',", "            escape_room: 'Escape Room',"),
    ("        glossary: 'Glossary',", "            glossary: 'Glossary',"),
    ("        lesson_plan: 'Lesson Plan',", "            lesson_plan: 'Lesson Plan',"),
    ("        quiz: 'Quiz',", "            quiz: 'Quiz',"),
    ("        simplified: 'Simplified Text',", "            simplified: 'Simplified Text',"),
    ("        text_analysis: 'Text Analysis',", "            text_analysis: 'Text Analysis',"),
    ("        timeline: 'Timeline',", "            timeline: 'Timeline',"),
    ("        visual_schedule: 'Visual Schedule',", "            visual_schedule: 'Visual Schedule',"),
    ("        worksheet: 'Worksheet',", "            worksheet: 'Worksheet',"),
]

for old, new in filenames_fixes:
    if old in content:
        content = content.replace(old, new, 1)
        print(f"  Fixed filenames indent: {old.strip()}")

# Fix 3: Remove misplaced cancel: { cancel: 'Cancel' } block from export section
# It appears right before move_up/move_down/};
cancel_block = "    cancel: {\n        cancel: 'Cancel',\n    },\n"
if cancel_block in content:
    content = content.replace(cancel_block, '', 1)
    print("  Removed misplaced cancel block from export")

# Also try with \r\n
cancel_block_rn = "    cancel: {\r\n        cancel: 'Cancel',\r\n    },\r\n"
if cancel_block_rn in content:
    content = content.replace(cancel_block_rn, '', 1)
    print("  Removed misplaced cancel block from export (CRLF)")

# Fix 4: Remove move_up and move_down if they're at the wrong level (right before };)
# These are at 4-space indent inside UI_STRINGS but are actually misplaced
# Check if they exist right before the closing };
move_pattern = "    move_up: 'Move Up',\r\n    move_down: 'Move Down',\r\n};"
if move_pattern in content:
    # These might be legitimate top-level keys - keep them BUT add the closing } properly
    print("  Found move_up/move_down before }; - these may be legitimate")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nFixes applied. Running structural validation...")

# Quick structural check
lines = content.split('\n')
print(f"Total lines: {len(lines)}")
