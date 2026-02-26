#!/usr/bin/env python3
"""Fix visual panel button icons to be visually distinct."""

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# Fix 1: Change export PNG icon from camera-flash (📸) to floppy (💾)
old1 = '                                    \U0001f4f8\r\n'
new1 = '                                    \U0001f4be\r\n'
if old1 in content:
    content = content.replace(old1, new1, 1)
    changes += 1
    print('Fix 1: Changed export icon from 📸 to 💾')
else:
    # try LF
    old1_lf = old1.replace('\r\n', '\n')
    new1_lf = new1.replace('\r\n', '\n')
    if old1_lf in content:
        content = content.replace(old1_lf, new1_lf, 1)
        changes += 1
        print('Fix 1 (LF): Changed export icon from 📸 to 💾')
    else:
        print('Fix 1: SKIPPED - 📸 not found')

# Fix 2: Change revert icon from ↩️ to 🔄 and update tooltip
old2 = 'title="Remove uploaded image & restore AI image"'
new2 = 'title="Restore original AI-generated image"'
if old2 in content:
    content = content.replace(old2, new2, 1)
    changes += 1
    print('Fix 2a: Updated revert tooltip')
else:
    print('Fix 2a: SKIPPED - old tooltip not found')

old3 = '                                            \u21a9\ufe0f\r\n'
new3 = '                                            \U0001f504\r\n'
if old3 in content:
    content = content.replace(old3, new3, 1)
    changes += 1
    print('Fix 2b: Changed revert icon from ↩️ to 🔄')
else:
    old3_lf = old3.replace('\r\n', '\n')
    new3_lf = new3.replace('\r\n', '\n')
    if old3_lf in content:
        content = content.replace(old3_lf, new3_lf, 1)
        changes += 1
        print('Fix 2b (LF): Changed revert icon from ↩️ to 🔄')
    else:
        print('Fix 2b: SKIPPED - ↩️ not found')

if changes > 0:
    with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'\nSUCCESS: {changes} changes applied')
else:
    print('\nERROR: No changes made')
