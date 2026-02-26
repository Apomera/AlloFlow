"""
Audit: Find all ts() calls in Word Sounds that reference missing localization keys
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Find all ts() calls with word_sounds.* keys
ts_calls = re.findall(r"ts\('(word_sounds\.[a-zA-Z_]+)'\)", content)
ts_keys = sorted(set(ts_calls))
print(f"Found {len(ts_keys)} unique word_sounds.* keys used in ts() calls\n")

# 2. Find all declared localization keys (in UI_STRINGS or similar objects)
# Pattern: 'word_sounds.key': 'value' (single quotes around key)
declared_sq = set(re.findall(r"'(word_sounds\.[a-zA-Z_]+)'\s*:", content))
# Pattern: word_sounds.key: 'value' (no quotes, object property) 
declared_nq = set(re.findall(r"(?:^|\s)(word_sounds_[a-zA-Z_]+)\s*:", content, re.MULTILINE))
# Also check getWordSoundsString fallback keys
# Pattern: word_sounds_key: "value" in object literals
ws_keys = set(re.findall(r"(?:^|\s)((?:activity_|blending_|segmentation_|rhyming_|counting_|isolation_|mapping_|orthography_|spelling_bee_|sound_sort_|word_families_|letter_tracing_|word_scramble_|missing_letter_|test_)[a-zA-Z_]+)\s*:", content, re.MULTILINE))

# Combine all declared keys
all_declared = declared_sq | set(f"word_sounds.{k}" for k in declared_nq) | set(f"word_sounds.{k}" for k in ws_keys)

print(f"Declared localization keys: {len(all_declared)}")
print(f"ts() referenced keys: {len(ts_keys)}\n")

# 3. Find MISSING keys
missing = []
for key in ts_keys:
    # Check if key is declared
    base = key.replace('word_sounds.', '')
    found = (key in all_declared) or (base in ws_keys) or (base in declared_nq)
    # Also check if the base key appears as a property in any object
    if not found:
        # Check direct string match in content
        found = f"'{key}':" in content or f'"{base}"' in content or f"'{base}'" in content
        # Check if it appears as an unquoted property
        if not found:
            found = re.search(rf'\b{re.escape(base)}\s*:', content) is not None
    if not found:
        missing.append(key)

print(f"MISSING ts() keys ({len(missing)}):")
for k in sorted(missing):
    # Find which line(s) reference this key
    lines = []
    for i, line in enumerate(content.split('\n'), 1):
        if f"ts('{k}')" in line:
            lines.append(i)
    print(f"  {chr(10060)} {k}  (lines: {lines[:3]})")

# 4. Also find hardcoded English strings in the Word Sounds render block (~L8000-9700)
# Look for patterns like: >Some English Text< or "Some text" in JSX
ws_start = content.find("case 'isolation':")
ws_end = content.find("case 'counting':", ws_start + 100) if ws_start > 0 else 0
print(f"\n\nWord Sounds render block: chars {ws_start}-{ws_end}")
