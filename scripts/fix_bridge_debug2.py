#!/usr/bin/env python3
"""Switch bridge debug from console.log to console.error + alert."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# 1. Upgrade bridge button click to console.error + alert
old_btn = "() => { console.log('[BRIDGE] Button clicked, setting bridgeSendOpen to true'); setBridgeSendOpen(true); }"
new_btn = "() => { console.error('[BRIDGE] Button clicked!'); alert('Bridge button clicked! Setting bridgeSendOpen=true. isTeacherMode should be true for panel to show.'); setBridgeSendOpen(true); }"
if old_btn in content:
    content = content.replace(old_btn, new_btn, 1)
    changes += 1
    print("1: Upgraded button click to console.error + alert")
else:
    # Try original button without any debug
    old_btn2 = "onClick={() => setBridgeSendOpen(true)}"
    new_btn2 = "onClick={() => { console.error('[BRIDGE] Button clicked!'); alert('Bridge clicked! Setting bridgeSendOpen=true'); setBridgeSendOpen(true); }}"
    if old_btn2 in content:
        content = content.replace(old_btn2, new_btn2, 1)
        changes += 1
        print("1: Added console.error + alert to button (from original)")
    else:
        print("1: SKIP - button pattern not found")

# 2. Upgrade render gate debug
old_gate = "{(() => { if (bridgeSendOpen) console.log('[BRIDGE] Panel gate check: bridgeSendOpen=', bridgeSendOpen, 'isTeacherMode=', isTeacherMode); return null; })()}"
new_gate = "{(() => { if (bridgeSendOpen) { console.error('[BRIDGE] Panel gate: bridgeSendOpen=' + bridgeSendOpen + ' isTeacherMode=' + isTeacherMode); if (!isTeacherMode) console.error('[BRIDGE] BLOCKED: isTeacherMode is FALSE — panel will NOT render!'); } return null; })()}"
if old_gate in content:
    content = content.replace(old_gate, new_gate, 1)
    changes += 1
    print("2: Upgraded gate debug to console.error")
else:
    print("2: SKIP - gate pattern not found, trying to add fresh")
    # Add it before the bridge panel gate
    old_panel = "      {bridgeSendOpen && isTeacherMode && ("
    new_panel = "      {(() => { if (bridgeSendOpen) { console.error('[BRIDGE] Panel gate: bridgeSendOpen=' + bridgeSendOpen + ' isTeacherMode=' + isTeacherMode); if (!isTeacherMode) console.error('[BRIDGE] BLOCKED: isTeacherMode is FALSE!'); } return null; })()}\n      {bridgeSendOpen && isTeacherMode && ("
    if old_panel in content:
        content = content.replace(old_panel, new_panel, 1)
        changes += 1
        print("2b: Added gate debug from scratch")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied.")
