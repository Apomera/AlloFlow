"""
Clean fix for the PHONEME_AUDIO_BANK window exposure.
Instead of patching, do a clean search-and-fix approach.
"""

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Clean up any stray \r or double blank lines around where old line was
# The old line was between ISOLATION_AUDIO exposure and SOUND_MATCH_POOL
# Find the area
iso_idx = c.find('window.__ALLO_ISOLATION_AUDIO = ISOLATION_AUDIO;')
sm_idx = c.find('const SOUND_MATCH_POOL = [')

if iso_idx > 0 and sm_idx > 0:
    between = c[iso_idx:sm_idx]
    print("Between ISOLATION_AUDIO and SOUND_MATCH_POOL:")
    print(repr(between[:200]))
    
    # Clean: make it just the isolation line + one blank line + SOUND_MATCH_POOL
    clean_between = 'window.__ALLO_ISOLATION_AUDIO = ISOLATION_AUDIO;\r\n\r\n'
    c = c[:iso_idx] + clean_between + c[sm_idx:]
    print("\nCleaned up gap")

# 2. Verify the PHONEME_AUDIO_BANK exposure is in the right place (after the if block)
idx = c.find("window.__ALLO_PHONEME_AUDIO_BANK = PHONEME_AUDIO_BANK;")
if idx > 0:
    line_num = c[:idx].count('\n') + 1
    print(f"\nPHONEME_AUDIO_BANK exposure at L{line_num}")
    # Show context
    start = max(0, idx-50)
    end = min(len(c), idx+100)
    print(repr(c[start:end]))
else:
    print("\nERROR: PHONEME_AUDIO_BANK exposure not found!")
    # Re-add it
    anchor = "    if (PHONEME_AUDIO_BANK['er'] && !PHONEME_AUDIO_BANK['err']) PHONEME_AUDIO_BANK['err'] = PHONEME_AUDIO_BANK['er'];"
    close_idx = c.find(anchor)
    if close_idx > 0:
        # Find the closing }
        brace_idx = c.find('}', close_idx + len(anchor))
        # Insert after the }
        insert_point = brace_idx + 1
        c = c[:insert_point] + "\r\nwindow.__ALLO_PHONEME_AUDIO_BANK = PHONEME_AUDIO_BANK;\r\n" + c[insert_point:]
        print("Re-added PHONEME_AUDIO_BANK exposure after Proxy")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(c)

# 3. Final verify - check for any stray lone \r characters
lone_r_count = 0
for i, ch in enumerate(c):
    if ch == '\r' and (i + 1 >= len(c) or c[i+1] != '\n'):
        lone_r_count += 1
        if lone_r_count <= 3:
            context = c[max(0,i-20):i+20]
            print(f"  Stray \\r at pos {i}: {repr(context)}")

print(f"\nStray \\r count: {lone_r_count}")
print("Done!")
