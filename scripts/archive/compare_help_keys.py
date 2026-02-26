"""
Compare help_mode keys (from backup) vs HELP_STRINGS keys (in current file)
to check if anything was lost.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

# Read the BACKUP to get the original help_mode keys
# We need to check the backup since we already trimmed help_mode
# Try to get help_mode keys from git history, or reconstruct from safe_inject which ran before trim
# Actually: we can use the parity check's unused key list to reconstruct what was there
# Easier: just compare HELP_STRINGS keys vs data-help-key attrs to find gaps in HELP_STRINGS
import os

# Check if backup exists under various names
backup_candidates = [
    'AlloFlowANTI-backup.txt',
    'AlloFlowANTI_backup.txt', 
    'AlloFlowANTI-clean.txt',
    'AlloFlowANTI.txt.bak',
    'AlloFlowANTI_clean_backup.txt',
]
BACKUP = None
for name in backup_candidates:
    if os.path.exists(name):
        BACKUP = name
        print(f"Found backup: {name}")
        break

if BACKUP is None:
    print("No backup found. Comparing HELP_STRINGS vs data-help-key directly.")
    BACKUP = None

CURRENT = 'AlloFlowANTI.txt'

# --- Extract help_mode keys from backup ---
with open(BACKUP, 'r', encoding='utf-8') as f:
    backup_lines = f.readlines()

help_mode_keys = set()
in_help_mode = False
depth = 0

for i, line in enumerate(backup_lines):
    stripped = line.strip()
    if stripped.startswith('help_mode:') and '{' in stripped:
        in_help_mode = True
        depth = 1
        continue
    
    if in_help_mode:
        # Track depth with string awareness
        in_str = None
        escape = False
        for ch in line:
            if escape: escape = False; continue
            if ch == '\\':
                if in_str: escape = True
                continue
            if ch in ('"', "'", '`'):
                if in_str is None: in_str = ch
                elif in_str == ch: in_str = None
                continue
            if in_str: continue
            if ch == '{': depth += 1
            elif ch == '}': depth -= 1
        
        if depth == 0:
            in_help_mode = False
            continue
        
        # Extract key names at depth 1 (direct children of help_mode)
        if depth == 1:
            m = re.match(r"\s+['\"]?(\w+)['\"]?\s*:", line)
            if m:
                help_mode_keys.add(m.group(1))

print(f"help_mode keys in backup: {len(help_mode_keys)}")

# --- Extract HELP_STRINGS keys from current file ---
with open(CURRENT, 'r', encoding='utf-8') as f:
    current_lines = f.readlines()

help_strings_keys = set()
in_help_strings = False
depth = 0

for i, line in enumerate(current_lines):
    stripped = line.strip()
    if 'HELP_STRINGS' in stripped and '=' in stripped and '{' in stripped:
        in_help_strings = True
        depth = 1
        continue
    
    if in_help_strings:
        in_str = None
        escape = False
        for ch in line:
            if escape: escape = False; continue
            if ch == '\\':
                if in_str: escape = True
                continue
            if ch in ('"', "'", '`'):
                if in_str is None: in_str = ch
                elif in_str == ch: in_str = None
                continue
            if in_str: continue
            if ch == '{': depth += 1
            elif ch == '}': depth -= 1
        
        if depth == 0:
            in_help_strings = False
            continue
        
        # Extract key names
        if depth == 1:
            m = re.match(r"""\s+['\"]([^'"]+)['\"]?\s*:""", line)
            if m:
                help_strings_keys.add(m.group(1))

print(f"HELP_STRINGS keys in current: {len(help_strings_keys)}")

# --- Also get data-help-key values ---
current_content = ''.join(current_lines)
data_help_keys = set(re.findall(r'data-help-key="([^"]+)"', current_content))
print(f"data-help-key attributes: {len(data_help_keys)}")

# --- Compare ---
# Normalize help_mode keys (they use underscores, HELP_STRINGS uses underscores too)
# Check: which help_mode keys have NO equivalent in HELP_STRINGS?
in_help_mode_only = help_mode_keys - help_strings_keys
in_help_strings_only = help_strings_keys - help_mode_keys
in_both = help_mode_keys & help_strings_keys

print(f"\n=== COMPARISON ===")
print(f"In both:           {len(in_both)}")
print(f"In help_mode ONLY: {len(in_help_mode_only)}")
print(f"In HELP_STRINGS ONLY: {len(in_help_strings_only)}")

if in_help_mode_only:
    print(f"\n--- Keys in help_mode but NOT in HELP_STRINGS ({len(in_help_mode_only)}): ---")
    for k in sorted(in_help_mode_only):
        print(f"  {k}")

# Also check: are those help_mode-only keys referenced by data-help-key?
referenced_missing = in_help_mode_only & data_help_keys
unreferenced_missing = in_help_mode_only - data_help_keys

print(f"\n--- Of those, referenced by data-help-key: {len(referenced_missing)} ---")
for k in sorted(referenced_missing):
    print(f"  ⚠️  {k}")

print(f"\n--- Of those, NOT referenced anywhere: {len(unreferenced_missing)} ---")
for k in sorted(unreferenced_missing)[:30]:
    print(f"  ✅ {k}")
if len(unreferenced_missing) > 30:
    print(f"  ... and {len(unreferenced_missing) - 30} more")
