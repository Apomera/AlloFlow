#!/usr/bin/env python3
"""Apply 4 optimization changes to Word Sounds in AlloFlowANTI.txt.

1. Hoist phonemeMatches to module scope (before component)
2. Hoist SIMILAR_SOUNDS to module scope (before component)
3. Remove handleAudio from elkoninBoxes handler deps (L9420)
4. Consolidate duplicate estimateFirstPhoneme/estimateLastPhoneme
"""
import shutil

FILE = r"C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, "r", encoding="utf-8", errors="replace") as f:
    lines = f.readlines()

print(f"Loaded {len(lines)} lines")
changes = []

# =====================================================================
# FIX 1: Hoist phonemeMatches to module scope
# Currently at L5059-L5098 inside handleAudio.
# Strategy: Replace the inline `const phonemeMatches = {...}` with a 
# reference to a module-level constant. Insert the constant definition
# just before the component (near PHONEME_BANK at ~L3748).
# =====================================================================

# First, find the exact block
pm_start = None
pm_end = None
pm_content = []
for i in range(5050, 5105):
    s = lines[i].strip()
    if s == 'const phonemeMatches = {':
        pm_start = i
    if pm_start is not None:
        pm_content.append(lines[i])
    if pm_start is not None and s == '};':
        pm_end = i
        break

if pm_start is not None and pm_end is not None:
    # Replace inline definition with reference comment
    indent = lines[pm_start][:len(lines[pm_start]) - len(lines[pm_start].lstrip())]
    lines[pm_start] = indent + '// phonemeMatches hoisted to module scope (PERF: avoid re-allocation per render)\n'
    # Remove the content lines (but keep the last }; as a blank line)
    for j in range(pm_start + 1, pm_end + 1):
        lines[j] = ''
    
    # Insert the constant at module scope (just before PHONEME_BANK at ~L3748)
    # Find the PHONEME_BANK definition
    insert_idx = None
    for i in range(3740, 3760):
        if 'const PHONEME_BANK' in lines[i]:
            insert_idx = i
            break
    
    if insert_idx is not None:
        # Build the module-level constant
        module_const = "// HOISTED: Phoneme normalization map (was inside handleAudio)\n"
        for line in pm_content:
            # Remove extra indentation (these were deeply nested)
            stripped = line.lstrip()
            module_const += "    " + stripped if stripped else "\n"
        module_const += "\n"
        
        lines.insert(insert_idx, module_const)
        changes.append(f"Fix 1: Hoisted phonemeMatches from L{pm_start+1} to module scope at L{insert_idx+1}")
        # Adjust all subsequent line references by +1 due to insert
        # (PM content lines were blanked, so net effect is small)
    else:
        print("WARNING: Could not find PHONEME_BANK insertion point")
else:
    print(f"WARNING: Fix 1 - phonemeMatches block not found! start={pm_start}")

# Recalculate file size after insertions
print(f"After Fix 1: {len(lines)} lines")

# =====================================================================
# FIX 2: Hoist SIMILAR_SOUNDS to module scope
# Currently at ~L7916-L7934 inside the isolation effect.
# Strategy: Same approach — replace inline with reference, add at module scope.
# =====================================================================

ss_start = None
ss_end = None
ss_content = []
for i in range(7900, 7950):
    s = lines[i].strip()
    if s == 'const SIMILAR_SOUNDS = {':
        ss_start = i
    if ss_start is not None:
        ss_content.append(lines[i])
    if ss_start is not None and s == '};':
        ss_end = i
        break

if ss_start is not None and ss_end is not None:
    indent = lines[ss_start][:len(lines[ss_start]) - len(lines[ss_start].lstrip())]
    lines[ss_start] = indent + '// SIMILAR_SOUNDS hoisted to module scope (PERF: avoid re-allocation per render)\n'
    for j in range(ss_start + 1, ss_end + 1):
        lines[j] = ''
    
    # Insert at module scope (right after phonemeMatches if it exists, or before PHONEME_BANK)
    # Find where we inserted the phonemeMatches constant
    insert_idx2 = None
    for i in range(3740, 3770):
        if 'const PHONEME_BANK' in lines[i]:
            insert_idx2 = i
            break
    
    if insert_idx2 is not None:
        module_const2 = "// HOISTED: Phonetically similar sound confusers (was inside isolation effect)\n"
        for line in ss_content:
            stripped = line.lstrip()
            module_const2 += "    " + stripped if stripped else "\n"
        module_const2 += "\n"
        
        lines.insert(insert_idx2, module_const2)
        changes.append(f"Fix 2: Hoisted SIMILAR_SOUNDS from L{ss_start+1} to module scope at L{insert_idx2+1}")
    else:
        print("WARNING: Could not find insertion point for SIMILAR_SOUNDS")
