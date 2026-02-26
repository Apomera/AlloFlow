"""Fix remaining 2 confirm() calls: language regen & delete unit."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
changes = 0

# FIX 1: Language regeneration confirm (L17043 area)
for i, l in enumerate(lines):
    if "confirm(t('language_selector.confirm_regenerate'))" in l and 'setConfirmDialog' not in l:
        old = "if (confirm(t('language_selector.confirm_regenerate'))) {"
        new = "setConfirmDialog({ message: t('language_selector.confirm_regenerate') || 'Regenerate language pack?', onConfirm: () => {"
        lines[i] = l.replace(old, new)
        # Find the closing } of the if block
        brace_depth = 1
        for j in range(i + 1, min(i + 10, len(lines))):
            brace_depth += lines[j].count('{') - lines[j].count('}')
            if brace_depth <= 0:
                lines[j] = lines[j].replace('}', '}});', 1)
                changes += 1
                print(f"[OK] L{i+1}: Replaced language regen confirm() with setConfirmDialog")
                break
        break

# FIX 2: Delete unit confirm (L36368 area)
for i, l in enumerate(lines):
    if "!confirm(t('history.delete_unit_confirm'))" in l and 'setConfirmDialog' not in l:
        # Pattern: if (!confirm(...)) return;
        # Need to restructure: wrap the lines AFTER this into onConfirm
        # Find lines until the end of the function (next closing };)
        
        # Get the code that runs if confirm returns true (lines after the confirm guard)
        body_lines = []
        func_end = i
        for j in range(i + 1, min(i + 10, len(lines))):
            if lines[j].strip() == '};':
                func_end = j
                break
            body_lines.append(lines[j])
        
        # Build replacement
        indent = '      '
        new_block = f"{indent}setConfirmDialog({{ message: t('history.delete_unit_confirm') || 'Delete this unit?', onConfirm: () => {{\n"
        for bl in body_lines:
            new_block += bl
        new_block += f"{indent}}} }});\n"
        
        lines[i:func_end] = [new_block]
        changes += 1
        print(f"[OK] L{i+1}: Replaced delete unit confirm() with setConfirmDialog")
        break

if changes > 0:
    open(filepath, 'w', encoding='utf-8').write(''.join(lines))
    print(f"\n{changes} additional fixes applied.")
else:
    print("No remaining confirm() calls found to fix.")
