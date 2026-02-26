"""
Fix factually inaccurate/aspirational claims in HELP_STRINGS.
Each fix targets a specific substring with its replacement.
"""

FILE = 'AlloFlowANTI.txt'

# Pairs of (old_substring, new_substring) for targeted fixes
FIXES = [
    # 1. glossary_standard_flashcards: Remove "Export deck for offline use or" — this feature doesn't exist
    (
        "Export deck for offline use or print physical cards.",
        "Print physical cards for offline study."
    ),
    # 2. glossary_standard_flashcards: Remove "spaced repetition" — not implemented
    (
        "and spaced repetition (harder cards appear more often). Three practice modes: Browse (self-paced review), Quiz (force recall before seeing answer), Timed (speed practice).",
        "and sequential review. Browse through cards at your own pace with shuffle mode for variety."
    ),
    # 3. glossary_export_standard: Remove QR codes claim — not implemented
    (
        "Cards include QR codes linking back to digital version (optional). Tip:",
        "Tip:"
    ),
    # 4. glossary_memory_game: Remove "Multiplayer mode available for classroom competition." — not implemented
    (
        "Multiplayer mode available for classroom competition. Cards shuffle each game",
        "Cards shuffle each game"
    ),
    # 5. glossary_matching: Remove "Multiplayer race mode available." — not implemented
    (
        "Multiplayer race mode available. Shows correct matches",
        "Shows correct matches"
    ),
    # 6. glossary_search: Remove Ctrl+F claim — not a real shortcut in the app
    (
        "Keyboard shortcut: Ctrl+F when glossary is open.",
        "Results update instantly as you type."
    ),
    # 7. bot_settings_btn: Remove "wake word" — not implemented
    (
        "enable/disable wake word",
        "enable/disable microphone input"
    ),
    # 8. word_sounds_review_phoneme_bank: Remove "mouth position diagram" — not implemented
    (
        "audio sample, example words, and mouth position diagram",
        "audio sample, and example words"
    ),
    # 9. xp_modal_trigger: Remove "daily/weekly challenges" and "leaderboard" — not implemented
    (
        "daily/weekly challenges and rewards, and leaderboard position (if enabled)",
        "and achievement history"
    ),
    # 10. header_settings_theme: Soften WCAG AAA claim — it's a goal, may not be fully certified
    (
        "meets WCAG AAA accessibility standards",
        "designed to meet WCAG accessibility standards"
    ),
    # 11. glossary_play_bingo: "Live mode tracks all connected student cards simultaneously" — not real-time multiplayer
    (
        "Live mode tracks all connected student cards simultaneously. XP awarded for winners.",
        "XP awarded for completing the game."
    ),
    # 12. header_cloud_sync: Soften "encrypted in transit and at rest" — this is handled by Firebase, accurate but let's be precise
    (
        "All data is encrypted in transit and at rest.",
        "Data security is handled by Firebase/Firestore infrastructure."
    ),
]

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

applied = 0
skipped = 0
for old, new in FIXES:
    if old in content:
        content = content.replace(old, new, 1)
        applied += 1
        print(f"  ✅ Fixed: ...{old[:60]}...")
    else:
        skipped += 1
        print(f"  ⚠️  NOT FOUND: ...{old[:60]}...")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n✅ Applied {applied}/{applied+skipped} factual accuracy fixes")
if skipped:
    print(f"⚠️  {skipped} fixes could not be applied (text not found)")
