#!/usr/bin/env python3
"""Fix missing Calendar import and add bridge debug logging."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# Fix 1: Add Calendar to imports
old_import = "ScanSearch } from 'lucide-react';"
new_import = "ScanSearch, Calendar } from 'lucide-react';"
if 'Calendar }' not in content and 'Calendar,' not in content.split('lucide-react')[0]:
    if old_import in content:
        content = content.replace(old_import, new_import, 1)
        changes += 1
        print("1: Added Calendar to lucide-react imports")
    else:
        print("1: SKIP - import line not found")
else:
    print("1: SKIP - Calendar already imported")

# Fix 2: Add console.log to bridge button click for debugging
old_bridge_btn = "onClick={() => setBridgeSendOpen(true)} className=\"p-1.5 rounded-md hover:bg-teal-100 text-teal-600\" title={t('roster.bridge_mode_btn') || '\U0001f310 Bridge Mode'}"
new_bridge_btn = "onClick={() => { console.log('[BRIDGE] Button clicked, setting bridgeSendOpen to true'); setBridgeSendOpen(true); }} className=\"p-1.5 rounded-md hover:bg-teal-100 text-teal-600\" title={t('roster.bridge_mode_btn') || '\U0001f310 Bridge Mode'}"
if old_bridge_btn in content:
    content = content.replace(old_bridge_btn, new_bridge_btn, 1)
    changes += 1
    print("2: Added console.log to bridge button click")
else:
    print("2: SKIP - bridge button pattern not found")

# Fix 3: Add console.log to bridge panel render gate
old_gate = "{bridgeSendOpen && isTeacherMode && ("
new_gate = "{(() => { if (bridgeSendOpen) console.log('[BRIDGE] Panel gate check: bridgeSendOpen=', bridgeSendOpen, 'isTeacherMode=', isTeacherMode); return null; })()}\n      {bridgeSendOpen && isTeacherMode && ("
if old_gate in content:
    content = content.replace(old_gate, new_gate, 1)
    changes += 1
    print("3: Added console.log to bridge panel render gate")
else:
    print("3: SKIP - gate pattern not found")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied.")
