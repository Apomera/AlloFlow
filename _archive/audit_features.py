filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

results = []
results.append(f"File: {len(content):,} bytes, {len(lines):,} lines")
results.append("")

checks = [
    ("Nano: adventureConsistentCharacters var", "adventureConsistentCharacters"),
    ("Nano: isReviewingCharacters var", "isReviewingCharacters"),
    ("Nano: handleRefineCharacter func", "handleRefineCharacter"),
    ("Nano: Cast of Characters UI", "Cast of Characters"),
    ("Nano: characters in JSON export", "characters: adventureState.characters"),
    ("Nano: characters in JSON import", "characters: snapshot.characters"),
    ("Nano: character descriptors in img gen", "Characters in scene:"),
    ("WS: word-sounds in header ternary", "activeView === 'word-sounds'"),
    ("WS: word-sounds-generator in header", "activeView === 'word-sounds-generator'"),
    ("WS: word-sounds in getDefaultTitle", "case 'word-sounds':"),
    ("WS: clean remount in handleRestoreView", "word-sounds detected. Forcing clean remount"),
    ("Audio: currentActiveAudio ref", "currentActiveAudio"),
    ("JSON: wordSoundsState export", "wordSoundsState:"),
    ("JSON: adventureSnapshot export", "adventureSnapshot:"),
]

present_list = []
missing_list = []

for label, pattern in checks:
    found = pattern in content
    if found:
        first_line = -1
        for i, line in enumerate(lines):
            if pattern in line:
                first_line = i + 1
                break
        results.append(f"[OK]   {label} (line {first_line})")
        present_list.append(label)
    else:
        results.append(f"[MISS] {label}")
        missing_list.append(label)

results.append("")
results.append(f"TOTAL: {len(present_list)} present, {len(missing_list)} missing")
results.append("")

if missing_list:
    results.append("NEED TO RE-IMPLEMENT:")
    for m in missing_list:
        results.append(f"  - {m}")

results.append("")
results.append("BAD PATTERN CHECK:")
bad = [
    ("else const storedAppearance", "} else const storedAppearance"),
    ("({hasSavedAdventure", "({hasSavedAdventure"),
    ("adventureState.history) : null}", "adventureState.history) : null}"),
]
for label, pattern in bad:
    if pattern in content:
        for i, line in enumerate(lines):
            if pattern in line:
                results.append(f"  WARNING: {label} at line {i+1}")
                break
    else:
        results.append(f"  CLEAN: {label} not found")

output = '\n'.join(results)
print(output)

with open('audit_results.txt', 'w', encoding='ascii', errors='replace') as f:
    f.write(output)
