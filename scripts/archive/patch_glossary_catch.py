"""Fix the last remaining silent catch at L41695 (Glossary TTS)"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

old = '}).catch(() => {});'
# We need to find the specific glossary one. Let's use surrounding context.
marker = 'if (url) internalAudioCache.current.set(part, url);'
pos = content.find(marker)
if pos > -1:
    # Find the .catch(() => {}) right after this line
    catch_pos = content.find(old, pos)
    if catch_pos > -1 and catch_pos - pos < 200:
        new = '}).catch(e => warnLog("Glossary TTS pre-cache failed:", e?.message || e));'
        content = content[:catch_pos] + new + content[catch_pos + len(old):]
        print("1. Fixed L41695: Glossary TTS pre-cache silent catch")
    else:
        print("1. Could not find catch near glossary context")
else:
    print("1. Could not find glossary marker")

# Verify counts
console_errors = content.count('console.error(')
silent_catches = content.count('.catch(() => {})')
print(f"Remaining console.error: {console_errors}")
print(f"Remaining silent .catch(() => {{}}): {silent_catches}")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print("File saved.")