else:
    print(f"WARNING: Fix 2 - SIMILAR_SOUNDS block not found! start={ss_start}")

print(f"After Fix 2: {len(lines)} lines")

# =====================================================================
# FIX 3: Remove handleAudio from elkoninBoxes handler deps (~L9420)
# =====================================================================

for i in range(9400, 9440):
    if 'elkoninBoxes, soundChips, playSound, handleAudio' in lines[i]:
        lines[i] = lines[i].replace(
            ', [elkoninBoxes, soundChips, playSound, handleAudio])',
            ', [elkoninBoxes, soundChips, playSound]); // eslint-disable-next-line react-hooks/exhaustive-deps'
        )
        changes.append(f"Fix 3: Removed handleAudio from elkoninBoxes deps at L{i+1}")
        break
else:
    print("WARNING: Fix 3 target not found!")

# =====================================================================
# FIX 4: Consolidate duplicate estimateFirstPhoneme/estimateLastPhoneme
# The L3759 (original) versions are simpler; the L11108 (Sound Sort) 
# versions have exception maps and soft C/G rules.
# Strategy: Upgrade L3759/L3772 with the enhanced logic, then replace
# L11091-L11134 with calls to the top-level versions.
# =====================================================================

# 4a: Find + replace the SIMPLE estimateFirstPhoneme at L3759
for i in range(3750, 3775):
    s = lines[i].strip()
    if s == 'const estimateFirstPhoneme = (word) => {':
        # Find its end
        for j in range(i+1, i+20):
            if lines[j].strip() == '};':
                # Replace the simple version with the enhanced version
                indent = '    '  # module-level indent
                enhanced = f"""{indent}const estimateFirstPhoneme = (word) => {{
{indent}    if (!word) return '';
{indent}    const w = word.toLowerCase();
{indent}    // Exception map (soft C/G, silent letters)
{indent}    const EXCEPTIONS = {{
{indent}        'city': 's', 'cent': 's', 'cell': 's', 'circle': 's', 'cycle': 's', 'cedar': 's', 'cereal': 's', 'center': 's',
{indent}        'gym': 'j', 'gem': 'j', 'giant': 'j', 'giraffe': 'j', 'gentle': 'j', 'germ': 'j', 'gist': 'j', 'ginger': 'j',
{indent}        'knight': 'n', 'knee': 'n', 'knob': 'n', 'knock': 'n', 'knot': 'n', 'know': 'n', 'knife': 'n',
{indent}        'wrap': 'r', 'wren': 'r', 'write': 'r', 'wrong': 'r', 'wrist': 'r',
{indent}        'gnaw': 'n', 'gnat': 'n', 'gnome': 'n',
{indent}        'psalm': 's', 'psychology': 's',
{indent}    }};
{indent}    if (EXCEPTIONS[w]) return EXCEPTIONS[w];
{indent}    // Digraphs
{indent}    const digraphs = (PHONEME_BANK && PHONEME_BANK['Digraphs']) || ['sh', 'ch', 'th', 'wh', 'ph', 'ng', 'ck'];
{indent}    for (const dg of digraphs) {{ if (w.startsWith(dg)) return dg; }}
{indent}    if (w.startsWith('kn')) return 'n';
{indent}    if (w.startsWith('wr')) return 'r';
{indent}    if (w.startsWith('gn')) return 'n';
{indent}    // Soft C/G rules
{indent}    if (w.startsWith('c') && w.length > 1 && 'eiy'.includes(w[1])) return 's';
{indent}    if (w.startsWith('g') && w.length > 1 && 'eiy'.includes(w[1])) return 'j';
{indent}    return w.charAt(0);
{indent}}};
"""
                # Replace lines i through j
                for k in range(i, j+1):
                    lines[k] = ''
                lines[i] = enhanced
                changes.append(f"Fix 4a: Upgraded estimateFirstPhoneme at L{i+1} with exception maps & soft C/G rules")
                break
        break

