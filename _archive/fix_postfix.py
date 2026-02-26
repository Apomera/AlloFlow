"""
Post-Fix Surgery: Remove duplicate alias block + additional cleanups
=====================================================================
Fixes:
  1. Remove duplicate unguarded alias block (L1121-1125) — L1128-1133 is correct
  2. Remove duplicate 'Ensure phonetic alternates' comment (keep one)
  3. Add guards to potentially undefined .map() arguments
"""
import sys, os, re, hashlib

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
MONOLITH = os.path.join(os.path.dirname(__file__), 'AlloFlowANTI.txt')
BACKUP = MONOLITH + '.bak_postfix'
REPORT = os.path.join(os.path.dirname(__file__), 'postfix_result.txt')

out = []
def log(msg):
    out.append(msg)
    print(msg)

with open(MONOLITH, 'r', encoding='utf-8-sig') as f:
    text = f.read()
lines = text.split('\n')
log(f"Loaded {len(lines)} lines")
changes = 0

# ============================================================
# FIX 1: Remove duplicate unguarded alias block
# ============================================================
# Find the block: "// Ensure phonetic alternates..." + "if (typeof PHONEME_AUDIO_BANK" 
# that LACKS the !PHONEME_AUDIO_BANK['orr'] guard

new_lines = []
skip_until = -1
i = 0
while i < len(lines):
    if i < skip_until:
        i += 1
        continue
    
    line = lines[i]
    stripped = line.strip()
    
    # Detect the first (unguarded) alias block
    if (stripped == '// Ensure phonetic alternates map to base phonemes' and 
        i + 1 < len(lines) and
        "if (typeof PHONEME_AUDIO_BANK !== 'undefined')" in lines[i+1].strip()):
        # Check if this is the UNGUARDED block (no !PHONEME_AUDIO_BANK check)
        block_lines = []
        j = i
        while j < min(i + 6, len(lines)):
            block_lines.append(lines[j])
            if lines[j].strip() == '}':
                break
            j += 1
        
        block_text = '\n'.join(block_lines)
        if '!PHONEME_AUDIO_BANK' not in block_text:
            # This is the unguarded duplicate — skip it
            log(f"[FIX1] Removing unguarded alias block at L{i+1}-L{j+1}")
            # Also skip any trailing blank lines
            skip_until = j + 1
            while skip_until < len(lines) and lines[skip_until].strip() == '':
                skip_until += 1
            changes += 1
            i = skip_until
            continue
    
    new_lines.append(line)
    i += 1

lines = new_lines
log(f"After FIX 1: {len(lines)} lines")

# ============================================================
# FIX 2: Guard data.graphemes.length at the unsafe access point
# ============================================================
fix2_count = 0
new_lines = []
for i, line in enumerate(lines):
    modified = line
    
    # Fix: data.graphemes.length -> (data.graphemes || []).length
    if 'data.graphemes.length' in line and '|| []' not in line:
        modified = line.replace('data.graphemes.length', '(data.graphemes || []).length')
        if modified != line:
            fix2_count += 1
            log(f"[FIX2] L{i+1}: Guarded data.graphemes.length")
    
    # Fix: data.graphemes.map -> (data.graphemes || []).map
    if 'data.graphemes.map(' in modified and '|| [])' not in modified:
        modified = modified.replace('data.graphemes.map(', '(data.graphemes || []).map(')
        if modified != lines[i] if i < len(lines) else modified != line:
            fix2_count += 1
            log(f"[FIX2] L{i+1}: Guarded data.graphemes.map()")
    
    new_lines.append(modified)

lines = new_lines
changes += fix2_count
log(f"FIX 2: {fix2_count} .graphemes guards added")

# ============================================================
# WRITE RESULTS
# ============================================================
if changes > 0:
    with open(BACKUP, 'wb') as f:
        with open(MONOLITH, 'rb') as orig:
            f.write(orig.read())
    log(f"\nBackup saved to {BACKUP}")
    
    output = '\ufeff' + '\n'.join(lines)
    with open(MONOLITH, 'w', encoding='utf-8', newline='') as f:
        f.write(output)
    
    new_size = os.path.getsize(MONOLITH)
    log(f"Wrote patched file: {new_size} bytes")

# ============================================================
# VERIFY
# ============================================================
log(f"\n{'='*60}")
log("VERIFICATION")
log(f"{'='*60}")

with open(MONOLITH, 'r', encoding='utf-8-sig') as f:
    verify = f.read()

# Check 'orr' assignments
orr_assigns = re.findall(r"PHONEME_AUDIO_BANK\['orr'\]\s*=", verify)
log(f"  'orr' assignments: {len(orr_assigns)} {'✅' if len(orr_assigns) == 1 else '❌'}")

ahrr_assigns = re.findall(r"PHONEME_AUDIO_BANK\['ahrr'\]\s*=", verify)
log(f"  'ahrr' assignments: {len(ahrr_assigns)} {'✅' if len(ahrr_assigns) == 1 else '❌'}")

err_assigns = re.findall(r"PHONEME_AUDIO_BANK\['err'\]\s*=", verify)
log(f"  'err' assignments: {len(err_assigns)} {'✅' if len(err_assigns) == 1 else '❌'}")

# Check remaining unguarded graphemes access
unguarded_graph = len(re.findall(r'data\.graphemes\.(length|map)', verify))
guarded_graph = len(re.findall(r'\(data\.graphemes \|\| \[\]\)', verify))
log(f"  Unguarded data.graphemes access: {unguarded_graph}")
log(f"  Guarded data.graphemes access: {guarded_graph}")

log(f"\nTotal changes: {changes}")

with open(REPORT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
