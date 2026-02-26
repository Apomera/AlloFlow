"""Fix remaining 4 window.confirm() calls."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
changes = 0

def replace_simple_confirm(lines, search_str, msg_key, fallback_msg):
    """Replace a simple if (window.confirm(...)) { body } pattern."""
    for i, l in enumerate(lines):
        if search_str in l and 'setConfirmDialog' not in l:
            # Find the body and closing }
            brace_depth = 0
            block_start = i
            block_end = i
            for j in range(i, min(i + 20, len(lines))):
                brace_depth += lines[j].count('{') - lines[j].count('}')
                if brace_depth <= 0 and j > i:
                    block_end = j  
                    break
            
            # Get indentation
            indent = ''
            for c in l:
                if c in ' \t':
                    indent += c
                else:
                    break
            
            # Build replacement
            body = ''.join(lines[i+1:block_end])
            new_block = f"{indent}setConfirmDialog({{ message: t('{msg_key}') || '{fallback_msg}', onConfirm: () => {{\n"
            new_block += body
            new_block += f"{indent}}} }});\n"
            
            lines[i:block_end+1] = [new_block]
            return lines, i+1
    return lines, None

# 1. Scaffold reset: if (window.confirm(t('scaffolds.reset_confirm')))
lines, ln = replace_simple_confirm(lines, "window.confirm(t('scaffolds.reset_confirm'))", 
    'scaffolds.reset_confirm', 'Reset all answers?')
if ln: changes += 1; print(f"[OK] L{ln}: Fixed scaffold reset confirm()")

# 2. Delete concept map node: if (window.confirm(t('concept_map.confirm_delete_node')))
lines, ln = replace_simple_confirm(lines,
    "window.confirm(t('concept_map.confirm_delete_node'))",
    'concept_map.confirm_delete_node', 'Delete this node?')
if ln: changes += 1; print(f"[OK] L{ln}: Fixed concept map delete node confirm()")

# 3. Exit challenge: if (window.confirm(t('concept_map.notifications.confirm_exit')))
lines, ln = replace_simple_confirm(lines,
    "window.confirm(t('concept_map.notifications.confirm_exit'))",
    'concept_map.notifications.confirm_exit', 'Exit the challenge?')
if ln: changes += 1; print(f"[OK] L{ln}: Fixed exit challenge confirm()")

# 4. Second end session dialog: if (window.confirm(t('session.end_confirm_dialog')))
lines, ln = replace_simple_confirm(lines,
    "window.confirm(t('session.end_confirm_dialog'))",
    'session.end_confirm_dialog', 'End this session?')
if ln: changes += 1; print(f"[OK] L{ln}: Fixed second end session confirm()")

if changes > 0:
    open(filepath, 'w', encoding='utf-8').write(''.join(lines))
    print(f"\n{changes} additional fixes applied.")
else:
    print("No remaining window.confirm() calls found.")
