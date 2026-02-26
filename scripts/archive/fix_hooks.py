"""
Convert 9 invalid useMemo hooks to plain computations.
Single-line useMemos: strip useMemo wrapper, keep just the expression.
Pattern: const X = useMemo(() => EXPR, [deps]); -> const X = EXPR;

L1498 is VALID (inside WordSoundsGenerator component body at indent=8)
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()

# Define the exact patterns to replace
# Format: (old_pattern, new_pattern, description)
replacements = [
    # 1. L5664: validResults (single-line)
    (
        "const validResults = useMemo(() => results.filter(Boolean), [results]);",
        "const validResults = results.filter(Boolean);",
        "validResults"
    ),
    # 2. L5719: wordsNeedingAudio (single-line)
    (
        "const wordsNeedingAudio = useMemo(() => preloadedWords.filter(w => !w.ttsReady && !w._audioRequested), [preloadedWords, ttsReady]);",
        "const wordsNeedingAudio = preloadedWords.filter(w => !w.ttsReady && !w._audioRequested);",
        "wordsNeedingAudio"
    ),
    # 3. L6380: isoDistractors (single-line)
    (
        "const isoDistractors = useMemo(() => isoAllPhonemes.filter(p => p.toLowerCase() !== correctSound?.toLowerCase()).slice(0, 3), [isoAllPhonemes, correctSound]);",
        "const isoDistractors = isoAllPhonemes.filter(p => p.toLowerCase() !== correctSound?.toLowerCase()).slice(0, 3);",
        "isoDistractors"
    ),
    # 4. L8536: availableChips (single-line)
    (
        "const availableChips = useMemo(() => soundChips.filter(c => !c.used), [soundChips]);",
        "const availableChips = soundChips.filter(c => !c.used);",
        "availableChips"
    ),
    # 5. L8912: correctCount (single-line)
    (
        "const correctCount = useMemo(() => letterFeedback.filter(l => l.correct).length, [letterFeedback, correct]);",
        "const correctCount = letterFeedback.filter(l => l.correct).length;",
        "correctCount"
    ),
    # 6. L10578: students (single-line)
    (
        "const students = useMemo(() => importedStudents.filter(s => s.stats.quizAvg > 0), [importedStudents, quizAvg, stats]);",
        "const students = importedStudents.filter(s => s.stats.quizAvg > 0);",
        "students"
    ),
    # 7. L18119: complexTerms (single-line)
    (
        "const complexTerms = useMemo(() => termNames.filter(t => t.length > 8 || t.includes(' ')), [termNames]);",
        "const complexTerms = termNames.filter(t => t.length > 8 || t.includes(' '));",
        "complexTerms"
    ),
    # 8. L26288: count (single-line)
    (
        "const count = useMemo(() => Object.values(responses || {}).filter(r => r === idx).length, [Object, responses, values]);",
        "const count = Object.values(responses || {}).filter(r => r === idx).length;",
        "count"
    ),
    # 9. L28846: w (single-line)
    (
        "const w = useMemo(() => cleaned.split(' ').filter(word => word.length > 0), [cleaned, split, word]);",
        "const w = cleaned.split(' ').filter(word => word.length > 0);",
        "w"
    ),
]

fixes = 0
for old, new, desc in replacements:
    if old in content:
        content = content.replace(old, new)
        fixes += 1
        print(f"✅ Fixed: {desc}")
    else:
        print(f"❌ NOT FOUND: {desc}")
        # Try to find a close match
        key = desc.split('(')[0].strip()
        for i, l in enumerate(content.split('\n')):
            if f'const {key}' in l and 'useMemo' in l:
                print(f"   Found at L{i+1}: {l.strip()[:100]}")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nFixed {fixes} / 9 invalid useMemo hooks")
