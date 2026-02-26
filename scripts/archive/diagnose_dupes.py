"""Diagnose exactly which content was duplicated."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

markers = [
    ('<Ear size={48}', 'Fix 1: Ear icon'),
    ('Tap to hear</span>', 'Fix 1: Tap to hear text'),
    ('const SIMILAR_SOUNDS = {', 'Fix 3: SIMILAR_SOUNDS'),
    ('effectiveBlendingOptions', 'Fix 5: blending wait'),
    ('@keyframes soundwave', 'CSS: soundwave'),
    ('onRetry={() => { setWordSoundsPhonemes(null)', 'Fix 6: ErrorBoundary'),
    ("typeof PHONEME_GUIDE !== 'undefined'", 'Fix 4: PHONEME_GUIDE guard'),
    ('getWordSoundsString((k) => k, key, params', 'Fix 9: localization'),
    ('data-help-ignore="true"', 'Fix 8: data-help-ignore'),
    ('renderPrompt', 'renderPrompt function'),
    ('playBlending()', 'playBlending calls'),
    ("word_sounds.blending_instruction", 'blending_instruction string'),
]

print("DUPLICATION ANALYSIS")
print("=" * 60)
for marker, label in markers:
    count = content.count(marker)
    # Find line numbers
    positions = []
    start = 0
    while True:
        idx = content.find(marker, start)
        if idx < 0:
            break
        line_num = content[:idx].count('\n') + 1
        positions.append(line_num)
        start = idx + 1
    status = "OK" if count <= 2 else f"DUPLICATED ({count}x)"
    print(f"  {label}: {count}x at lines {positions[:5]}")

# Check total line count
line_count = content.count('\n') + 1
print(f"\nTotal lines: {line_count}")

# Find if there's a large repeated block by checking every 1000th line
lines = content.split('\n')
print(f"\nSampling for repeated content:")
for i in [0, 100, 1000, 10000, 68000, 69000, 69030, 69050, 69100, 70000]:
    if i < len(lines):
        print(f"  L{i+1}: {repr(lines[i].strip()[:80])}")
