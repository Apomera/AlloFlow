"""
Comprehensive fix script for all 4 approved improvements:
1. Fix Review Words button (force fresh mount to reset hasStartedFromReview)
2. Image generation concurrency limit (allow up to 5 concurrent, not just 1)
3. Dead code cleanup (~300 lines: DISABLE_GEMINI_PHONEMES, V2, prefetchNextWords body)
4. NOTE: Audio preload already works correctly - no changes needed
"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

le = '\r\n' if lines[0].endswith('\r\n') else '\n'
changes = []
original_count = len(lines)

# ══════════════════════════════════════════════════════════════
# FIX 1: Review Words button - Force fresh mount in onShowReview
# ══════════════════════════════════════════════════════════════
# Find the onShowReview handler at ~L71538
fix1_done = False
for i in range(71530, 71550):
    if i >= len(lines):
        break
    if 'onShowReview={() => {' in lines[i]:
        # Find the block end (closing }})
        block_end = None
        for j in range(i+1, i+15):
            if '}}' in lines[j] and 'setActiveView' in lines[j-1]:
                block_end = j
                break
            if '}}' in lines[j]:
                block_end = j
                break
                
        if block_end:
            # Replace the handler body
            new_handler = [
                '              onShowReview={() => {' + le,
                '                  // Navigate to word sounds modal with review panel' + le,
                '                  // Force unmount-remount to reset internal refs (hasStartedFromReview)' + le,
                '                  setIsWordSoundsMode(false);' + le,
                '                  setTimeout(() => {' + le,
                '                      setWordSoundsActivity(\'word-sounds\');' + le,
                '                      setWordSoundsAutoReview(true);' + le,
                '                      setIsWordSoundsMode(true);' + le,
                '                      setActiveView(\'output\');' + le,
                '                  }, 0);' + le,
                '              }}' + le,
            ]
            lines[i:block_end+1] = new_handler
            changes.append(f"FIX 1: Updated onShowReview handler at ~L{i+1} to force fresh mount")
            fix1_done = True
            
if not fix1_done:
    print("WARNING: Could not apply FIX 1 (Review Words button)")

# ══════════════════════════════════════════════════════════════
# FIX 2: Image generation concurrency limit (5 max)
# ══════════════════════════════════════════════════════════════
# Currently uses a single `generatingImageIndex` state (only 1 at a time)
# Change to a Set-based approach with MAX_CONCURRENT = 5

# Find generatingImageIndex state declaration
fix2_done = False
for i in range(3100, 3350):
    if i >= len(lines):
        break
    if 'generatingImageIndex' in lines[i] and 'useState' in lines[i]:
        # Replace with Set-based state
        old = lines[i]
        # Keep the original single state for backward compat but add concurrent set
        new_line = old.replace(
            'useState(null)',
            'useState(null); // Single active index (UI indicator)'
        )
        # Insert concurrent set state after
        insert_line = '    const [generatingImageSet, setGeneratingImageSet] = React.useState(new Set()); // Track concurrent image generations (max 5)' + le
        lines.insert(i + 1, insert_line)
        changes.append(f"FIX 2a: Added generatingImageSet state at L{i+2}")
        fix2_done = True
        break

# Now update handleGenerateWordImage to use concurrent set
if fix2_done:
    for i in range(len(lines)):
        if 'const handleGenerateWordImage' in lines[i] and 'useCallback' in lines[i]:
            # Find the gate: `if (generatingImageIndex !== null) return;`
            for j in range(i, i+5):
                if 'generatingImageIndex !== null' in lines[j]:
                    # Replace with concurrent limit
                    lines[j] = '        if (generatingImageSet.size >= 5) { console.warn("⚠️ Max 5 concurrent image generations"); return; } // Concurrency limit' + le
                    changes.append(f"FIX 2b: Updated concurrency gate at L{j+1}")
                    break
            
            # Find setGeneratingImageIndex(index) - add to set
            for j in range(i, i+5):
                if 'setGeneratingImageIndex(index)' in lines[j]:
                    lines[j] = '        setGeneratingImageIndex(index); setGeneratingImageSet(prev => new Set(prev).add(index));' + le
                    changes.append(f"FIX 2c: Added to generatingImageSet at L{j+1}")
                    break
            
            # Find setGeneratingImageIndex(null) calls - remove from set
            for j in range(i, i+60):
                if j >= len(lines):
                    break
                if 'setGeneratingImageIndex(null)' in lines[j]:
                    lines[j] = lines[j].replace(
                        'setGeneratingImageIndex(null)',
                        'setGeneratingImageIndex(null); setGeneratingImageSet(prev => { const s = new Set(prev); s.delete(index); return s; })'
                    )
                    changes.append(f"FIX 2d: Remove from generatingImageSet at L{j+1}")
            break

# ══════════════════════════════════════════════════════════════
# FIX 3: Dead Code Cleanup
# ══════════════════════════════════════════════════════════════

# 3a: Remove DISABLE_GEMINI_PHONEMES dead block (L5069 to L5218)
# The block is: if (!DISABLE_GEMINI_PHONEMES) { ... } // END if
# We keep the const declaration (L5067) with a comment, and the code AFTER the END marker

# Find boundaries more precisely
block1_start = None
block1_end = None
for i in range(len(lines)):
    if 'if (!DISABLE_GEMINI_PHONEMES)' in lines[i] and block1_start is None:
        block1_start = i
    if '} // END if (!DISABLE_GEMINI_PHONEMES)' in lines[i]:
        block1_end = i
        break

if block1_start and block1_end:
    # Remove from block_start to block_end (inclusive)
    removed = block1_end - block1_start + 1
    del lines[block1_start:block1_end + 1]
    changes.append(f"FIX 3a: Removed DISABLE_GEMINI_PHONEMES dead block ({removed} lines from ~L{block1_start+1})")
    
    # Also remove the const declaration (now at block1_start - 2)
    for i in range(max(0, block1_start-5), block1_start):
        if 'const DISABLE_GEMINI_PHONEMES = true;' in lines[i]:
            # Replace with a comment
            lines[i] = '        // NOTE: Gemini phoneme analysis disabled. All phoneme data is generated during pre-load phase.' + le
            changes.append(f"FIX 3a: Replaced DISABLE_GEMINI_PHONEMES const with comment at L{i+1}")
            break

# 3b: Remove DISABLE_GEMINI_PHONEMES_V2 block
# This is a small block: const + if statement + body
v2_start = None
v2_end = None
for i in range(len(lines)):
    if 'DISABLE_GEMINI_PHONEMES_V2' in lines[i] and 'const' in lines[i]:
        v2_start = i
        # Find the closing brace
        depth = 0
        for j in range(i, i+15):
            if 'if (DISABLE_GEMINI_PHONEMES_V2)' in lines[j]:
                depth = 1
                for k in range(j+1, j+12):
                    depth += lines[k].count('{') - lines[k].count('}')
                    if depth <= 0:
                        v2_end = k
                        break
                break
        break

if v2_start is not None and v2_end is not None:
    removed = v2_end - v2_start + 1
    del lines[v2_start:v2_end + 1]
    changes.append(f"FIX 3b: Removed DISABLE_GEMINI_PHONEMES_V2 block ({removed} lines)")

# 3c: Remove prefetchNextWords dead body after return;
# Find "return;" in prefetchNextWords and remove everything up to the function end
pf_return = None
pf_func_end = None
for i in range(len(lines)):
    if 'const prefetchNextWords' in lines[i] and 'useCallback' in lines[i]:
        # Find the early return
        for j in range(i, i+10):
            if lines[j].strip() == 'return;':
                pf_return = j
                break
        # Find the function closing: }, [deps]);
        if pf_return:
            depth = 0
            for j in range(i, i+200):
                depth += lines[j].count('{') - lines[j].count('}')
                if depth == 0 and j > i + 2:
                    # This should be the closing of the useCallback
                    # The function body end is 1 line before the deps array
                    pf_func_end = j
                    break
        break

if pf_return is not None and pf_func_end is not None:
    # Remove from (pf_return + 1) to (pf_func_end - 1), keeping the return and closing
    removed = (pf_func_end - 1) - (pf_return + 1) + 1
    if removed > 5:  # Sanity check
        del lines[pf_return + 1:pf_func_end - 1]  # Keep closing }, [deps]);
        changes.append(f"FIX 3c: Removed prefetchNextWords dead body ({removed} lines after return;)")
    else:
        changes.append(f"FIX 3c: SKIPPED - only {removed} lines to remove (unexpected)")

# ══════════════════════════════════════════════════════════════
# Write results
# ══════════════════════════════════════════════════════════════
f = open(FILE, 'w', encoding='utf-8')
f.write(''.join(lines))
f.close()

new_count = len(lines)
print(f"\nApplied {len(changes)} changes:")
for c in changes:
    print(f"  ✅ {c}")
print(f"\nLines: {original_count} -> {new_count} (removed {original_count - new_count})")
