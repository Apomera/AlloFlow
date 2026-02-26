"""
Moderate Issues Surgery Script
================================
Fixes:
  1. Add fallback guards to unguarded .map() calls on data.distractors and data.options
  2. Add console.warn to silent catch blocks in critical paths
"""
import sys, os, re, hashlib

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
MONOLITH = os.path.join(os.path.dirname(__file__), 'AlloFlowANTI.txt')
BACKUP = MONOLITH + '.bak_moderate'
REPORT = os.path.join(os.path.dirname(__file__), 'moderate_result.txt')

out = []
def log(msg):
    out.append(msg)
    print(msg)

# Read monolith
with open(MONOLITH, 'r', encoding='utf-8-sig') as f:
    text = f.read()

lines = text.split('\n')
log(f"Loaded {len(lines)} lines")
changes = 0

# ============================================================
# FIX 1: Guard data.distractors.map() -> (data.distractors || []).map()
# ============================================================

# Only replace the unguarded .map() calls - not those already guarded with ||
# Target: data.distractors.map(  ->  (data.distractors || []).map(
# But avoid double-wrapping if already has || []

fix1_count = 0
new_lines = []
for i, line in enumerate(lines):
    modified = line
    
    # Fix data.distractors.map( -> (data.distractors || []).map(
    if 'data.distractors.map(' in modified and '|| [])' not in modified:
        modified = modified.replace('data.distractors.map(', '(data.distractors || []).map(')
        if modified != line:
            fix1_count += 1
            log(f"  [FIX1] L{i+1}: Guarded data.distractors.map()")
    
    # Fix data.options.map( -> (data.options || []).map(
    if 'data.options.map(' in modified and '|| [])' not in modified:
        modified = modified.replace('data.options.map(', '(data.options || []).map(')
        if modified != line:
            fix1_count += 1
            log(f"  [FIX1] L{i+1}: Guarded data.options.map()")
    
    new_lines.append(modified)

lines = new_lines
log(f"\nFIX 1: Guarded {fix1_count} .map() calls on data.distractors / data.options")
changes += fix1_count

# ============================================================
# FIX 2: Add console.warn to silent catch blocks
# ============================================================

fix2_count = 0
new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    stripped = line.strip()
    
    # Detect } catch(e){} or } catch(e) {} patterns (single-line silent catches)
    if re.search(r'\}\s*catch\s*\(\w+\)\s*\{\s*\}', stripped):
        # Extract the error variable name
        m = re.search(r'catch\s*\((\w+)\)', stripped)
        err_var = m.group(1) if m else 'e'
        
        # Get indent
        indent = line[:len(line) - len(line.lstrip())]
        
        # Replace single-line catch with multi-line including console.warn
        # Find what's before the catch
        before_catch = re.sub(r'\s*catch\s*\(\w+\)\s*\{\s*\}.*', '', line)
        modified = f"{before_catch} catch({err_var}) {{ console.warn('Caught error:', {err_var}?.message || {err_var}); }}\r"
        new_lines.append(modified)
        fix2_count += 1
        log(f"  [FIX2] L{i+1}: Added console.warn to silent catch")
        i += 1
        continue
    
    new_lines.append(line)
    i += 1

lines = new_lines
log(f"\nFIX 2: Added console.warn to {fix2_count} silent catch blocks")
changes += fix2_count

# ============================================================
# WRITE RESULTS
# ============================================================

if changes > 0:
    # Backup
    with open(BACKUP, 'wb') as f:
        with open(MONOLITH, 'rb') as orig:
            f.write(orig.read())
    log(f"\nBackup saved to {BACKUP}")
    
    # Write patched file (preserve BOM)
    output = '\ufeff' + '\n'.join(lines)
    with open(MONOLITH, 'w', encoding='utf-8', newline='') as f:
        f.write(output)
    
    new_size = os.path.getsize(MONOLITH)
    log(f"Wrote patched file: {new_size} bytes")
else:
    log("No changes needed!")

# Verify
log(f"\n{'='*60}")
log(f"VERIFICATION")
log(f"{'='*60}")

with open(MONOLITH, 'r', encoding='utf-8-sig') as f:
    verify = f.read()

# Check no remaining unguarded data.distractors.map(
remaining_unguarded = 0
for i, line in enumerate(verify.split('\n')):
    if 'data.distractors.map(' in line and '|| [])' not in line:
        remaining_unguarded += 1
        log(f"  ⚠️  Still unguarded at L{i+1}: {line.strip()[:80]}")

if remaining_unguarded == 0:
    log("  ✅ All data.distractors.map() calls are guarded")
else:
    log(f"  ❌ {remaining_unguarded} unguarded .map() calls remain")

# Check no more single-line silent catches
remaining_silent = len(re.findall(r'\}\s*catch\s*\(\w+\)\s*\{\s*\}', verify))
if remaining_silent == 0:
    log("  ✅ No single-line silent catch blocks remain")
else:
    log(f"  ⚠️  {remaining_silent} silent catch blocks remain")

log(f"\nTotal changes applied: {changes}")
log("Done!")

with open(REPORT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
