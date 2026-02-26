"""
Wire Escape Room XP through handleScoreUpdate for:
1. Per-puzzle XP with deduplication via puzzleId
2. Room-completion bonus (50 XP) when all puzzles solved
3. Multiplayer: each student's XP goes through handleScoreUpdate
   (the function is per-client, so each student calling handlePuzzleSolved
    already runs their own handleScoreUpdate — we just need to route it properly)

The sophisticated XP calculation (streak, difficulty, time, hints) is preserved.
We just replace the final `setGlobalPoints` call with `handleScoreUpdate`.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

changes = 0

# ===================================================================
# Fix 1: Replace setGlobalPoints with handleScoreUpdate in handlePuzzleSolved
# ===================================================================
# The line is:
#   setGlobalPoints(prev => prev + puzzleXP);
# Inside handlePuzzleSolved, after the XP calculation
# Replace with:
#   handleScoreUpdate(puzzleXP, "Escape Room Puzzle", puzzleId);

old_pattern = "    setGlobalPoints(prev => prev + puzzleXP);\n    setEscapeRoomState(prev => ({"
new_pattern = "    handleScoreUpdate(puzzleXP, \"Escape Room Puzzle\", puzzleId);\n    setEscapeRoomState(prev => ({"

if old_pattern in content:
    content = content.replace(old_pattern, new_pattern)
    changes += 1
    print("  FIX 1: Routed puzzle XP through handleScoreUpdate with puzzleId dedup")
else:
    print("  FIX 1: Pattern not found — trying alternative")
    # Try a more flexible match
    old_alt = "setGlobalPoints(prev => prev + puzzleXP);"
    if old_alt in content:
        content = content.replace(old_alt, 'handleScoreUpdate(puzzleXP, "Escape Room Puzzle", puzzleId);', 1)
        changes += 1
        print("  FIX 1: Used alternative pattern — replaced setGlobalPoints with handleScoreUpdate")

# ===================================================================
# Fix 2: Add room-completion bonus when all puzzles solved
# ===================================================================
# After the shouldUnlockDoor check (when 4 of 5 puzzles solved) and
# the final door toast, add a completion bonus

# Find the final door toast area
door_toast = "addToast(t('escape_room.final_door_ready'), 'info');"
if door_toast in content:
    completion_bonus = door_toast + """
      }
      // Room completion bonus: Check if ALL puzzles now solved
      if (newSolved.size >= escapeRoomState.puzzles.length) {
        const completionBonus = escapeRoomState.difficulty === 'hard' ? 75 : 
                                escapeRoomState.difficulty === 'easy' ? 25 : 50;
        handleScoreUpdate(completionBonus, "Escape Room Complete", `escape-room-complete-${escapeRoomState.theme || 'default'}`);
        addToast(`🏆 ${t('escape_room.all_solved_bonus', { xp: completionBonus })}`, 'success');"""
    
    # We need to be careful — the original has the closing braces after the toast
    # Let's find the exact block
    lines = content.split('\n')
    idx = content.index(door_toast)
    line_num = content[:idx].count('\n')
    
    # Check the next few lines to understand the structure
    print(f"  Door toast at L{line_num + 1}")
    for j in range(line_num, min(line_num + 5, len(lines))):
        print(f"    L{j+1}: {lines[j].strip()}")
    
    # The structure is:
    #   if (shouldUnlockDoor) {
    #     setTimeout(() => {
    #       addToast(t('escape_room.final_door_ready'), 'info');
    #     }, 1500);
    #   }
    # We add the completion bonus AFTER this if block
    
    # Find the closing of the shouldUnlockDoor block
    close_marker = "    }\n  };"  # End of the if + end of handlePuzzleSolved
    
    # Actually, let's find the marker more safely. Insert BEFORE the function closing };
    # The function ends with "};" - find it
    fn_end_pattern = "    }\n  };\n"
    # Search after the door toast
    search_start = content.index(door_toast)
    fn_end_idx = content.index("  };\n", search_start)
    
    # Insert completion bonus before the final };
    completion_code = """    // Room completion bonus when ALL puzzles solved
    if (newSolved.size >= escapeRoomState.puzzles.length) {
      const completionBonus = escapeRoomState.difficulty === 'hard' ? 75 : 
                              escapeRoomState.difficulty === 'easy' ? 25 : 50;
      handleScoreUpdate(completionBonus, "Escape Room Complete", `escape-room-complete-${escapeRoomState.theme || 'default'}`);
      addToast(`🏆 ${t('escape_room.all_solved_bonus', { xp: completionBonus })}`, 'success');
    }
"""
    content = content[:fn_end_idx] + completion_code + content[fn_end_idx:]
    changes += 1
    print("  FIX 2: Added room-completion bonus (25/50/75 XP by difficulty)")
else:
    print("  FIX 2: Door toast pattern not found")

# ===================================================================
# Fix 3: Add localization keys for the new toast messages
# ===================================================================
# We need 'escape_room.all_solved_bonus' in the localization
# Find the escape_room localization block
loc_marker = "escape_room_xp_earned:"
if loc_marker in content:
    # Insert after this key
    insert_after = content.index(loc_marker)
    line_after = content[:insert_after].count('\n')
    print(f"  Escape room XP loc key at L{line_after + 1}")
    
# Let's check what keys already exist
lines = content.split('\n')
for i, l in enumerate(lines):
    if 'all_solved' in l and 'escape' in l.lower():
        print(f"  Existing all_solved key at L{i+1}: {l.strip()[:80]}")

# Check if the key already exists
if 'all_solved_bonus' in content:
    print("  FIX 3: Localization key already exists")
else:
    # Find escape_room localization section to add the key
    # Look for escape_room: { or escape_room.
    esc_loc_lines = [(i, l) for i, l in enumerate(lines) if 'escape_room' in l and ('xp_earned' in l or 'correct' in l)]
    if esc_loc_lines:
        # Add after the first XP-related key
        target_line = esc_loc_lines[0][0]
        indent = '      '
        # Find the right place
        for i, l in esc_loc_lines:
            if 'xp_earned' in l and ':' in l:
                target_line = i
                indent = l[:len(l) - len(l.lstrip())]
                break
        
        # Add below target_line
        new_key = f"{indent}all_solved_bonus: \"Room Escape Complete! +{{xp}} XP Bonus!\","
        lines.insert(target_line + 1, new_key)
        content = '\n'.join(lines)
        changes += 1
        print(f"  FIX 3: Added localization key at L{target_line + 2}")
    else:
        print("  FIX 3: Could not find escape_room localization section")

# Write
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal changes: {changes}")
print("DONE")