# 4b: Find + replace the SIMPLE estimateLastPhoneme at L3772
for i in range(3770, 3800):
    s = lines[i].strip()
    if s == 'const estimateLastPhoneme = (word) => {':
        for j in range(i+1, i+20):
            if lines[j].strip() == '};':
                indent = '    '
                enhanced2 = f"""{indent}const estimateLastPhoneme = (word) => {{
{indent}    if (!word) return '';
{indent}    const w = word.toLowerCase();
{indent}    // Exception map (silent final E, -tion/-sion)
{indent}    const EXCEPTIONS = {{
{indent}        'come': 'm', 'some': 'm', 'done': 'n', 'gone': 'n', 'give': 'v', 'live': 'v', 'have': 'v',
{indent}        'nation': 'n', 'action': 'n',
{indent}    }};
{indent}    if (EXCEPTIONS[w]) return EXCEPTIONS[w];
{indent}    // R-Controlled
{indent}    const rControlled = (PHONEME_BANK && PHONEME_BANK['R-Controlled']) || ['ar', 'er', 'ir', 'or', 'ur'];
{indent}    for (const rc of rControlled) {{ if (w.endsWith(rc)) return rc; }}
{indent}    // Digraphs
{indent}    const digraphs = (PHONEME_BANK && PHONEME_BANK['Digraphs']) || ['sh', 'ch', 'th', 'ng', 'ck'];
{indent}    for (const dg of digraphs) {{
{indent}        if (dg === 'ck' && w.endsWith('ck')) return 'k';
{indent}        if (w.endsWith(dg)) return dg;
{indent}    }}
{indent}    return w.slice(-1);
{indent}}};
"""
                for k in range(i, j+1):
                    lines[k] = ''
                lines[i] = enhanced2
                changes.append(f"Fix 4b: Upgraded estimateLastPhoneme at L{i+1} with exception maps")
                break
        break

# 4c: Replace the duplicate definitions at ~L11091-L11134 with references
# Find the Sound Sort block's local copies
for i in range(11080, 11120):
    s = lines[i].strip()
    if s.startswith('const PHONEME_EXCEPTIONS_FIRST'):
        # Find end of the second estimateLastPhoneme (search for its closing };)
        block_end = None
        est_count = 0
        for j in range(i, i+60):
            ls = lines[j].strip()
            if ls.startswith('const estimateFirstPhoneme') or ls.startswith('const estimateLastPhoneme'):
                est_count += 1
            if est_count == 2 and ls == '};':
                block_end = j
                break
        
        if block_end is not None:
            # Comment out the entire block and add a note
            indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
            lines[i] = indent + '// CONSOLIDATED: estimateFirstPhoneme/estimateLastPhoneme now use upgraded top-level versions (L3759/L3772)\n'
            for j in range(i+1, block_end + 1):
                lines[j] = ''
            changes.append(f"Fix 4c: Removed duplicate estimateFirst/LastPhoneme block L{i+1}-L{block_end+1} (uses top-level versions)")
        else:
            print(f"WARNING: Fix 4c - Could not find end of duplicate block")
        break

# =====================================================================
# Write
# =====================================================================
shutil.copy2(FILE, FILE + ".bak5")
print("Backup created (.bak5)")

with open(FILE, "w", encoding="utf-8") as f:
    f.writelines(lines)

# Clean up blank lines
with open(FILE, "r", encoding="utf-8", errors="replace") as f:
    content = f.read()
# Remove excessive blank lines (3+ in a row → 2)
import re
content = re.sub(r'\n{4,}', '\n\n\n', content)
with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

final_count = content.count('\n') + 1
print(f"Final file: {final_count} lines")
print(f"\n=== Applied {len(changes)} changes ===")
for c in changes:
    print(f"  {c}")

if len(changes) < 5:
    print(f"\n⚠️ WARNING: Expected 5+ changes, got {len(changes)}!")
else:
    print("\n✅ All changes applied successfully!")
