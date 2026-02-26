"""
Fix toolbar button + localization keys.
1. Add 7 new keys to roster: block in UI_STRINGS (before closing })
2. Remove Class Roster toolbar button (L56178-56184)
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
changes = 0

# ============================
# FIX 1: Add localization keys to roster: block
# ============================
# Find the end of the roster block — the line with `no_groups_to_generate`
# followed by the closing `},` 
for i, l in enumerate(lines):
    if 'no_groups_to_generate' in l and i > 14000 and i < 16000:
        # Next line should be the closing `},`
        if '},\r\n' in lines[i+1] or lines[i+1].strip() == '},':
            # Check if keys already exist
            block_text = ''.join(lines[14969:i+2])
            if 'strip_title' in block_text:
                print("[OK] FIX 1: strip_title already in roster block")
            else:
                new_keys = [
                    "      strip_title: 'Class Groups',\r\n",
                    "      strip_empty: 'No class roster yet',\r\n",
                    "      strip_create: 'Create one',\r\n",
                    "      emojis_label: 'Use Emojis',\r\n",
                    "      format_standard: 'Standard Text',\r\n",
                    "      format_bullets: 'Bullet Points',\r\n",
                    "      format_outline: 'Outline',\r\n",
                ]
                # Insert before the closing },
                lines = lines[:i+1] + new_keys + lines[i+1:]
                changes += 1
                print("[OK] FIX 1: Added 7 localization keys at L%d" % (i+2))
        break

# ============================
# FIX 2: Remove Class Roster toolbar button
# ============================
for i, l in enumerate(lines):
    if 'setIsRosterKeyOpen(true)' in l and 'bg-purple' in lines[i+1] if i+1 < len(lines) else False:
        # Find the <button that starts this block (could be i-1 or i itself)
        btn_start = i
        for k in range(i, max(i-3, 0), -1):
            if '<button' in lines[k]:
                btn_start = k
                break
        # Find the </button>
        btn_end = i
        for k in range(i, min(i+8, len(lines))):
            if '</button>' in lines[k]:
                btn_end = k
                break
        # Remove these lines
        for k in range(btn_start, btn_end + 1):
            lines[k] = ''
        lines = [l for l in lines if l != '']
        changes += 1
        print("[OK] FIX 2: Removed toolbar button (L%d-L%d)" % (btn_start+1, btn_end+1))
        break
    elif 'setIsRosterKeyOpen(true)' in l and 55000 < i < 57000:
        # Alternate detection — check if bg-purple is in the same line
        if 'bg-purple' in l:
            btn_start = i
            for k in range(i, max(i-3, 0), -1):
                if '<button' in lines[k]:
                    btn_start = k
                    break
            btn_end = i
            for k in range(i, min(i+8, len(lines))):
                if '</button>' in lines[k]:
                    btn_end = k
                    break
            for k in range(btn_start, btn_end + 1):
                lines[k] = ''
            lines = [l for l in lines if l != '']
            changes += 1
            print("[OK] FIX 2: Removed toolbar button (L%d-L%d)" % (btn_start+1, btn_end+1))
            break

# Verify toolbar is gone
toolbar_still = False
for i, l in enumerate(lines):
    if 'setIsRosterKeyOpen' in l and 'bg-purple' in l and 55000 < i < 57000:
        toolbar_still = True
        break
    if 'setIsRosterKeyOpen' in l and i > 55000 and i < 57000:
        # Check surrounding lines for bg-purple
        nearby = ''.join(lines[max(0,i-2):i+3])
        if 'bg-purple' in nearby and 'ClipboardList' in nearby:
            toolbar_still = True
            break

if not toolbar_still:
    print("[VERIFY] Toolbar button confirmed removed")
else:
    print("[WARN] Toolbar button may still be present")

# ============================
# SAVE
# ============================
with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("\n=== Total %d changes applied ===" % changes)
