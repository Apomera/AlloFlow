"""Find phoneme normalization/alias logic and edit mode answer update"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
OUT = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\scripts\phoneme_audit.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

results = []

# Find phoneme alias/normalization/mapping
results.append("=== PHONEME_ALIASES or phoneme mapping ===")
for i, l in enumerate(lines):
    lower = l.lower()
    if ('phoneme_alias' in lower or 'phoneme_map' in lower or 'normaliz' in lower and 'phoneme' in lower):
        results.append("L%d: %s" % (i+1, l.strip()[:180]))

# Find 'oi' and 'oy' references in phoneme context
results.append("\n=== 'oi' / 'oy' phoneme references ===")
for i, l in enumerate(lines):
    s = l.strip()
    if ("'oi'" in s or '"oi"' in s or "'oy'" in s or '"oy"' in s) and ('phoneme' in s.lower() or 'sound' in s.lower() or 'audio' in s.lower() or 'bank' in s.lower()):
        results.append("L%d: %s" % (i+1, s[:180]))

# Find PHONEME_AUDIO_BANK entries for oi/oy
results.append("\n=== PHONEME_AUDIO_BANK oi/oy entries ===")
for i, l in enumerate(lines):
    if 'PHONEME_AUDIO_BANK' in l and ('oi' in l or 'oy' in l):
        results.append("L%d: %s" % (i+1, l.strip()[:180]))

# Find where Gemini phonemes are processed/received
results.append("\n=== Gemini phonemes processing ===")
for i, l in enumerate(lines):
    if 'phonemes' in l and ('gemini' in l.lower() or 'response' in l.lower() or 'parsed' in l.lower() or 'normalize' in l.lower()):
        results.append("L%d: %s" % (i+1, l.strip()[:180]))

# Find handleOptionUpdate (edit mode)
results.append("\n=== handleOptionUpdate definition ===")
for i, l in enumerate(lines):
    if 'handleOptionUpdate' in l and ('const' in l or 'function' in l) and ('=>' in l or '{' in l):
        results.append("L%d: %s" % (i+1, l.strip()[:180]))

# Find where expectedAnswer is set for isolation/counting activities
results.append("\n=== expectedAnswer usage in WS activities ===")
for i, l in enumerate(lines):
    if 'expectedAnswer' in l and i > 10000 and i < 12000:
        results.append("L%d: %s" % (i+1, l.strip()[:180]))

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
print("Written %d lines" % len(results))
