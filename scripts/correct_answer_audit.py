"""Find how correctAnswer is determined for each activity and where edit mode options render"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
OUT = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\scripts\correct_answer_audit.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

results = []

# Find correctAnswer in isolation state
results.append("=== isolationState correctAnswer ===")
for i, l in enumerate(lines):
    if 'correctAnswer' in l and ('isolation' in l.lower() or 'iso' in l.lower()):
        results.append("L%d: %s" % (i+1, l.strip()[:180]))

# Find isolation edit mode rendering
results.append("\n=== isolation edit mode ===")
for i, l in enumerate(lines):
    if 'isEditing' in l and 'isolation' in l.lower():
        results.append("L%d: %s" % (i+1, l.strip()[:180]))

# Find where isolation options are rendered in edit vs play mode
results.append("\n=== isolation options rendering ===")
for i, l in enumerate(lines):
    if 'isoOptions' in l and ('map' in l or 'forEach' in l or 'onClick' in l):
        results.append("L%d: %s" % (i+1, l.strip()[:180]))

# Find rhyme correct answer
results.append("\n=== rhyme correct answer / rhymeWord ===")
for i, l in enumerate(lines):
    if ('correctRhyme' in l or 'rhymeWord' in l) and ('===' in l or 'set' in l.lower() or 'const' in l):
        if i > 5000 and i < 12000:
            results.append("L%d: %s" % (i+1, l.strip()[:180]))

# Find blending options correct answer
results.append("\n=== blending options / correct word ===")
for i, l in enumerate(lines):
    if 'blendingOptions' in l and ('correct' in l.lower() or 'answer' in l.lower()):
        results.append("L%d: %s" % (i+1, l.strip()[:180]))

# Find handleOptionUpdate's handling for isolation
results.append("\n=== handleOptionUpdate isolation ===")
for i, l in enumerate(lines):
    if i > 9309 and i < 9315:
        results.append("L%d: %s" % (i+1, l.strip()[:180]))

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
print("Written %d lines" % len(results))
