"""Second pass: handle complex shuffle patterns that regex couldn't match."""
FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# These are all array-literal.sort() patterns:
# [a, ...b].sort(() => Math.random() - 0.5)  →  fisherYatesShuffle([a, ...b])
# The trick is the ] before .sort and the expression inside

REPLACEMENTS = [
    # L4449: ].sort(() => Math.random() - 0.5); at end of array literal
    (
        """...(data.distractors || []).map(w => ({ text: w, isFamily: false }))
                    ].sort(() => Math.random() - 0.5);""",
        """...(data.distractors || []).map(w => ({ text: w, isFamily: false }))
                    ];
                    const mixed_shuffled = fisherYatesShuffle(mixed);"""
    ),
    
    # L5245: return [...correctChips, ...distractors].sort(() => Math.random() - 0.5);
    (
        'return [...correctChips, ...distractors].sort(() => Math.random() - 0.5);',
        'return fisherYatesShuffle([...correctChips, ...distractors]);'
    ),
    
    # L5397: const opts = [target, ...validUnique].sort(() => Math.random() - 0.5);
    (
        'const opts = [target, ...validUnique].sort(() => Math.random() - 0.5);',
        'const opts = fisherYatesShuffle([target, ...validUnique]);'
    ),
    
    # L6827: setOrthographyOptions([targetWord, ...distractors].sort(() => Math.random() - 0.5));
    (
        'setOrthographyOptions([targetWord, ...distractors].sort(() => Math.random() - 0.5));',
        'setOrthographyOptions(fisherYatesShuffle([targetWord, ...distractors]));'
    ),
    
    # L6989: [...new Set([effectiveCorrect, ...isoDistractors.slice(0, 5)])].sort(() => Math.random() - 0.5);
    (
        '[...new Set([effectiveCorrect, ...isoDistractors.slice(0, 5)])].sort(() => Math.random() - 0.5);',
        'fisherYatesShuffle([...new Set([effectiveCorrect, ...isoDistractors.slice(0, 5)])]);'
    ),
    
    # L7357: const options = [correct, ...distractors].sort(() => Math.random() - 0.5);
    (
        'const options = [correct, ...distractors].sort(() => Math.random() - 0.5);',
        'const options = fisherYatesShuffle([correct, ...distractors]);'
    ),
    
    # L7972: const options = [targetWord, ...distractors].sort(() => Math.random() - 0.5);
    # This appears multiple times, use replace with count
    (
        '[targetWord, ...distractors].sort(() => Math.random() - 0.5);',
        'fisherYatesShuffle([targetWord, ...distractors]);'
    ),
    
    # Ternary patterns: ? [correctRhyme, ...distractors].sort(() => Math.random() - 0.5)
    (
        '? [correctRhyme, ...distractors].sort(() => Math.random() - 0.5)',
        '? fisherYatesShuffle([correctRhyme, ...distractors])'
    ),
]

count = 0
for old, new in REPLACEMENTS:
    occurrences = content.count(old)
    if occurrences > 0:
        content = content.replace(old, new)
        count += occurrences
        print(f"  Replaced {occurrences}x: {old[:60]}...")
    else:
        print(f"  SKIP (not found): {old[:60]}...")

# Special case: L4449 needs a variable rename fix since we changed the structure
# The original was: const mixed = [...].sort(); setWordBank(mixed);
# Now it's: const mixed = [...]; const mixed_shuffled = fisherYatesShuffle(mixed);
# Need to update the setWordBank line
content = content.replace(
    'const mixed_shuffled = fisherYatesShuffle(mixed);\n                    setWordBank(mixed);',
    'const mixed_shuffled = fisherYatesShuffle(mixed);\n                    setWordBank(mixed_shuffled);'
)
# Also check with \r\n
content = content.replace(
    'const mixed_shuffled = fisherYatesShuffle(mixed);\r\n                    setWordBank(mixed);',
    'const mixed_shuffled = fisherYatesShuffle(mixed);\r\n                    setWordBank(mixed_shuffled);'
)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

remaining = content.count('Math.random() - 0.5') + content.count('0.5 - Math.random()')
print(f"\nReplaced: {count}")
print(f"Remaining naive shuffles: {remaining}")
print(f"fisherYatesShuffle usages: {content.count('fisherYatesShuffle(')}")
