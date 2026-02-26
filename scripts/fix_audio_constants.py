"""
Expose ISOLATION_AUDIO and PHONEME_AUDIO_BANK on window from parent,
and bridge them in CDN module.
"""
import re

# Step 1: Expose on window in parent
FILE1 = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE1, 'r', encoding='utf-8') as f:
    ac = f.read()

# Find end of ISOLATION_AUDIO proxy (after INSTRUCTION_AUDIO section)
# Look for the pattern where ISOLATION_AUDIO proxy ends
ANCHOR1 = "window.__ALLO_INSTRUCTION_AUDIO = INSTRUCTION_AUDIO;"
if ANCHOR1 in ac:
    # Already have INSTRUCTION_AUDIO exposed, now add the others
    # Find where ISOLATION_AUDIO is defined and add window exposure after it
    # ISOLATION_AUDIO proxy ends with });\r\n followed by SOUND_MATCH_POOL
    iso_end = ac.find("const SOUND_MATCH_POOL")
    if iso_end > 0:
        insert_line = "window.__ALLO_ISOLATION_AUDIO = ISOLATION_AUDIO;\r\nwindow.__ALLO_PHONEME_AUDIO_BANK = typeof PHONEME_AUDIO_BANK !== 'undefined' ? PHONEME_AUDIO_BANK : {};\r\n"
        ac = ac[:iso_end] + insert_line + ac[iso_end:]
        with open(FILE1, 'w', encoding='utf-8') as f:
            f.write(ac)
        print('Step 1: Exposed ISOLATION_AUDIO + PHONEME_AUDIO_BANK on window')
    else:
        print('Step 1 SKIPPED: SOUND_MATCH_POOL anchor not found')
else:
    print('Step 1 SKIPPED: INSTRUCTION_AUDIO window exposure not found')

# Step 2: Bridge in CDN module
FILE2 = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_sounds_module.js"
with open(FILE2, 'r', encoding='utf-8') as f:
    ws = f.read()

# Add bridges after the existing INSTRUCTION_AUDIO bridge
OLD_BRIDGE = "const INSTRUCTION_AUDIO = window.__ALLO_INSTRUCTION_AUDIO || {};"
NEW_BRIDGE = """const INSTRUCTION_AUDIO = window.__ALLO_INSTRUCTION_AUDIO || {};
const ISOLATION_AUDIO = window.__ALLO_ISOLATION_AUDIO || {};
const PHONEME_AUDIO_BANK = window.__ALLO_PHONEME_AUDIO_BANK || {};"""

if OLD_BRIDGE in ws:
    ws = ws.replace(OLD_BRIDGE, NEW_BRIDGE)
    with open(FILE2, 'w', encoding='utf-8') as f:
        f.write(ws)
    print('Step 2: Added ISOLATION_AUDIO + PHONEME_AUDIO_BANK bridges')
else:
    print('Step 2 SKIPPED: INSTRUCTION_AUDIO bridge not found')

# Verify all audio constants are now bridged
with open(FILE2, 'r', encoding='utf-8') as f:
    final = f.read()
for name in ['INSTRUCTION_AUDIO', 'ISOLATION_AUDIO', 'PHONEME_AUDIO_BANK']:
    if re.search(r'\bconst\s+' + name + r'\b', final):
        print(f'  ✓ {name} bridged')
    else:
        print(f'  ✗ {name} MISSING')

print('\nDone!')
