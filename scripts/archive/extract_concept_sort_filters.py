"""
Extract Concept Sort Venn view items.filter() calls to useMemo.

items.filter(i => i.currentZone === 'setA') → vennSetA
items.filter(i => i.currentZone === 'setB') → vennSetB
items.filter(i => i.currentZone === 'shared') → vennShared
items.filter(i => i.currentZone === 'bank') → vennBank

Insert 4 useMemo constants before `return (` at L23330
Replace 5 inline filter calls with the memoized vars
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

changes = 0

# Replacements for Venn view
venn_replacements = {
    "items.filter(i => i.currentZone === 'setA')": "vennSetA",
    "items.filter(i => i.currentZone === 'setB')": "vennSetB", 
    "items.filter(i => i.currentZone === 'shared')": "vennShared",
    "items.filter(i => i.currentZone === 'bank')": "vennBank",
}

# Count occurrences before replacement
for pattern, var_name in venn_replacements.items():
    count = content.count(pattern)
    print(f"  {var_name} ({pattern[:50]}): {count} occurrences")

# Find the return statement for the Venn view and insert memos before it
# The return is at approximately L23330 — find the exact line
lines = content.split('\n')

# Look for the return ( in the Venn component area
venn_return_idx = None
for i in range(23320, min(23340, len(lines))):
    if lines[i].strip() == 'return (':
        venn_return_idx = i
        break

if venn_return_idx is None:
    # Broader search
    for i in range(23300, min(23360, len(lines))):
        if 'return (' in lines[i].strip():
            venn_return_idx = i
            break

if venn_return_idx:
    indent = '    '  # Typical component body indent
    # Actually get the indent from the return statement
    return_line = lines[venn_return_idx]
    indent = return_line[:len(return_line) - len(return_line.lstrip())]
    
    memo_lines = [
        f"{indent}const vennSetA = useMemo(() => items.filter(i => i.currentZone === 'setA'), [items]);",
        f"{indent}const vennSetB = useMemo(() => items.filter(i => i.currentZone === 'setB'), [items]);",
        f"{indent}const vennShared = useMemo(() => items.filter(i => i.currentZone === 'shared'), [items]);",
        f"{indent}const vennBank = useMemo(() => items.filter(i => i.currentZone === 'bank'), [items]);",
    ]
    
    # Insert before the return
    for memo_line in reversed(memo_lines):
        lines.insert(venn_return_idx, memo_line)
    
    content = '\n'.join(lines)
    changes += 4
    print(f"\nInserted 4 useMemo constants before return at L{venn_return_idx + 1}")

# Now do the replacements
for pattern, var_name in venn_replacements.items():
    # Replace .map( chains
    old = pattern + '.map('
    new = var_name + '.map('
    count = content.count(old)
    if count:
        content = content.replace(old, new)
        changes += count
        print(f"  Replaced {count} .map() chains: {old[:40]}... → {var_name}.map(")
    
    # Replace .length usage
    old_len = pattern + '.length'
    new_len = var_name + '.length'
    count_len = content.count(old_len)
    if count_len:
        content = content.replace(old_len, new_len)
        changes += count_len
        print(f"  Replaced {count_len} .length: {old_len[:40]}... → {var_name}.length")

# ===================================================================
# Also do the Bucket view (return@L23065)
# items.filter(i => i.currentContainer === bucket.id) — 2x
# items.filter(i => i.currentContainer === 'deck') — 2x
# The bucket.id one is INSIDE a buckets.map() loop, so we can't
# extract it easily. But the 'deck' one is outside the loop.
# ===================================================================
deck_pattern = "items.filter(i => i.currentContainer === 'deck')"
deck_count = content.count(deck_pattern)
print(f"\nDeck items pattern: {deck_count} occurrences")

if deck_count >= 2:
    # Find the return for the bucket view (around L23065)
    bucket_return_idx = None
    new_lines = content.split('\n')
    for i in range(23050, min(23080, len(new_lines))):
        if new_lines[i].strip() == 'return (' or 'return (' in new_lines[i]:
            bucket_return_idx = i
            break
    
    if bucket_return_idx:
        bucket_indent = new_lines[bucket_return_idx][:len(new_lines[bucket_return_idx]) - len(new_lines[bucket_return_idx].lstrip())]
        memo_line = f"{bucket_indent}const deckItems = useMemo(() => items.filter(i => i.currentContainer === 'deck'), [items]);"
        new_lines.insert(bucket_return_idx, memo_line)
        content = '\n'.join(new_lines)
        
        content = content.replace(deck_pattern + '.map(', 'deckItems.map(')
        content = content.replace(deck_pattern + '.length', 'deckItems.length')
        changes += 3
        print(f"  Extracted deckItems useMemo before return@L{bucket_return_idx + 1}")

# ===================================================================
# Also extract soundChips.filter in Sound Sort (L8679)
# ===================================================================
sound_pattern = "soundChips.filter(c => !c.used)"
sound_count = content.count(sound_pattern)
print(f"\nSound chips filter: {sound_count} occurrences")

if sound_count >= 1:
    # Find the return for Sound Sort (around L8614)
    new_lines = content.split('\n')
    sound_return_idx = None
    for i in range(8600, min(8625, len(new_lines))):
        if new_lines[i].strip() == 'return (' or 'return (' in new_lines[i]:
            sound_return_idx = i
            break
    
    if sound_return_idx:
        sound_indent = new_lines[sound_return_idx][:len(new_lines[sound_return_idx]) - len(new_lines[sound_return_idx].lstrip())]
        memo_line = f"{sound_indent}const availableChips = useMemo(() => soundChips.filter(c => !c.used), [soundChips]);"
        new_lines.insert(sound_return_idx, memo_line)
        content = '\n'.join(new_lines)
        
        content = content.replace(sound_pattern + '.map(', 'availableChips.map(')
        content = content.replace(sound_pattern + '.length', 'availableChips.length')
        changes += 2
        print(f"  Extracted availableChips useMemo before return@L{sound_return_idx + 1}")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal changes: {changes}")
print("DONE")
