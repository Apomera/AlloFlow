"""Diagnose PHONEME_AUDIO_BANK structure and BOM issues."""
import re, sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

MONOLITH = 'AlloFlowANTI.txt'
REPORT = 'diagnose_output.txt'

findings = []

def log(msg):
    findings.append(msg)
    print(msg)

with open(MONOLITH, 'rb') as f:
    content = f.read()

# 1. Find all BOM markers
bom = b'\xef\xbb\xbf'
positions = []
start = 0
while True:
    pos = content.find(bom, start)
    if pos == -1:
        break
    positions.append(pos)
    start = pos + 1

log(f"=== BOM MARKERS ===")
log(f"Total BOM markers found: {len(positions)}")
for i, pos in enumerate(positions):
    line_num = content[:pos].count(b'\n') + 1
    before = content[max(0, pos-40):pos].decode('utf-8', errors='replace')
    after = content[pos+3:pos+80].decode('utf-8', errors='replace')
    log(f"  BOM #{i+1} at byte {pos}, line ~{line_num}")
    log(f"    BEFORE: {repr(before[-30:])}")
    log(f"    AFTER:  {repr(after[:50])}")

# 2. Decode with BOM-aware codec
text = content.decode('utf-8-sig', errors='replace')
lines = text.split('\n')

log(f"\n=== PHONEME_AUDIO_BANK ANALYSIS ===")
in_bank = False
bank_start = None
bank_end = None
or_key_lines = []
all_keys = []

for i, line in enumerate(lines):
    stripped = line.strip()
    if 'PHONEME_AUDIO_BANK' in line and ('=' in line or '{' in line):
        log(f"  BANK def at L{i+1}: {stripped[:80]}")
        if not in_bank:
            in_bank = True
            bank_start = i
    if in_bank:
        key_match = re.match(r"""\s*['\"](\w+)['\"]\s*:""", line)
        if key_match:
            key = key_match.group(1)
            all_keys.append((key, i+1))
            if key == 'or':
                or_key_lines.append(i+1)
                log(f"  FOUND 'or' at L{i+1}: {stripped[:100]}")
        if stripped == '};' and bank_start and i - bank_start > 5:
            bank_end = i + 1
            in_bank = False

if bank_start:
    log(f"  Bank: L{bank_start+1} to L{bank_end}")
    log(f"  Total keys: {len(all_keys)}")
    
    from collections import Counter
    key_counts = Counter(k for k, _ in all_keys)
    dupes = {k: v for k, v in key_counts.items() if v > 1}
    if dupes:
        log(f"  DUPLICATE KEYS:")
        for k, count in dupes.items():
            locs = [ln for kk, ln in all_keys if kk == k]
            log(f"    '{k}' x{count} at lines: {locs}")

log(f"  'or' key at lines: {or_key_lines}")

# 3. Check lines 949-955 for mid-file BOM
log(f"\n=== RAW BYTES, LINES 949-955 ===")
for idx in range(948, 955):
    if idx < len(lines):
        raw = lines[idx].encode('utf-8')
        has_bom = bom in raw
        stripped = lines[idx].strip()[:60]
        tag = '[BOM!]' if has_bom else '      '
        log(f"  L{idx+1} {tag}: {stripped}")

# 4. Check AUDIO_BANK_PHONEMES registry for 'or'
log(f"\n=== AUDIO_BANK_PHONEMES REGISTRY ===")
for i, line in enumerate(lines):
    if 'AUDIO_BANK_PHONEMES' in line and ('=' in line or '[' in line):
        log(f"  L{i+1}: {line.strip()[:200]}")
        if "'or'" in line or '"or"' in line:
            log(f"    -> 'or' IS in this registry")
        else:
            log(f"    -> 'or' NOT FOUND in this registry line")
        break

# 5. Check if any existing patch scripts reference 'or'
log(f"\n=== 'or' REFERENCES IN handleAudio / checkAnswer ===")
or_refs = 0
for i, line in enumerate(lines):
    if "'or'" in line:
        s = line.strip()
        if 'handleAudio' in s or 'PHONEME_AUDIO_BANK' in s or 'AUDIO_BANK_PHONEMES' in s:
            log(f"  L{i+1}: {s[:120]}")
            or_refs += 1
log(f"  Total 'or' audio refs: {or_refs}")

# 6. Find if localStorage cache could shadow the bank  
log(f"\n=== LOCAL STORAGE CACHE (PHONEME_STORAGE_KEY) ===")
for i, line in enumerate(lines):
    if 'PHONEME_STORAGE_KEY' in line or 'allo_phoneme_bank' in line:
        log(f"  L{i+1}: {line.strip()[:120]}")

# 7. Check saveAudioToStorage filter
log(f"\n=== saveAudioToStorage FILTER ===")
for i, line in enumerate(lines):
    if 'saveAudioToStorage' in line and ('if' in line or 'length' in line):
        log(f"  L{i+1}: {line.strip()[:120]}")

# Write report
with open(REPORT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(findings))
log(f"\nReport written to {REPORT}")
