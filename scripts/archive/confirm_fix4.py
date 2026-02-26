"""Fix final 2 window.confirm() calls."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
changes = 0

def replace_simple_confirm(lines, search_str, msg_key, fallback_msg):
    for i, l in enumerate(lines):
        if search_str in l and 'setConfirmDialog' not in l:
            brace_depth = 0
            block_end = i
            for j in range(i, min(i + 20, len(lines))):
                brace_depth += lines[j].count('{') - lines[j].count('}')
                if brace_depth <= 0 and j > i:
                    block_end = j  
                    break
            indent = ''
            for c in l:
                if c in ' \t':
                    indent += c
                else:
                    break
            body = ''.join(lines[i+1:block_end])
            new_block = f"{indent}setConfirmDialog({{ message: t('{msg_key}') || '{fallback_msg}', onConfirm: () => {{\n"
            new_block += body
            new_block += f"{indent}}} }});\n"
            lines[i:block_end+1] = [new_block]
            return lines, i+1
    return lines, None

# 1. Clear edges
lines, ln = replace_simple_confirm(lines, "window.confirm(t('concept_map.confirm_clear_edges'))",
    'concept_map.confirm_clear_edges', 'Clear all connections?')
if ln: changes += 1; print(f"[OK] L{ln}: Fixed clear edges confirm()")

# 2. Retry challenge (confirm_reset)
lines, ln = replace_simple_confirm(lines, "window.confirm(t('concept_map.notifications.confirm_reset'))",
    'concept_map.notifications.confirm_reset', 'Reset the challenge?')
if ln: changes += 1; print(f"[OK] L{ln}: Fixed retry challenge confirm()")

if changes > 0:
    open(filepath, 'w', encoding='utf-8').write(''.join(lines))
    print(f"\n{changes} final fixes applied.")
else:
    print("No remaining window.confirm() calls found.")
