"""Quick verification of post-surgery state."""
import sys, hashlib, re, base64, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

MONOLITH = os.path.join(os.path.dirname(__file__), 'AlloFlowANTI.txt')
AUDIO = os.path.join(os.path.dirname(__file__), 'audio_input4', 'or.webm')
REPORT = os.path.join(os.path.dirname(__file__), 'verify_result.txt')

out = []
def log(msg):
    out.append(msg)
    print(msg)

with open(MONOLITH, 'rb') as f:
    raw = f.read()

# BOMs
bom = b'\xef\xbb\xbf'
bom_count = 0
pos = 0
while True:
    pos = raw.find(bom, pos)
    if pos == -1: break
    bom_count += 1
    log(f'BOM at byte {pos}')
    pos += 1
log(f'Total BOMs: {bom_count}')
log(f'File size: {len(raw)} bytes')

text = raw.decode('utf-8-sig')

# Or keys
bracket_count = text.count("PHONEME_AUDIO_BANK['or'] =")
literal_matches = re.findall(r"^\s+'or'\s*:", text, re.MULTILINE)
log(f"Bracket 'or' assignments: {bracket_count}")
log(f"Literal 'or' keys in objects: {len(literal_matches)}")

# New audio check
with open(AUDIO, 'rb') as f:
    expected_b64 = base64.b64encode(f.read()).decode()[:40]
found = expected_b64 in text
log(f"New audio b64 prefix ({expected_b64[:20]}...): {'FOUND' if found else 'NOT FOUND'}")

# Cancellation guards
guard_count = text.count('if (cancelled) return;')
log(f"Cancellation guards: {guard_count}")

# Duplicate comments
lines = text.split('\n')
dup = 0
for i in range(len(lines)-2):
    if (lines[i].strip().startswith('// PHONEME AUDIO BANK') and
        lines[i+2].strip().startswith('// PHONEME AUDIO BANK')):
        dup += 1
log(f"Duplicate PHONEME AUDIO BANK comments: {dup}")

log(f"\nTotal lines: {len(lines)}")

# Verdict
ok = (bom_count == 1 and bracket_count == 1 and len(literal_matches) == 0 
      and found and dup == 0)
log(f"\nOVERALL: {'ALL CHECKS PASSED' if ok else 'SOME CHECKS FAILED'}")

with open(REPORT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
