"""
Part A: Rename word_families -> sound_sort
- All 29 references
- Migration shim for lessonPlan
- Updated localization strings

Strategy: Line-targeted replacements to avoid false positives.
The key insight is that 'word_families' appears in two contexts:
1. As an activity ID (these ALL change to 'sound_sort')
2. In localization key prefixes like 'word_sounds.word_families_*' (rename to 'word_sounds.sound_sort_*')

We do NOT touch 'WordFamiliesView' component name since that's the UI component
shared by both sound_sort AND the new true word_families activity.
"""

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('\r\n', '\n')
changes = 0

# ================================================================
# IMPORTANT: Collect all target lines before modifying
# to ensure we don't create ambiguity
# ================================================================

# Group 1: Localization keys in UI_STRINGS (rename key prefix)
replacements = [
    # L765 - activity label key
    ("'word_sounds.activity_word_families': 'Word Families'",
     "'word_sounds.activity_sound_sort': 'Sound Sort'"),
    # L766 - description key
    ("'word_sounds.word_families_desc': 'Match words with the same start or end sound'",
     "'word_sounds.sound_sort_desc': 'Sort words by matching sounds'"),
    # L800 - prompt key
    ("'word_sounds.word_families_prompt': 'Which words match the sound?'",
     "'word_sounds.sound_sort_prompt': 'Which words match the sound?'"),
    
    # Component localization keys (L4287-4343)
    ("ts('word_sounds.word_families_label') || 'Sound Match'",
     "ts('word_sounds.sound_sort_label') || 'Sound Sort'"),
    ("ts('word_sounds.word_families_instruction')",
     "ts('word_sounds.sound_sort_instruction')"),
    ("ts('word_sounds.word_families_found') || 'found'",
     "ts('word_sounds.sound_sort_found') || 'found'"),
    ("ts('word_sounds.word_families_complete') || 'Family Complete!",
     "ts('word_sounds.sound_sort_complete') || 'All Matched!"),
    ("ts('word_sounds.word_families_wrong_hint')",
     "ts('word_sounds.sound_sort_wrong_hint')"),

    # Activity selector (L4506)
    ("{ id: 'word_families', label: ts('word_sounds.activity_word_families') || 'Word Families', icon: '\U0001f3e0'",
     "{ id: 'sound_sort', label: ts('word_sounds.activity_sound_sort') || 'Sound Sort', icon: '\U0001f50a'"),
    ("ts('word_sounds.word_families_desc') || 'Explore related words'",
     "ts('word_sounds.sound_sort_desc') || 'Sort words by shared sounds'"),

    # Activity defs in lesson plan (L2167)
    ("word_families: { id: 'word_families', label: 'Word Families', icon: Users }",
     "sound_sort: { id: 'sound_sort', label: 'Sound Sort', icon: Users }"),

    # Audio mapping (L1140, L1147)
    ("word_families: getAudio('instructions', 'word_families')",
     "sound_sort: getAudio('instructions', 'word_families')"),  # Keep audio file ref same
    ("word_families_house: getAudio('instructions', 'word_families')",
     "sound_sort_house: getAudio('instructions', 'word_families')"),

    # Scaffolding config (L1505)
    ("'word_families':  'progressive',       // Standard scaffolding",
     "'sound_sort':     'progressive',       // Standard scaffolding"),

    # Lesson plan state (L1533)
    ("word_families: { enabled: false, count: 5 },",
     "sound_sort: { enabled: false, count: 5 },"),

    # Lesson plan order (L1538)
    ("'letter_tracing', 'counting', 'mapping', 'word_families', 'word_scramble'",
     "'letter_tracing', 'counting', 'mapping', 'sound_sort', 'word_scramble'"),

    # Scaffolding config duplicate (L3271)
    ("'word_families':  'progressive',",
     "'sound_sort':     'progressive',"),

    # Image visibility config (L3287)
    ("'word_families':  'afterAnswer',  // Focus on sound patterns; reveal after",
     "'sound_sort':     'afterAnswer',  // Focus on sound patterns; reveal after"),

    # Instruction audio key mapping (L6726)
    ("word_families: 'inst_word_families'",
     "sound_sort: 'inst_word_families'"),

    # Instruction chain branch (L6774)
    ("} else if (wordSoundsActivity === 'word_families') {",
     "} else if (wordSoundsActivity === 'sound_sort') {"),

    # Instruction audio auto-play (L6898)
    ("if (wordSoundsActivity === 'word_families' && currentWordSoundsWord)",
     "if (wordSoundsActivity === 'sound_sort' && currentWordSoundsWord)"),

    # Option update handler (L7649)
    ("} else if (wordSoundsActivity === 'word_families') {",
     "} else if (wordSoundsActivity === 'sound_sort') {"),

    # Render case (L9194)
    ("case 'word_families': {",
     "case 'sound_sort': {"),
]

