"""
FIX: Move window.__ALLO_PHONEME_AUDIO_BANK from L1139 (before definition)
to after L1306 (after PHONEME_AUDIO_BANK is fully defined with all entries).

ROOT CAUSE: At L1139, PHONEME_AUDIO_BANK hasn't been declared yet, so 
typeof returns 'undefined' and window gets {} instead of the Proxy.
"""

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()

# Step 1: Remove the premature window exposure at L1139
OLD_LINE = "window.__ALLO_PHONEME_AUDIO_BANK = typeof PHONEME_AUDIO_BANK !== 'undefined' ? PHONEME_AUDIO_BANK : {};\r\n"
if OLD_LINE in c:
    c = c.replace(OLD_LINE, '')
    print("Step 1: Removed premature window.__ALLO_PHONEME_AUDIO_BANK at L1139")
else:
    # Try without \r\n
    OLD_LINE2 = "window.__ALLO_PHONEME_AUDIO_BANK = typeof PHONEME_AUDIO_BANK !== 'undefined' ? PHONEME_AUDIO_BANK : {};\n"
    if OLD_LINE2 in c:
        c = c.replace(OLD_LINE2, '')
        print("Step 1b: Removed premature line (LF)")
    else:
        print("Step 1 SKIPPED: line not found")

# Step 2: Add window exposure AFTER PHONEME_AUDIO_BANK is fully set up
# The last setup line is the closing } of the orr/ahrr/err block
ANCHOR = "    if (PHONEME_AUDIO_BANK['er'] && !PHONEME_AUDIO_BANK['err']) PHONEME_AUDIO_BANK['err'] = PHONEME_AUDIO_BANK['er'];\r\n}"
if ANCHOR in c:
    c = c.replace(ANCHOR, ANCHOR + "\r\nwindow.__ALLO_PHONEME_AUDIO_BANK = PHONEME_AUDIO_BANK;")
    print("Step 2: Added window.__ALLO_PHONEME_AUDIO_BANK after full definition")
else:
    # Try without \r
    ANCHOR2 = "    if (PHONEME_AUDIO_BANK['er'] && !PHONEME_AUDIO_BANK['err']) PHONEME_AUDIO_BANK['err'] = PHONEME_AUDIO_BANK['er'];\n}"
    if ANCHOR2 in c:
        c = c.replace(ANCHOR2, ANCHOR2 + "\nwindow.__ALLO_PHONEME_AUDIO_BANK = PHONEME_AUDIO_BANK;")
        print("Step 2b: Added (LF)")
    else:
        print("Step 2 SKIPPED: anchor not found")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(c)

# Verify
with open(FILE, 'r', encoding='utf-8') as f:
    v = f.read()
idx = v.find('window.__ALLO_PHONEME_AUDIO_BANK')
if idx > 0:
    line_num = v[:idx].count('\n') + 1
    print(f"\nVerify: window.__ALLO_PHONEME_AUDIO_BANK now at L{line_num}")
    print(f"  Context: {v[idx:idx+80]}")
else:
    print("\nERROR: window.__ALLO_PHONEME_AUDIO_BANK not found!")

print("\nDone!")
