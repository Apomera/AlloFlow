"""Exhaustive feature audit - scan every surface of the codebase."""
import json
import re
from pathlib import Path
from collections import defaultdict

c = Path(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt').read_text(encoding='utf-8')
lines = c.split('\n')

# ============================================
# 1. WORD SOUNDS - find ALL activity types
# ============================================
print("=" * 60)
print("WORD SOUNDS ACTIVITIES")
print("=" * 60)

# Search for all word sounds activity references
ws_patterns = [
    'spelling', 'Spelling', 'SPELLING',
    'wordSoundsActivity', 'wordSoundsMode',
    'phonemeActivity', 'activityType',
    'Counting', 'Isolation', 'Blending', 'Segmentation',
    'Rhyming', 'Orthography', 'Mapping', 'Family',
    'letterTrace', 'LetterTrace', 'letter_trace',
    'findSounds', 'Find Sounds', 'find_sounds',
    'blendSounds', 'Blend Sounds', 'blend_sounds',
    'rhymeTime', 'Rhyme Time', 'rhyme_time',
    'wordBuilder', 'Word Builder', 'word_builder',
    'soundCounting', 'Sound Counting',
    'soundIsolation', 'Sound Isolation',
    'spellingBee', 'Spelling Bee', 'spelling_bee',
    'spellingPractice', 'Spelling Practice',
    'spellingTest', 'Spelling Test',
    'dictation', 'Dictation',
]

found_ws = defaultdict(list)
for i, line in enumerate(lines):
    for pat in ws_patterns:
        if pat in line:
            found_ws[pat].append(i+1)

for pat, lns in sorted(found_ws.items()):
    if len(lns) <= 10:
        print(f"  {pat}: {len(lns)} hits -> L{lns}")
    else:
        print(f"  {pat}: {len(lns)} hits -> first 5: L{lns[:5]}")

# Find the word sounds activity enum/list
print("\n--- Looking for activity type lists ---")
for i, line in enumerate(lines):
    if ('wordSound' in line or 'WORD_SOUND' in line) and ('activities' in line.lower() or 'types' in line.lower() or 'modes' in line.lower()):
        print(f"  L{i+1}: {line.strip()[:120]}")

# ============================================
# 2. ALL BUTTON LABELS (reveals features)
# ============================================
print("\n" + "=" * 60)
print("UNIQUE BUTTON LABELS")
print("=" * 60)

# Extract button text from JSX - look for >Text</button> and title="" patterns
button_texts = re.findall(r'>([A-Z][A-Za-z ]{3,30})</button', c)
unique_buttons = sorted(set(button_texts))
print(f"Found {len(unique_buttons)} unique button labels:")
for b in unique_buttons:
    print(f"  {b}")

# ============================================
# 3. ALL HELP_STRINGS / mode-specific help
# ============================================
print("\n" + "=" * 60)
print("HELP_STRINGS KEYS (feature areas)")
print("=" * 60)

help_keys = re.findall(r'HELP_STRINGS\[[\'"]([\w]+)[\'"]\]', c)
unique_help = sorted(set(help_keys))
print(f"Found {len(unique_help)} HELP_STRINGS keys:")
for h in unique_help:
    print(f"  {h}")

# ============================================
# 4. ALL tab/view/mode enum values
# ============================================
print("\n" + "=" * 60)
print("ALL VIEW/TAB/MODE VALUES")
print("=" * 60)

# Active view values
views = re.findall(r"activeView\s*===?\s*'(\w+)'", c)
print(f"activeView values ({len(set(views))}): {sorted(set(views))}")

# Active tab values  
tabs = re.findall(r"activeTab\s*===?\s*'([\w ]+)'", c)
print(f"activeTab values ({len(set(tabs))}): {sorted(set(tabs))}")

# Mode values
modes = re.findall(r"(?:mode|gameMode|quizMode)\s*===?\s*'(\w+)'", c)
print(f"mode values ({len(set(modes))}): {sorted(set(modes))}")

# ============================================
# 5. ALL RESOURCE TYPES
# ============================================
print("\n" + "=" * 60)
print("RESOURCE TYPES")
print("=" * 60)

res_types = re.findall(r"resourceType\s*===?\s*'([\w ]+)'", c)
print(f"resourceType values ({len(set(res_types))}): {sorted(set(res_types))}")

# Also check type field
type_vals = re.findall(r"\.type\s*===?\s*'([\w ]+)'", c)
print(f"type comparisons ({len(set(type_vals))}): {sorted(set(type_vals))}")
