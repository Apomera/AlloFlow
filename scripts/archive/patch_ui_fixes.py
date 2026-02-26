"""
Comprehensive fix patch:
1. Add 26 missing localization keys
2. Fix Sound Sort completion overlay (orphaned string declarations in JSX)
3. Fix WordFamiliesView duplicate speaker (remove emoji, keep Volume2 button)
4. Fix Word Families activity progression (checkAnswer args)
5. Change Rhyme Time image mode to always show picture
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('\r\n', '\n')
changes = 0

# ================================================================
# FIX 1: Add 26 missing localization keys
# ================================================================
missing_keys = '''    activity_missing_letter: "Missing Letter",
    activity_spelling_bee: "Spelling Bee",
    activity_word_scramble: "Word Scramble",
    blending_instruction: "Blend these sounds together",
    blending_replay_sounds: "Replay Sounds",
    mic_switch_mic: "Microphone",
    mic_switch_tapping: "Tapping",
    mic_switch_typing: "Typing",
    missing_letter_desc: "Fill in the missing letter",
    session_msg_good: "Good job!",
    session_msg_great: "Great work!",
    session_msg_nice: "Nice effort!",
    session_msg_outstanding: "Outstanding!",
    session_next_activity: "Next Activity",
    session_words_practiced: "words practiced",
    session_xp_earned: "XP earned",
    sound_sort_complete: "All Matched!",
    sound_sort_instruction: "Find all words that match",
    sound_sort_label: "Sound Sort",
    sound_sort_wrong_hint: "doesn't match",
    spelling_bee_desc: "Spell the word you hear",
    spelling_bee_hint_more: "Show More",
    spelling_bee_hint_vowels: "Show Vowels",
    test_sequence: "Test Sequence",
    tts_speed: "Speech Speed",
    word_scramble_desc: "Unscramble the letters",'''

anchor = '    orthography_q: "Select the correct spelling",'
if anchor in content:
    content = content.replace(anchor, anchor + '\n' + missing_keys, 1)
    changes += 1
    print("1. Added 26 missing localization keys")
else:
    print("1. Anchor not found")

# ================================================================
# FIX 2: Remove orphaned localization declarations from Sound Sort overlay
# ================================================================
# Find the specific orphan lines
orphan1 = "    'word_sounds.word_families_label': 'Word Families',"
orphan2 = "    'word_sounds.word_families_complete': 'Family Complete!"
if orphan1 in content:
    # Find both lines together
    idx1 = content.find(orphan1)
    # Get the full line including the second one
    line1_start = content.rfind('\n', 0, idx1) + 1
    line1_end = content.find('\n', idx1)
    line2_end = content.find('\n', line1_end + 1)
    block = content[line1_start:line2_end]
    if 'word_families_complete' in block:
        content = content[:line1_start] + content[line2_end:]
        changes += 1
        print("2. Removed orphaned localization declarations from Sound Sort overlay")
    else:
        print("2. Second orphan line not found adjacent")
else:
    print("2. Orphan line not found")

# ================================================================
# FIX 3: Remove duplicate speaker emoji from WordFamiliesView
# Remove the <span className="text-2xl"> line with the speaker emoji
# ================================================================
target_span = '<span className="text-2xl">'
# Find it within WordFamiliesView context
wfv_start = content.find('WordFamiliesView')
if wfv_start > 0:
    span_idx = content.find(target_span, wfv_start)
    if span_idx > 0 and span_idx < wfv_start + 20000:
        # Get this line
        line_start = content.rfind('\n', 0, span_idx) + 1
        line_end = content.find('\n', span_idx)
        span_line = content[line_start:line_end]
        # Also remove the </span> on the same or next line
        span_close_idx = content.find('</span>', span_idx)
        if span_close_idx > 0 and span_close_idx < span_idx + 200:
            close_line_end = content.find('\n', span_close_idx)
            # Check if span and close are on the same line
            if span_close_idx < line_end:
                # Same line - remove just that line
                content = content[:line_start] + content[line_end + 1:]
            else:
                # Different lines - remove both
                content = content[:line_start] + content[close_line_end + 1:]
            changes += 1
            print("3. Removed duplicate speaker emoji from WordFamiliesView")
        else:
            print("3. Could not find </span> close")
    else:
        print("3. Speaker span not in expected range")
else:
    print("3. WordFamiliesView not found")

# ================================================================
# FIX 4: Fix Word Families checkAnswer args for progression
# ================================================================
old_check = "onCheckAnswer={(result) => checkAnswer(result === 'correct' ? currentWordSoundsWord : null)}"
if old_check in content:
    new_check = "onCheckAnswer={(result) => checkAnswer(result === 'correct' ? currentWordSoundsWord : null, currentWordSoundsWord)}"
    content = content.replace(old_check, new_check)
    changes += 1
    print("4. Fixed Word Families checkAnswer to pass 2nd arg for progression")
else:
    print("4. WF checkAnswer pattern not found")

# ================================================================
# FIX 5: Change Rhyme Time image to alwaysOn
# ================================================================
old_rhyme = "            'rhyming':        'progressive',"
new_rhyme = "            'rhyming':        'alwaysOn',     // Pictures help connect rhyme patterns to meaning"
ct = content.count(old_rhyme)
if ct > 0:
    content = content.replace(old_rhyme, new_rhyme)
    changes += 1
    print(f"5. Changed rhyming image to alwaysOn ({ct} occurrences)")
else:
    print("5. Rhyming image pattern not found")

# Save
content = content.replace('\n', '\r\n')
with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print(f"\nTotal fixes: {changes}")
print(f"Saved ({len(content)} chars)")
