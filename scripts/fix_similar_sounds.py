#!/usr/bin/env python3
"""Fix SIMILAR_SOUNDS and phonemeMatches scope errors.
Strategy: Read the inline constants from the .bak5 backup (before hoist),
then patch the current file to put them back inline."""
import shutil

FILE = r"C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
BACKUP = FILE + ".bak5"

# Read the backup (before hoisting) to get original inline text
with open(BACKUP, "r", encoding="utf-8", errors="replace") as f:
    bk_lines = f.readlines()

# Read current file
with open(FILE, "r", encoding="utf-8", errors="replace") as f:
    lines = f.readlines()

print(f"Current: {len(lines)} lines, Backup: {len(bk_lines)} lines")
changes = []

# =====================================================================
# STEP 1: Extract phonemeMatches from backup (L5059-L5098 in backup)
# =====================================================================
pm_lines_bk = []
pm_start_bk = None
for i in range(5050, 5110):
    s = bk_lines[i].strip()
    if s == 'const phonemeMatches = {':
        pm_start_bk = i
    if pm_start_bk is not None:
        pm_lines_bk.append(bk_lines[i])
    if pm_start_bk is not None and s == '};':
        break

print(f"Extracted phonemeMatches from backup: {len(pm_lines_bk)} lines starting at L{pm_start_bk+1}")

# =====================================================================
# STEP 2: Extract SIMILAR_SOUNDS from backup (L7916-L7934 in backup)
# =====================================================================
ss_lines_bk = []
ss_start_bk = None
for i in range(7900, 7950):
    s = bk_lines[i].strip()
    if s == 'const SIMILAR_SOUNDS = {':
        ss_start_bk = i
    if ss_start_bk is not None:
        ss_lines_bk.append(bk_lines[i])
    if ss_start_bk is not None and s == '};':
        break

print(f"Extracted SIMILAR_SOUNDS from backup: {len(ss_lines_bk)} lines starting at L{ss_start_bk+1}")

# =====================================================================
# STEP 3: Remove the hoisted phonemeMatches from current file
# =====================================================================
pm_hoist_start = None
pm_hoist_end = None
for i in range(3740, 3800):
    if '// HOISTED: Phoneme normalization map' in lines[i]:
        pm_hoist_start = i
    if pm_hoist_start is not None and lines[i].strip() == '};' and i > pm_hoist_start + 5:
        pm_hoist_end = i
        break

if pm_hoist_start is not None and pm_hoist_end is not None:
    for j in range(pm_hoist_start, pm_hoist_end + 1):
        lines[j] = ''
    changes.append(f"Removed hoisted phonemeMatches from L{pm_hoist_start+1}-L{pm_hoist_end+1}")

# =====================================================================
# STEP 4: Remove the hoisted SIMILAR_SOUNDS from current file
# =====================================================================
ss_hoist_start = None
ss_hoist_end = None
for i in range(3740, 3820):
    if '// HOISTED: Phonetically similar sound confusers' in lines[i]:
        ss_hoist_start = i
    if ss_hoist_start is not None and lines[i].strip() == '};' and i > ss_hoist_start + 5:
        ss_hoist_end = i
        break

if ss_hoist_start is not None and ss_hoist_end is not None:
    for j in range(ss_hoist_start, ss_hoist_end + 1):
        lines[j] = ''
    changes.append(f"Removed hoisted SIMILAR_SOUNDS from L{ss_hoist_start+1}-L{ss_hoist_end+1}")

# =====================================================================
# STEP 5: Put phonemeMatches back inline at its usage site
# Find the comment that replaced it
# =====================================================================
for i in range(5100, 5160):
    if 'phonemeMatches hoisted to module scope' in lines[i]:
        # Get the indentation from the comment line
        indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
        # Replace comment with original constant
        restored = ''
        for bk_line in pm_lines_bk:
            restored += indent + bk_line.lstrip()
        lines[i] = restored
        changes.append(f"Restored phonemeMatches inline at L{i+1}")
        break
else:
    print("WARNING: phonemeMatches usage comment not found, trying broader search...")
    for i in range(5000, 5200):
        if 'phonemeMatches hoisted' in lines[i]:
            indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
            restored = ''
            for bk_line in pm_lines_bk:
                restored += indent + bk_line.lstrip()
            lines[i] = restored
            changes.append(f"Restored phonemeMatches inline at L{i+1} (broad search)")
            break

# =====================================================================
# STEP 6: Put SIMILAR_SOUNDS back inline at its usage site
# =====================================================================
for i in range(7900, 7970):
    if 'SIMILAR_SOUNDS hoisted to module scope' in lines[i]:
        indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
        restored = ''
        for bk_line in ss_lines_bk:
            restored += indent + bk_line.lstrip()
        lines[i] = restored
        changes.append(f"Restored SIMILAR_SOUNDS inline at L{i+1}")
        break
else:
    print("WARNING: SIMILAR_SOUNDS usage comment not found, trying broader search...")
    for i in range(7800, 8000):
        if 'SIMILAR_SOUNDS hoisted' in lines[i]:
            indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
            restored = ''
            for bk_line in ss_lines_bk:
                restored += indent + bk_line.lstrip()
            lines[i] = restored
            changes.append(f"Restored SIMILAR_SOUNDS inline at L{i+1} (broad search)")
            break

# =====================================================================
# STEP 7: Log 401 error body in fetchTTSBytes
# Find: console.error("[TTS] API Error:", response.status, ...)
# =====================================================================
for i in range(42440, 42470):
    if '[TTS] API Error:' in lines[i] and 'console.error' in lines[i]:
        # Check if it already logs the full body
        old_line = lines[i]
        if 'errorBody.substring(0, 200)' not in old_line:
            # It already reads errorBody on a prior line. Just make sure log includes it.
            # Current: console.error("[TTS] API Error:", response.status, response.statusText, errorBody.substring(0, 200));
            # Check what's actually there
            if 'errorBody' in old_line:
                print(f"L{i+1}: Already logs errorBody: {old_line.strip()[:120]}")
                changes.append(f"L{i+1}: TTS 401 already logs errorBody")
            else:
                print(f"L{i+1}: Need to add body logging: {old_line.strip()[:120]}")
        break

# =====================================================================
# Write
# =====================================================================
shutil.copy2(FILE, FILE + ".bak6")
print("Backup created (.bak6)")

content = ''.join(lines)
import re
content = re.sub(r'\n{4,}', '\n\n\n', content)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

final_count = content.count('\n') + 1
print(f"Final file: {final_count} lines")
print(f"\n=== Applied {len(changes)} changes ===")
for c in changes:
    print(f"  {c}")

if len(changes) < 4:
    print(f"\n WARNING: Expected 4+ changes, got {len(changes)}!")
else:
    print("\n All changes applied!")
