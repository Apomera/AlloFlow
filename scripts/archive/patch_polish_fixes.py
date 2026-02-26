"""
Low-Risk Polish Fixes for Word Sounds Studio
1. Remove duplicate accuracy calculation (L9825 shadowed by L9820)
2. Wrap remaining raw UI strings with ts()
3. Add localization keys for new strings
4. Clean up activity transition message to use ts()
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('\r\n', '\n')
changes = 0

# ================================================================
# FIX 1: Remove duplicate accuracy variable (L9825 shadows L9820)
# The one at L9825 is inside the showSessionComplete block and
# just recalculates the same value computed 3 lines above
# ================================================================
old_dup_accuracy = """    // SESSION COMPLETE MODAL: Show stats summary when activity session ends
    if (showSessionComplete) {
        const accuracy = wordSoundsScore.total > 0 
            ? Math.round((wordSoundsScore.correct / wordSoundsScore.total) * 100) 
            : 0;
        const streakEmoji"""
new_dup_accuracy = """    // SESSION COMPLETE MODAL: Show stats summary when activity session ends
    if (showSessionComplete) {
        const streakEmoji"""
if old_dup_accuracy in content:
    content = content.replace(old_dup_accuracy, new_dup_accuracy)
    changes += 1
    print("1. ✅ Removed duplicate accuracy calculation (was shadowing outer const)")
else:
    print("1. ❌ Duplicate accuracy pattern not found")

# ================================================================
# FIX 2: Wrap "Listening..." with ts()
# ================================================================
old_listening_1 = '{isListening ? "Listening..." : (userAnswer || label)}'
new_listening_1 = "{isListening ? (ts('word_sounds.listening') || \"Listening...\") : (userAnswer || label)}"
if old_listening_1 in content:
    content = content.replace(old_listening_1, new_listening_1)
    changes += 1
    print("2a. ✅ Wrapped 'Listening...' with ts() (mic prompt area)")
else:
    print("2a. ❌ Listening (mic prompt) pattern not found")

old_listening_2 = '{isListening ? "Listening..." : (userAnswer || "Tap to Speak")}'
new_listening_2 = """{isListening ? (ts('word_sounds.listening') || "Listening...") : (userAnswer || (ts('word_sounds.tap_to_speak') || "Tap to Speak"))}"""
count_l2 = content.count(old_listening_2)
if count_l2 > 0:
    content = content.replace(old_listening_2, new_listening_2)
    changes += count_l2
    print(f"2b. ✅ Wrapped 'Listening.../Tap to Speak' with ts() ({count_l2} instances)")
else:
    print("2b. ❌ Listening/Tap to Speak pattern not found")

# ================================================================
# FIX 3: Wrap "Check Spelling" button text with ts()
# ================================================================
old_check_spelling = "Check Spelling <ChevronRight size={20} />"
new_check_spelling = "{ts('word_sounds.check_spelling') || 'Check Spelling'} <ChevronRight size={20} />"
if old_check_spelling in content:
    content = content.replace(old_check_spelling, new_check_spelling)
    changes += 1
    print("3. ✅ Wrapped 'Check Spelling' with ts()")
else:
    print("3. ❌ Check Spelling pattern not found")

# ================================================================
# FIX 4: Wrap "Hear Word Again" tooltip with ts()
# ================================================================
old_hear_word = 'title="Hear Word Again"'
# Only replace the one in WordSounds context (should be unique enough)
if old_hear_word in content:
    content = content.replace(old_hear_word, "title={ts('word_sounds.hear_word_again') || 'Hear Word Again'}", 1)
    changes += 1
    print("4. ✅ Wrapped 'Hear Word Again' tooltip with ts()")
else:
    print("4. ❌ Hear Word Again pattern not found")

# ================================================================
# FIX 5: Wrap "Click Check below if correct" with ts()
# ================================================================
old_click_check = '<p className="text-xs text-slate-500">Click Check below if correct</p>'
new_click_check = "<p className=\"text-xs text-slate-500\">{ts('word_sounds.click_check_hint') || 'Click Check below if correct'}</p>"
if old_click_check in content:
    content = content.replace(old_click_check, new_click_check)
    changes += 1
    print("5. ✅ Wrapped 'Click Check below if correct' with ts()")
else:
    print("5. ❌ Click Check hint pattern not found")

# ================================================================
# FIX 6: Wrap activity transition message with ts()
# ================================================================
old_transition = "message: `Great work! Let's try ${nextActivity}! 🎉`"
new_transition = "message: (ts('word_sounds.fb_great_work_next') || `Great work! Let's try ${nextActivity}! 🎉`)"
if old_transition in content:
    content = content.replace(old_transition, new_transition)
    changes += 1
    print("6. ✅ Wrapped activity transition message with ts()")
else:
    print("6. ❌ Transition message pattern not found")

# ================================================================
# FIX 7: Wrap mode switch tooltips with ts() 
# ================================================================
old_mic_switch = 'title={useMicInput ? "Switch to Click Mode" : "Switch to Microphone Mode"}'
new_mic_switch = """title={useMicInput ? (ts('word_sounds.switch_click_mode') || "Switch to Click Mode") : (ts('word_sounds.switch_mic_mode') || "Switch to Microphone Mode")}"""
if old_mic_switch in content:
    content = content.replace(old_mic_switch, new_mic_switch)
    changes += 1
    print("7a. ✅ Wrapped mic mode switch tooltip with ts()")
else:
    print("7a. ❌ Mic mode switch pattern not found")

old_letter_switch = 'title={showLetterHints ? "Switch to Sound Only Mode (Hide Letters)" : "Switch to Letter Mode (Show Letters)"}'
new_letter_switch = """title={showLetterHints ? (ts('word_sounds.switch_sound_only') || "Switch to Sound Only Mode (Hide Letters)") : (ts('word_sounds.switch_letter_mode') || "Switch to Letter Mode (Show Letters)")}"""
if old_letter_switch in content:
    content = content.replace(old_letter_switch, new_letter_switch)
    changes += 1
    print("7b. ✅ Wrapped letter mode switch tooltip with ts()")
else:
    print("7b. ❌ Letter mode switch pattern not found")

# ================================================================
# FIX 8: Add all new localization keys to UI_STRINGS.word_sounds
# ================================================================
old_fb_anchor = '    fb_nice_try: "Nice try!",'
new_fb_anchor = """    fb_nice_try: "Nice try!",
    fb_great_work_next: "Great work!",
    listening: "Listening...",
    tap_to_speak: "Tap to Speak",
    check_spelling: "Check Spelling",
    hear_word_again: "Hear Word Again",
    click_check_hint: "Click Check below if correct",
    switch_click_mode: "Switch to Click Mode",
    switch_mic_mode: "Switch to Microphone Mode",
    switch_sound_only: "Switch to Sound Only Mode (Hide Letters)",
    switch_letter_mode: "Switch to Letter Mode (Show Letters)","""
if old_fb_anchor in content:
    content = content.replace(old_fb_anchor, new_fb_anchor)
    changes += 1
    print("8. ✅ Added 11 new localization keys to UI_STRINGS.word_sounds")
else:
    print("8. ❌ fb_nice_try anchor key not found")

# Save
content = content.replace('\n', '\r\n')
with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print(f"\n✨ Total changes: {changes}")
