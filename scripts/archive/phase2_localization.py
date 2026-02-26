"""Phase 2: Add wizard localization strings"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()

# Add wizard localization strings after the entry section
old_loc = """      language_tooltip: "Students see quizzes in this language","""
new_loc = """      language_tooltip: "Students see quizzes in this language",
      wizard_step_codename: "Pick Your Codename!",
      wizard_step_preferences: "How Do You Learn Best?",
      wizard_preferences_sub: "These help your teacher personalize your experience. All optional!",
      wizard_home_language: "🌍 What language do you speak at home?",
      wizard_reading_comfort: "📖 How do you like to read?",
      wizard_tts_preference: "🔊 How do you like to hear text?",
      wizard_visual_support: "🖼️ Do pictures help you learn?",
      wizard_next: "Next",
      wizard_back: "Back","""

# This should match our previous change which already added reading_level_label after language_tooltip
count = content.count(old_loc)
if count == 1:
    content = content.replace(old_loc, new_loc)
    print("[OK] Added wizard localization strings")
elif count == 0:
    # Try the expanded version from Phase 1a
    old_loc2 = """      language_tooltip: "Students see quizzes in this language",
      reading_level_label: "Reading Level","""
    new_loc2 = """      language_tooltip: "Students see quizzes in this language",
      wizard_step_codename: "Pick Your Codename!",
      wizard_step_preferences: "How Do You Learn Best?",
      wizard_preferences_sub: "These help your teacher personalize your experience. All optional!",
      wizard_home_language: "🌍 What language do you speak at home?",
      wizard_reading_comfort: "📖 How do you like to read?",
      wizard_tts_preference: "🔊 How do you like to hear text?",
      wizard_visual_support: "🖼️ Do pictures help you learn?",
      wizard_next: "Next",
      wizard_back: "Back",
      reading_level_label: "Reading Level","""
    count2 = content.count(old_loc2)
    if count2 == 1:
        content = content.replace(old_loc2, new_loc2)
        print("[OK] Added wizard localization strings (after Phase 1a context)")
    else:
        print(f"ERROR: Could not find localization anchor. Count1={count}, Count2={count2}")
        sys.exit(1)

open(filepath, 'w', encoding='utf-8').write(content)
print("Done.")
