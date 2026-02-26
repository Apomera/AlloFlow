"""
Extract the full handleAudio function and check for any reference
to INSTRUCTION_AUDIO or other bridge constants.
Also check if the module defines handleAudio differently when 
INSTRUCTION_AUDIO is defined vs undefined.
"""
import re

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_sounds_module.js"
with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    c = f.read()

# Extract handleAudio
idx = c.find('const handleAudio')
if idx > 0:
    # Get the full useCallback
    # Find the dependency array closer: ), [deps]);
    search_from = idx
    depth = 0
    found_callback_end = False
    for i in range(idx, min(idx + 3000, len(c))):
        if c[i] == '(' and not found_callback_end: depth += 1
        elif c[i] == ')' and not found_callback_end:
            depth -= 1
        # Look for the pattern "), [" which ends the useCallback
        if c[i:i+4] == '], [' or c[i:i+3] == '), ':
            if depth <= 1:
                # Find end of deps
                dep_end = c.find(');', i)
                if dep_end > 0:
                    full_ha = c[idx:dep_end+2]
                    print(f"handleAudio ({len(full_ha)} chars)")
                    print(full_ha[:2000])
                    print("...")
                    if len(full_ha) > 2000:
                        print(full_ha[-500:])
                    break

# Also check: is there any code that checks typeof INSTRUCTION_AUDIO?
print("\n=== typeof checks ===")
for name in ['INSTRUCTION_AUDIO', 'ISOLATION_AUDIO', 'PHONEME_AUDIO_BANK']:
    for m in re.finditer(r'typeof\s+' + name, c):
        line = c[:m.start()].count('\n') + 1
        ctx = c[m.start():m.start()+80]
        print(f"  L{line}: {ctx}")

# Check if there's an error boundary or try-catch around these references
print("\n=== try-catch around audio constants ===")
for m in re.finditer(r'try\s*\{', c):
    block = c[m.start():m.start()+500]
    if any(name in block for name in ['INSTRUCTION_AUDIO', 'ISOLATION_AUDIO', 'PHONEME_AUDIO_BANK']):
        line = c[:m.start()].count('\n') + 1
        print(f"  try-catch at L{line} references audio constants")

# KEY: Check if there's conditional logic based on INSTRUCTION_AUDIO being defined
print("\n=== Conditional checks on audio constants ===")
for name in ['INSTRUCTION_AUDIO', 'ISOLATION_AUDIO', 'PHONEME_AUDIO_BANK']:
    for m in re.finditer(name + r'\s*&&\s*' + name + r'\[|if\s*\(\s*' + name + r'\b', c):
        line = c[:m.start()].count('\n') + 1
        ctx = c[m.start():m.start()+100]
        print(f"  L{line}: {ctx[:80]}")
