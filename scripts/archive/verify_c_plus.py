"""Full Phase C+ verification."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()
lines = content.split('\n')

checks = [
    ("1. handleApplyRosterGroup: p.selectedLanguages", "p.selectedLanguages" in content),
    ("2. handleApplyRosterGroup: p.useEmojis", "p.useEmojis" in content),
    ("3. handleApplyRosterGroup: p.textFormat", "p.textFormat" in content),
    ("4. Batch save: selectedLangs", "selectedLangs: selectedLanguages" in content),
    ("5. Batch apply: profile.selectedLanguages", "profile.selectedLanguages" in content),
    ("6. Batch apply: profile.useEmojis", "profile.useEmojis" in content),
    ("7. Batch restore: saved.selectedLangs", "saved.selectedLangs" in content),
    ("8. Batch restore: saved.emojis", "saved.emojis" in content),
    ("9. Toolbar button removed", all('bg-purple' not in l for l in lines if 'setIsRosterKeyOpen' in l and 55000 < lines.index(l) < 57000) if any('setIsRosterKeyOpen' in l for l in lines) else True),
    ("10. Compact roster strip present", "ui-roster-strip" in content),
    ("11. Old profiles UI gone from JSX", all('ui-student-profiles' not in l for i, l in enumerate(lines) if i > 50000)),
    ("12. Localization: strip_title", "strip_title" in content),
    ("13. Localization: emojis_label", "emojis_label" in content),
    ("14. Emoji control in panel", "roster.emojis_label" in content),
    ("15. TextFormat control in panel", "roster.format_standard" in content),
]

all_ok = True
for name, ok in checks:
    status = "PASS" if ok else "FAIL"
    print(f"  {status}: {name}")
    if not ok: all_ok = False

# Show compact strip location
for i, l in enumerate(lines):
    if 'ui-roster-strip' in l:
        print(f"\n  Compact strip at L{i+1}")
        break

# Show emoji control location
for i, l in enumerate(lines):
    if 'roster.emojis_label' in l:
        print(f"  Emoji controls at L{i+1}")
        break

print(f"\n{'ALL 15 CHECKS PASSED!' if all_ok else 'SOME CHECKS FAILED!'}")