for old, new in replacements:
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1
    else:
        print(f"WARNING: not found: {old[:60]}...")

# Handle localization keys that were added by our patches
patch_keys = [
    ("'word_sounds.word_families_label': 'Sound Match'",
     "'word_sounds.sound_sort_label': 'Sound Sort'"),
    ("'word_sounds.word_families_instruction': 'Find all words that match the sound!'",
     "'word_sounds.sound_sort_instruction': 'Find all words that match the sound!'"),
    ("'word_sounds.word_families_found': 'found'",
     "'word_sounds.sound_sort_found': 'found'"),
    ("'word_sounds.word_families_wrong_hint': \"doesn't match the sound\"",
     "'word_sounds.sound_sort_wrong_hint': \"doesn't match the sound\""),
]
for old, new in patch_keys:
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

# Handle the 'Family Complete' key with emoji
old_complete_key = "'word_sounds.word_families_complete': 'Family Complete!"
new_complete_key = "'word_sounds.sound_sort_complete': 'All Matched!"
if old_complete_key in content:
    # Find the full line
    idx = content.find(old_complete_key)
    eol = content.find('\n', idx)
    old_line = content[idx:eol]
    new_line = old_line.replace('word_sounds.word_families_complete', 'word_sounds.sound_sort_complete').replace('Family Complete!', 'All Matched!')
    content = content.replace(old_line, new_line, 1)
    changes += 1

# Spanish/other locale strings (L11425-11426, L13555-13557)
locale_reps = [
    ("activity_word_families: \"Word Families\"",
     "activity_sound_sort: \"Sound Sort\""),
    ("word_families_desc: \"Explore patterns\"",
     "sound_sort_desc: \"Sort by sound\""),
    ("activity_word_families: \"Word Families\"",  # Second locale
     "activity_sound_sort: \"Sound Sort\""),
    ("word_families_desc: \"Build the word family house! Find words that belong to the family.\"",
     "sound_sort_desc: \"Sort words by their shared sounds!\""),
    ("word_families_prompt: \"Which words match the sound?\"",
     "sound_sort_prompt: \"Which words match the sound?\""),
]
for old, new in locale_reps:
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

# L1205 instruction audio loading
old_inst = "_LOAD_INSTRUCTION_AUDIO_RAW('inst_word_families'"
new_inst = "_LOAD_INSTRUCTION_AUDIO_RAW('inst_sound_sort'"
if old_inst in content:
    content = content.replace(old_inst, new_inst, 1)
    changes += 1

# ================================================================
# MIGRATION SHIM for lessonPlan persistence
# ================================================================
# Insert after the lessonPlan state initialization
shim_anchor = "const [draggedActivity, setDraggedActivity] = React.useState(null);"
shim_code = """
        // MIGRATION SHIM: Rename word_families -> sound_sort in saved lessonPlan
        React.useEffect(() => {
            if (lessonPlan.word_families) {
                setLessonPlan(prev => {
                    const { word_families, ...rest } = prev;
                    return { ...rest, sound_sort: word_families };
                });
            }
            if (lessonPlanOrder.includes('word_families')) {
                setLessonPlanOrder(prev => prev.map(id => id === 'word_families' ? 'sound_sort' : id));
            }
        }, []);
"""
if shim_anchor in content and 'MIGRATION SHIM' not in content:
    content = content.replace(shim_anchor, shim_anchor + shim_code)
    changes += 1
    print("Added migration shim for lessonPlan persistence")

# ================================================================
# Verify no stale word_families activity IDs remain
# (WordFamiliesView component name stays — shared by both activities)
# ================================================================

print(f"\nTotal changes: {changes}")

# Save
content = content.replace('\n', '\r\n')
with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print(f"Saved ({len(content)} chars)")

# Verify remaining references
content_check = content.replace('\r\n', '\n')
remaining = []
for i, line in enumerate(content_check.split('\n'), 1):
    if 'word_families' in line and 'WordFamiliesView' not in line and 'MIGRATION SHIM' not in line and 'word_families' not in line.split('//')[0] if '//' in line else 'word_families' in line:
        remaining.append(f"  L{i}: {line.strip()[:100]}")
# Actually let's be more precise
remaining2 = []
for i, line in enumerate(content_check.split('\n'), 1):
    stripped = line.strip()
    if 'word_families' in stripped and 'WordFamiliesView' not in stripped:
        remaining2.append(f"  L{i}: {stripped[:100]}")
if remaining2:
    print(f"\nRemaining 'word_families' references ({len(remaining2)}):")
    for r in remaining2[:20]:
        print(r)
else:
    print("\nNo remaining 'word_families' references (excluding WordFamiliesView)!")
