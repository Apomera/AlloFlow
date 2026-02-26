"""
Fix INSTRUCTION_AUDIO access from CDN module:
1. Expose INSTRUCTION_AUDIO on window in the parent (AlloFlowANTI.txt) 
2. Bridge it in the CDN module (word_sounds_module.js) so all 53 refs work
"""

# STEP 1: Expose INSTRUCTION_AUDIO on window in parent
FILE1 = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE1, 'r', encoding='utf-8') as f:
    ac = f.read()

# Add window exposure after the INSTRUCTION_AUDIO Proxy definition
# The Proxy ends with "});" at around line 1088
ANCHOR = "});\nlet _CACHE_ISOLATION_AUDIO = null;"
if ANCHOR in ac:
    NEW = "});\nwindow.__ALLO_INSTRUCTION_AUDIO = INSTRUCTION_AUDIO;\nlet _CACHE_ISOLATION_AUDIO = null;"
    ac = ac.replace(ANCHOR, NEW)
    with open(FILE1, 'w', encoding='utf-8') as f:
        f.write(ac)
    print('Step 1: Exposed INSTRUCTION_AUDIO on window')
else:
    # Try \r\n
    ANCHOR2 = "});\r\nlet _CACHE_ISOLATION_AUDIO = null;"
    if ANCHOR2 in ac:
        NEW2 = "});\r\nwindow.__ALLO_INSTRUCTION_AUDIO = INSTRUCTION_AUDIO;\r\nlet _CACHE_ISOLATION_AUDIO = null;"
        ac = ac.replace(ANCHOR2, NEW2)
        with open(FILE1, 'w', encoding='utf-8') as f:
            f.write(ac)
        print('Step 1b: Exposed INSTRUCTION_AUDIO on window (\\r\\n)')
    else:
        print('Step 1 SKIPPED: anchor not found')

# STEP 2: Add INSTRUCTION_AUDIO bridge in CDN module
FILE2 = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_sounds_module.js"
with open(FILE2, 'r', encoding='utf-8') as f:
    ws = f.read()

# Add bridge constant after the GRADE_SUBTEST_BATTERIES definition
BRIDGE = "\nconst INSTRUCTION_AUDIO = window.__ALLO_INSTRUCTION_AUDIO || {};\n"
ANCHOR3 = "const GRADE_SUBTEST_BATTERIES"
idx = ws.find(ANCHOR3)
if idx > 0:
    # Find end of the GRADE_SUBTEST_BATTERIES definition
    end_idx = ws.find('};', idx) + 2
    ws = ws[:end_idx] + BRIDGE + ws[end_idx:]
    with open(FILE2, 'w', encoding='utf-8') as f:
        f.write(ws)
    print('Step 2: Added INSTRUCTION_AUDIO bridge from window')
else:
    print('Step 2 SKIPPED: GRADE_SUBTEST_BATTERIES not found')

# Also expose ISOLATION_AUDIO and PHONEME_AUDIO_BANK on window if used
with open(FILE2, 'r', encoding='utf-8') as f:
    ws2 = f.read()

# Check for other missing audio constants
for name in ['ISOLATION_AUDIO', 'PHONEME_AUDIO_BANK']:
    import re
    used = re.search(r'\b' + name + r'\b', ws2) is not None
    defined = re.search(r'\b(const|let|var)\s+' + name + r'\b', ws2) is not None
    if used and not defined:
        print(f'  ⚠ {name} is used but NOT defined in CDN')
    elif used:
        print(f'  ✓ {name} is defined')
    else:
        print(f'  - {name} not used')

print('\nDone!')
