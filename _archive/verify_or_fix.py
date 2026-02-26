"""
Fix 'or' phoneme issues - RESULTS VERSION (writes output to file)
"""
import re, sys

FILE = 'AlloFlowANTI.txt'
OUT = '_fix_or_results.txt'

f = open(FILE, 'r', encoding='utf-8-sig')
content = f.read()
f.close()

out = open(OUT, 'w', encoding='utf-8')

# Check if digraphs fix was applied  
new_digraphs = "const digraphs = ['sh', 'ch', 'th', 'wh', 'ph', 'ng', 'ck', 'qu', 'wr', 'kn', 'gn', 'gh', 'mb', 'ar', 'er', 'ir', 'or', 'ur'];"
old_digraphs = "const digraphs = ['sh', 'ch', 'th', 'wh', 'ph', 'ng', 'ck', 'qu', 'wr', 'kn', 'gn', 'gh', 'mb'];"

if new_digraphs in content:
    out.write("DIGRAPHS FIX: ALREADY APPLIED (r-controlled vowels present)\n")
elif old_digraphs in content:
    out.write("DIGRAPHS FIX: NOT YET APPLIED (old digraphs still present)\n")
else:
    # Search for the actual digraphs line
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if "const digraphs = [" in line and "'sh'" in line:
            out.write(f"DIGRAPHS at L{i+1}: {line.strip()[:150]}\n")

# Check PHONEME_AUDIO_BANK for 'or'
lines = content.split('\n')
or_exists = any(line.strip().startswith("'or':") and 'data:audio' in line for line in lines)
out.write(f"\n'or' in PHONEME_AUDIO_BANK: {or_exists}\n")

# Find insertion point
for i, line in enumerate(lines):
    s = line.strip()
    if s.startswith("'ur':") and 'data:audio' in s:
        out.write(f"'ur' at L{i+1}\n")
    if s.startswith("'air':") and 'data:audio' in s:
        out.write(f"'air' at L{i+1}\n")

out.close()
print(f"Results written to {OUT}")
