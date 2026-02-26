#!/usr/bin/env python3
"""Fix bridge panel interaction - add stopPropagation and pointer-events."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# Fix 1: Add stopPropagation, pointer-events, maxHeight, overflow to inner panel
old_inner = "border:'3px solid red'}}>"
new_inner = "border:'3px solid red',pointerEvents:'all',position:'relative',zIndex:100000,maxHeight:'85vh',overflowY:'auto'}} onClick={(e) => e.stopPropagation()}>"

if old_inner in content:
    content = content.replace(old_inner, new_inner, 1)
    changes += 1
    print("1: Added stopPropagation + pointer-events + maxHeight to panel")
else:
    print("1: SKIP - panel pattern not found")

# Fix 2: Add pointer-events to textarea
old_ta = 'className="bridge-send-input"'
new_ta = 'className="bridge-send-input" style={{pointerEvents:"all"}}'
# Only replace the first occurrence (which is the bridge one)
if old_ta in content and new_ta not in content:
    content = content.replace(old_ta, new_ta, 1)
    changes += 1
    print("2: Added pointer-events to textarea")
else:
    print("2: SKIP - textarea already fixed or not found")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied.")
