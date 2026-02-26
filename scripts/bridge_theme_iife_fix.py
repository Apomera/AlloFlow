#!/usr/bin/env python3
"""Fix the IIFE closure for the display panel."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# The display panel now starts with: {bridgeMessage && (() => {
# It needs to close with: )})()}
# Current closing at L77402 is just: )}
# Find the exact closing by looking for the pattern after the student reactions section

old_close = """            </div>

          </div>

        </div>

      )}

      <RosterKeyPanel"""

new_close = """            </div>

          </div>

        </div>

      )})()}

      <RosterKeyPanel"""

if old_close in content:
    content = content.replace(old_close, new_close, 1)
    changes += 1
    print("1: Fixed IIFE closure for display panel")
else:
    print("1: SKIP - display panel closing not found")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied.")
