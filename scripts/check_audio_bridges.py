"""
Remove the audio bridge constants from word_sounds_module.js,
since they appear to be causing TTS regression.

The CDN module at @44f9dca already has PHONEME_AUDIO_BANK, 
INSTRUCTION_AUDIO, ISOLATION_AUDIO referenced ~50+ times each.
These must have been working in the monolith because they were
in the same scope. In the CDN module, they're undefined unless bridged.

THEORY: The module has its OWN let/const declarations for these
audio banks that we're accidentally SHADOWING with our bridges.
"""

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_sounds_module.js"
with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    c = f.read()

# Check if the module has its own internal definitions (not our bridges)
import re

# Find our bridge lines
bridge_start = c.find("// Audio bridges from parent scope")
if bridge_start < 0:
    bridge_start = c.find("const INSTRUCTION_AUDIO = window.__ALLO_INSTRUCTION_AUDIO")
    
if bridge_start > 0:
    bridge_end = c.find(";", c.find("PHONEME_AUDIO_BANK", bridge_start)) + 1
    bridge = c[bridge_start:bridge_end]
    print(f"Bridge block at char {bridge_start}:")
    print(bridge[:200])
    
    # Remove bridges
    c = c[:bridge_start] + c[bridge_end:]
    print("\nRemoved audio bridge lines")
else:
    print("No bridge lines found")

# Now check: does the module have its OWN INSTRUCTION_AUDIO/etc references?
ia_count = len(re.findall(r'\bINSTRUCTION_AUDIO\b', c))
iso_count = len(re.findall(r'\bISOLATION_AUDIO\b', c))
pab_count = len(re.findall(r'\bPHONEME_AUDIO_BANK\b', c))
print(f"\nReferences after bridge removal:")
print(f"  INSTRUCTION_AUDIO: {ia_count}")
print(f"  ISOLATION_AUDIO: {iso_count}")
print(f"  PHONEME_AUDIO_BANK: {pab_count}")

# Check if any of these have INTERNAL definitions (const/let/var)
for name in ['INSTRUCTION_AUDIO', 'ISOLATION_AUDIO', 'PHONEME_AUDIO_BANK']:
    matches = list(re.finditer(r'\b(const|let|var)\s+' + name + r'\b', c))
    if matches:
        for m in matches:
            line = c[:m.start()].count('\n') + 1
            print(f"  {name} defined at L{line}: {c[m.start():m.start()+60]}")
    else:
        print(f"  {name}: NO definition - needs bridge or will be ReferenceError")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(c)
print("\nDone!")
