"""
Replace all audio constant references with direct window.__ALLO_*?. access.
Removes bridge declarations and uses optional chaining for safety.
"""
import re

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_sounds_module.js"
with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    c = f.read()

original_len = len(c)

# Step 1: Remove the bridge declarations and event listener
# Find and remove the audio bridge block
bridge_patterns = [
    # The let declarations
    r"\s*// Audio constants from parent scope\n",
    r"\s*let INSTRUCTION_AUDIO = window\.__ALLO_INSTRUCTION_AUDIO \|\| \{\};\n",
    r"\s*let ISOLATION_AUDIO = window\.__ALLO_ISOLATION_AUDIO \|\| \{\};\n",
    r"\s*let PHONEME_AUDIO_BANK = window\.__ALLO_PHONEME_AUDIO_BANK \|\| \{\};\n",
    r"\s*// Re-bind after audio bank loads to get live Proxy references\n",
    r"\s*window\.addEventListener\('audio_bank_loaded'.*?\}\);\n",
    # Const versions (in case)
    r"\s*const INSTRUCTION_AUDIO = window\.__ALLO_INSTRUCTION_AUDIO \|\| \{\};\n",
    r"\s*const ISOLATION_AUDIO = window\.__ALLO_ISOLATION_AUDIO \|\| \{\};\n",
    r"\s*const PHONEME_AUDIO_BANK = window\.__ALLO_PHONEME_AUDIO_BANK \|\| \{\};\n",
]

for pat in bridge_patterns:
    c = re.sub(pat, '', c, flags=re.DOTALL)

# Also remove the console.log bridge init and end marker
c = re.sub(r"\s*console\.log\('\[WS-AUDIO\].*?'\);\n", '', c)

# Remove the event listener block more thoroughly
c = re.sub(
    r"\s*window\.addEventListener\('audio_bank_loaded',\s*\(\)\s*=>\s*\{[^}]*\}\);\s*\n?",
    '\n', c, flags=re.DOTALL
)

print(f"Step 1: Removed bridge declarations ({original_len - len(c)} chars removed)")

# Step 2: Replace all INSTRUCTION_AUDIO references with window.__ALLO_INSTRUCTION_AUDIO?.
# Need to be careful with patterns:
# INSTRUCTION_AUDIO['key'] -> window.__ALLO_INSTRUCTION_AUDIO?.['key']
# INSTRUCTION_AUDIO[var] -> window.__ALLO_INSTRUCTION_AUDIO?.[var]
# INSTRUCTION_AUDIO.key -> window.__ALLO_INSTRUCTION_AUDIO?.key
# typeof INSTRUCTION_AUDIO -> typeof window.__ALLO_INSTRUCTION_AUDIO

replacements = {
    'INSTRUCTION_AUDIO': 'window.__ALLO_INSTRUCTION_AUDIO',
    'ISOLATION_AUDIO': 'window.__ALLO_ISOLATION_AUDIO', 
    'PHONEME_AUDIO_BANK': 'window.__ALLO_PHONEME_AUDIO_BANK',
}

total_replacements = 0
for old_name, new_name in replacements.items():
    count = 0
    
    # Pattern 1: typeof OLD_NAME -> typeof NEW_NAME
    pattern1 = r'typeof\s+' + old_name + r'\b'
    replacement1 = 'typeof ' + new_name
    c, n = re.subn(pattern1, replacement1, c)
    count += n
    
    # Pattern 2: OLD_NAME[ -> NEW_NAME?.[
    pattern2 = old_name + r'\['
    replacement2 = new_name + '?.['
    c = c.replace(pattern2, replacement2)
    count += c.count(new_name + '?.[') - count  # approximate
    
    # Pattern 3: OLD_NAME && OLD_NAME -> NEW_NAME && NEW_NAME (already handled by above)
    
    # Pattern 4: Any remaining standalone OLD_NAME references
    # Use word boundary regex to catch: if (OLD_NAME) or OLD_NAME.key etc
    remaining = len(re.findall(r'\b' + old_name + r'\b', c))
    if remaining > 0:
        # Replace remaining with new_name
        c = re.sub(r'\b' + old_name + r'\b', new_name, c)
        count += remaining
    
    total_replacements += count
    print(f"  {old_name}: {count} replacements")

# Step 3: Fix double optional chaining that might occur
# window.__ALLO_X?.?. -> window.__ALLO_X?.
c = c.replace('?.?.', '?.')

# Step 4: Fix typeof window.__ALLO_X cases to not use ?.
# typeof already handles undefined safely
c = re.sub(r'typeof window\.(__ALLO_\w+)\?\.', r'typeof window.\1.', c)

# Step 5: Fix patterns like: if (window.__ALLO_X && window.__ALLO_X?.[key])
# This is fine, but ensure the first reference doesn't have ?.
# Actually these patterns are correct with optional chaining

print(f"\nStep 2: {total_replacements} total reference replacements")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(c)

# Verify: no remaining bare references
remaining_checks = []
for old_name in replacements.keys():
    matches = re.findall(r'\b' + old_name + r'\b', c)
    if matches:
        remaining_checks.append(f"  WARNING: {len(matches)} remaining {old_name} refs!")

if remaining_checks:
    for w in remaining_checks:
        print(w)
else:
    print("\n✅ All audio constant references replaced with window.__ALLO_*")

# Show a few examples of the replacements
print("\n=== SAMPLE REPLACEMENTS ===")
for m in re.finditer(r'window\.__ALLO_\w+', c):
    ctx = c[max(0,m.start()-10):m.start()+60]
    print(f"  {ctx.strip()[:70]}")
    if m.start() > 50000:
        break
    
print(f"\nFinal file size: {len(c)} chars (was {original_len})")
