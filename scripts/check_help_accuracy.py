"""
Factual accuracy review of HELP_STRINGS.
Searches for potentially inaccurate claims in help text.
"""
import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find HELP_STRINGS block
start = end = None
brace_depth = 0
for i, line in enumerate(lines):
    if 'const HELP_STRINGS = {' in line:
        start = i
        brace_depth = 1
        continue
    if start is not None and end is None:
        brace_depth += line.count('{') - line.count('}')
        if brace_depth <= 0:
            end = i
            break

block = ''.join(lines[start:end+1])

# Flag patterns that might be inaccurate
checks = [
    ("mentions 'Ctrl+F'", r'Ctrl\+F'),
    ("mentions 'QR code'", r'QR code'),
    ("mentions 'multiplayer'", r'[Mm]ultiplayer'),
    ("mentions 'leaderboard'", r'[Ll]eaderboard'),
    ("mentions 'wake word'", r'[Ww]ake word'),
    ("mentions 'Moodle'", r'Moodle'),
    ("mentions 'Blackboard'", r'Blackboard'),
    ("mentions 'Canvas' (LMS)", r'Canvas'),
    ("mentions 'QTI'", r'QTI'),
    ("mentions 'cardstock'", r'cardstock'),
    ("mentions 'PDF' export", r'PDF'),
    ("mentions 'share via link'", r'share via link'),
    ("mentions 'cloud backup'", r'cloud backup'),
    ("mentions 'Lexile'", r'Lexile'),
    ("mentions 'spaced repetition'", r'spaced repetition'),
    ("mentions 'daily challenges'", r'daily.{0,10}challenge'),
    ("mentions 'print'", r'\bprint\b'),
    ("mentions 'multiple AI voices'", r'multiple AI voices'),
    ("mentions 'authentication'", r'authentication'),
    ("mentions 'encrypt'", r'encrypt'),
    ("mentions 'streak'", r'\bstreak\b'),
    ("mentions 'microphone'", r'microphone'),
    ("mentions 'drag and drop'", r'[Dd]rag.{0,5}[Dd]rop'),
    ("mentions 'IPA symbol'", r'IPA symbol'),
    ("mentions 'mouth position'", r'mouth position'),
]

print("=== POTENTIAL ACCURACY CONCERNS IN HELP STRINGS ===\n")

for desc, pattern in checks:
    matches = list(re.finditer(pattern, block))
    if matches:
        print(f"[{len(matches)}x] {desc}:")
        for m in matches[:3]:
            # Find surrounding context
            pos = m.start()
            context_start = max(0, pos - 50)
            context_end = min(len(block), pos + 80)
            context = block[context_start:context_end].replace('\n', ' ').replace('\r', ' ')
            # Find which key this belongs to
            key_match = None
            before = block[:pos]
            for km in re.finditer(r"'([a-z_]+)':\s*\"", before):
                key_match = km.group(1)
            print(f"    Key: {key_match}")
            print(f"    ...{context}...")
        if len(matches) > 3:
            print(f"    ... and {len(matches)-3} more")
        print()

# Also check for features that may be aspirational/not implemented
aspirational = [
    ("mentions 'export deck for offline'", r'[Ee]xport deck for offline'),
    ("mentions 'resume'", r'resume where'),
    ("mentions 'personality settings'", r'personality'),
    ("mentions 'bookmarked'", r'bookmarked'),
    ("mentions 'smart board'", r'smart board'),
    ("mentions 'WCAG AAA'", r'WCAG AAA'),
    ("mentions 'multiple devices'", r'any device'),
]

print("=== ASPIRATIONAL/UNVERIFIED CLAIMS ===\n")
for desc, pattern in aspirational:
    matches = list(re.finditer(pattern, block))
    if matches:
        print(f"[{len(matches)}x] {desc}:")
        for m in matches[:2]:
            pos = m.start()
            before = block[:pos]
            key_match = None
            for km in re.finditer(r"'([a-z_]+)':\s*\"", before):
                key_match = km.group(1)
            print(f"    Key: {key_match}")
        print()
