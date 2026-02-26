#!/usr/bin/env python3
"""
Fix bridge textarea lag by making it uncontrolled.
The 77K-line monolith re-renders on every keystroke when using controlled inputs.
Solution: remove value/onChange binding, read from DOM on send.
Also cleans up debug logging.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# 1. Remove the gate debug IIFE (it's spamming console on every re-render)
gate_debug = """{(() => { if (bridgeSendOpen) { console.error('[BRIDGE] Panel gate: bridgeSendOpen=' + bridgeSendOpen + ' isTeacherMode=' + isTeacherMode); if (!isTeacherMode) console.error('[BRIDGE] BLOCKED: isTeacherMode is FALSE — panel will NOT render!'); } return null; })()}
      """
if gate_debug in content:
    content = content.replace(gate_debug, '', 1)
    changes += 1
    print("1: Removed gate debug IIFE (no longer needed)")
else:
    print("1: SKIP - gate debug not found")

# 2. Make textarea uncontrolled - replace value+onChange with id+defaultValue
# Current pattern includes our pointer-events fix
old_textarea = 'className="bridge-send-input" style={{pointerEvents:"all"}}\n\n              value={bridgeSendText}\n\n              onChange={(e) => setBridgeSendText(e.target.value)}'
new_textarea = 'className="bridge-send-input" style={{pointerEvents:"all"}} id="bridge-send-textarea"\n\n              defaultValue=""'

if old_textarea in content:
    content = content.replace(old_textarea, new_textarea, 1)
    changes += 1
    print("2: Converted textarea to uncontrolled (id + defaultValue)")
else:
    # Try without the pointer-events addition
    old_textarea2 = 'className="bridge-send-input"\n\n              value={bridgeSendText}\n\n              onChange={(e) => setBridgeSendText(e.target.value)}'
    new_textarea2 = 'className="bridge-send-input" id="bridge-send-textarea"\n\n              defaultValue=""'
    if old_textarea2 in content:
        content = content.replace(old_textarea2, new_textarea2, 1)
        changes += 1
        print("2b: Converted textarea to uncontrolled (alt pattern)")
    else:
        print("2: SKIP - textarea pattern not found, searching line by line...")
        # Line-by-line approach
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'value={bridgeSendText}' in line and i > 76000:
                lines[i] = line.replace('value={bridgeSendText}', 'defaultValue="" id="bridge-send-textarea"')
                changes += 1
                print(f"2c: Fixed value binding at line {i+1}")
                break
        if changes > 1:
            # Also remove the onChange line
            for i, line in enumerate(lines):
                if "onChange={(e) => setBridgeSendText(e.target.value)}" in line and i > 76000:
                    lines[i] = ''
                    changes += 1
                    print(f"2d: Removed onChange at line {i+1}")
                    break
            content = '\n'.join(lines)

# 3. Update the send handler to read from DOM instead of state
# Replace all references to bridgeSendText in the send handler with a local variable
# The send handler starts with "if (!bridgeSendText.trim()) return;"
old_check = "if (!bridgeSendText.trim()) return;"
new_check = "const bridgeSendText = (document.getElementById('bridge-send-textarea') || {}).value || ''; if (!bridgeSendText.trim()) return;"

if old_check in content:
    content = content.replace(old_check, new_check, 1)
    changes += 1
    print("3: Updated send handler to read from DOM")
else:
    print("3: SKIP - send check pattern not found")

# 4. Update the disabled check on the send button
# "disabled={!bridgeSendText.trim() || bridgeSending}" 
# Since bridgeSendText state won't be updated, just disable based on bridgeSending
old_disabled = "disabled={!bridgeSendText.trim() || bridgeSending}"
new_disabled = "disabled={bridgeSending}"
if old_disabled in content:
    content = content.replace(old_disabled, new_disabled, 1)
    changes += 1
    print("4: Updated disabled check (removed text check, kept sending check)")
else:
    print("4: SKIP - disabled pattern not found")

# 5. Clean up the textarea after successful send
old_clear = "setBridgeSendText('');"
if old_clear in content:
    content = content.replace(old_clear, "setBridgeSendText(''); const _ta = document.getElementById('bridge-send-textarea'); if (_ta) _ta.value = '';", 1)
    changes += 1
    print("5: Added DOM clear after send")
else:
    print("5: SKIP - clear pattern not found")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied.")
