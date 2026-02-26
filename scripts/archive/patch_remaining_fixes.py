"""
Comprehensive Word Sounds patch:
1. Remove VERIFY_AUDIO debug logs
2. Fix progress bar hardcoded /10 → use SESSION_LENGTH
3. Add 'all words correct' auto-advance trigger
4. Activate revisit queue replay
"""
import re

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

original_count = len(lines)
print(f"Loaded {original_count} lines")
changes = 0

# ============================================================
# FIX 1: Remove VERIFY_AUDIO debug logs
# ============================================================
print("\n=== FIX 1: Remove VERIFY_AUDIO debug block ===")

# Find the block: "// --- VERIFICATION LOGS ---" to "// -------------------------"
verify_start = None
verify_end = None
for i, line in enumerate(lines):
    if '--- VERIFICATION LOGS ---' in line:
        verify_start = i
    if verify_start and '// -------------------------' in line:
        verify_end = i
        break

if verify_start is not None and verify_end is not None:
    # Remove lines from verify_start to verify_end (inclusive)
    del lines[verify_start:verify_end + 1]
    removed = verify_end - verify_start + 1
    changes += 1
    print(f"  Removed {removed} debug log lines at L{verify_start+1}-L{verify_end+1}")
else:
    print(f"  WARNING: VERIFY_AUDIO block not found (start={verify_start}, end={verify_end})")

# ============================================================
# FIX 2: Fix progress bar hardcoded /10
# ============================================================
print("\n=== FIX 2: Fix progress bar /10 ===")

# Replace the hardcoded references
# {Math.min(wordSoundsSessionProgress, 10)}/10
old_progress = '{Math.min(wordSoundsSessionProgress, 10)}/10'
new_progress = '{Math.min(wordSoundsSessionProgress, SESSION_LENGTH)}/{SESSION_LENGTH}'
joined = '\n'.join(lines)
if old_progress in joined:
    joined = joined.replace(old_progress, new_progress)
    changes += 1
    print(f"  Fixed progress text display")
else:
    print(f"  WARNING: Progress text pattern not found")

# {Math.min(wordSoundsSessionProgress * 10, 100)}%
old_width = 'Math.min(wordSoundsSessionProgress * 10, 100)'
new_width = 'Math.min((wordSoundsSessionProgress / SESSION_LENGTH) * 100, 100)'
if old_width in joined:
    joined = joined.replace(old_width, new_width)
    changes += 1
    print(f"  Fixed progress bar width calc")
else:
    print(f"  WARNING: Progress width pattern not found")

lines = joined.split('\n')

# ============================================================
# FIX 3: Add 'all words correct at least once' auto-advance 
# ============================================================
print("\n=== FIX 3: All-words-correct auto-advance ===")

# The adaptive director is at: "else if (!showLetterHints && readyToAdvance)"
# We also want to advance when ALL session words have been seen correctly.
# The sessionQueueRef tracks remaining words. When it's empty AND the session
# had items, the user has completed all words for that activity.
#
# Best approach: Add an OR condition in the readyToAdvance check:
# readyToAdvance = (attempted >= MIN_PRACTICE && streak >= 3) || allWordsCompleted
# Where allWordsCompleted = sessionQueueRef.current[activity] empty AND attempted > 0

# Find: "const readyToAdvance = actStats.attempted >= MIN_PRACTICE && newStreak >= 3;"
for i, line in enumerate(lines):
    if 'const readyToAdvance = actStats.attempted >= MIN_PRACTICE && newStreak >= 3;' in line:
        indent = line[:len(line) - len(line.lstrip())]
        # Add allWordsCompleted check
        new_line = f"""{indent}const queueRemaining = sessionQueueRef.current[wordSoundsActivity] || [];
{indent}const allWordsCompleted = actStats.attempted > 0 && queueRemaining.length === 0;
{indent}const readyToAdvance = (actStats.attempted >= MIN_PRACTICE && newStreak >= 3) || allWordsCompleted;"""
        lines[i] = new_line
        changes += 1
        print(f"  Added allWordsCompleted check at L{i+1}")
        break
else:
    print(f"  WARNING: readyToAdvance line not found")

# ============================================================
# FIX 4: Activate revisit queue replay
# ============================================================
print("\n=== FIX 4: Activate revisit queue ===")

# Find the TODO comment: "// TODO: Start revisit mode"
for i, line in enumerate(lines):
    if '// TODO: Start revisit mode' in line:
        indent = line[:len(line) - len(line.lstrip())]
        # Replace TODO with actual revisit logic
        revisit_code = f"""{indent}// Revisit mode: replay missed words in their original activities
{indent}const firstRevisit = revisitQueue[0];
{indent}if (firstRevisit) {{
{indent}    // Reset streak for fair revisit
{indent}    setWordSoundsScore(prev => ({{ ...prev, streak: 0 }}));
{indent}    if (setWordSoundsStreak) setWordSoundsStreak(0);
{indent}    autoDirectorCooldown.current = true;
{indent}    setTimeout(() => {{
{indent}        if (!isMountedRef.current) return;
{indent}        startActivity(firstRevisit.activityId, firstRevisit.word);
{indent}        setRevisitQueue(prev => prev.slice(1)); // Remove from queue
{indent}        setTimeout(() => {{ autoDirectorCooldown.current = false; }}, 15000);
{indent}    }}, 2500);
{indent}}}"""
        lines[i] = revisit_code
        changes += 1
        print(f"  Activated revisit queue logic at L{i+1}")
        break
else:
    print(f"  WARNING: TODO revisit comment not found")

# Save
print(f"\n=== Writing {changes} changes ===")
with open(FILE, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print(f"Saved {FILE} ({len(lines)} lines, was {original_count})")
