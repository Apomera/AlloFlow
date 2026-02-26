"""Find the lightbulb/tip in the Word Sounds activity area."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8-sig').readlines()

# Search for Lightbulb near the sound_sort area (L8000-10300 range)
out = []
for i in range(7500, min(len(lines), 10500)):
    l = lines[i]
    if 'Lightbulb' in l or 'lightbulb' in l.lower() or 'tip' in l.lower() and ('hint' in l.lower() or 'Tip' in l):
        out.append("L%d: %s" % (i+1, l.strip()[:200]))
    if 'sound_sort' in l and ('tip' in l.lower() or 'hint' in l.lower()):
        out.append("L%d: %s" % (i+1, l.strip()[:200]))

# Also check around L10159-10166 (the showLetterHints toggle)
for i in range(10150, 10200):
    out.append("L%d: %s" % (i+1, lines[i].strip()[:200]))

with open('sound_sort_lightbulb.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print("%d lines" % len(out))
