"""
Medium-Risk Word Sounds Remediation Script
===========================================
Applies all 4 approved fixes to AlloFlowANTI.txt:
1. Remove duplicate wordSoundsSessionGoal at L32320
2. Remove inline PHONEME_STORAGE_KEY redeclaration at L6304
3. Add optional chaining for unsafe property accesses
4. Add fallback guards for high-risk unguarded .map() calls
"""
import re
import sys

FILEPATH = 'AlloFlowANTI.txt'

def read_file():
    with open(FILEPATH, 'r', encoding='utf-8-sig') as f:
        return f.readlines()

def write_file(lines):
    with open(FILEPATH, 'w', encoding='utf-8-sig', newline='') as f:
        f.writelines(lines)

def fix_session_goal_duplicate(lines):
    """Fix 1: Remove duplicate wordSoundsSessionGoal useState at L32320."""
    fixes = 0
    target = "const [wordSoundsSessionGoal, setWordSoundsSessionGoal] = useState(10);"
    
    for i, line in enumerate(lines):
        if target in line.strip():
            # Confirm this is the duplicate (not the primary at ~L1300)
            if i > 30000:  # The duplicate is around L32320
                print(f"  FIX 1a: Removing duplicate wordSoundsSessionGoal at L{i+1}")
                print(f"    WAS: {line.rstrip()[:120]}")
                # Comment it out rather than delete to preserve line numbering for other fixes
                lines[i] = line.replace(target, 
                    "// REMOVED: Duplicate wordSoundsSessionGoal - primary is at L1300 with default 30")
                fixes += 1
    
    return fixes

def fix_phoneme_storage_key_duplicate(lines):
    """Fix 2: Remove inline PHONEME_STORAGE_KEY redeclaration at L6304."""
    fixes = 0
    target = "const PHONEME_STORAGE_KEY = 'allo_phoneme_bank_v1';"
    
    for i, line in enumerate(lines):
        if target in line.strip() and i > 5000:  # Skip the primary at ~L841
            print(f"  FIX 2: Removing inline PHONEME_STORAGE_KEY at L{i+1}")
            print(f"    WAS: {line.rstrip()[:120]}")
            # Replace with a comment - the global constant at L841 is visible here
            indent = len(line) - len(line.lstrip())
            lines[i] = ' ' * indent + "// Uses global PHONEME_STORAGE_KEY from L841\n"
            fixes += 1
    
    return fixes

def fix_unsafe_property_access(lines):
    """Fix 3: Add optional chaining for unsafe property accesses."""
    fixes = 0
    
    # Fix 3a: L6914 - isolationState.isoOptions.length in for loop
    # Fix 3b: L7422 - same pattern
    for i, line in enumerate(lines):
        # Match: for (let i = 0; i < isolationState.isoOptions.length; i++)
        if 'isolationState.isoOptions.length' in line and 'for' in line:
            old = 'isolationState.isoOptions.length'
            new = '(isolationState?.isoOptions?.length || 0)'
            if old in line:
                print(f"  FIX 3a: Adding optional chaining at L{i+1}")
                lines[i] = line.replace(old, new)
                fixes += 1
    
    # Fix 3c: L10883 - selectedStudent.data.personaState.chatHistory.map(...)
    for i, line in enumerate(lines):
        if 'selectedStudent.data.personaState.chatHistory.map(' in line:
            old = 'selectedStudent.data.personaState.chatHistory.map('
            new = '(selectedStudent?.data?.personaState?.chatHistory || []).map('
            # Also need to handle the closing - replace the {prefix pattern
            old_full = '{selectedStudent.data.personaState.chatHistory.map('
            new_full = '{(selectedStudent?.data?.personaState?.chatHistory || []).map('
            if old_full in line:
                print(f"  FIX 3b: Adding deep chain guard at L{i+1}")
                lines[i] = line.replace(old_full, new_full)
                fixes += 1
            elif old in line:
                print(f"  FIX 3b: Adding deep chain guard at L{i+1}")
                lines[i] = line.replace(old, new)
                fixes += 1
    
    return fixes

def fix_unguarded_maps(lines):
    """Fix 4: Add fallback guards for high-risk unguarded .map() calls."""
    fixes = 0
    
    # Target patterns and their replacements
    # Each entry: (search_string, replacement_string, min_line, max_line, description)
    targets = [
        # L2489: preloadedWords.map(...)  -> render block
        ('{preloadedWords.map(', '{(preloadedWords || []).map(', 
         2400, 2600, 'preloadedWords render guard'),
        
        # L4198: foundWords.map(...)  -> render block
        ('{foundWords.map(', '{(foundWords || []).map(',
         4100, 4300, 'foundWords render guard'),
        
        # L4225: wordBank.map(...)  -> render block
        ('{wordBank.map(', '{(wordBank || []).map(',
         4100, 4300, 'wordBank render guard'),
        
        # L6841: isoDistractors.map(...)  -> in logic
        ('isoDistractors.map(', '(isoDistractors || []).map(',
         6800, 6900, 'isoDistractors logic guard'),
        
        # L9069: blendingOptions.map(...)  -> render block
        ('{blendingOptions.map(', '{(blendingOptions || []).map(',
         9000, 9200, 'blendingOptions render guard'),
        
        # L10860: selectedStudent.safetyFlags.map(...)
        ('{selectedStudent.safetyFlags.map(', '{(selectedStudent?.safetyFlags || []).map(',
         10800, 10900, 'selectedStudent.safetyFlags guard'),
    ]
    
    for search, replace, line_min, line_max, desc in targets:
        found = False
        for i in range(line_min - 1, min(line_max, len(lines))):
            if search in lines[i]:
                print(f"  FIX 4: {desc} at L{i+1}")
                lines[i] = lines[i].replace(search, replace, 1)
                fixes += 1
                found = True
                break
        if not found:
            # Search wider range as line numbers may have shifted
            for i, line in enumerate(lines):
                if search in line:
                    print(f"  FIX 4: {desc} at L{i+1} (shifted from expected range)")
                    lines[i] = line.replace(search, replace, 1)
                    fixes += 1
                    found = True
                    break
            if not found:
                print(f"  SKIP: Could not find target for '{desc}' - may have been already fixed")
    
    return fixes

def main():
    print("=" * 60)
    print("MEDIUM-RISK REMEDIATION SCRIPT")
    print("=" * 60)
    
    print("\nReading file...")
    lines = read_file()
    total_lines = len(lines)
    print(f"Loaded {total_lines} lines\n")
    
    total_fixes = 0
    
    print("--- Fix 1: wordSoundsSessionGoal Duplicate ---")
    total_fixes += fix_session_goal_duplicate(lines)
    
    print("\n--- Fix 2: PHONEME_STORAGE_KEY Duplicate ---")
    total_fixes += fix_phoneme_storage_key_duplicate(lines)
    
    print("\n--- Fix 3: Unsafe Property Access ---")
    total_fixes += fix_unsafe_property_access(lines)
    
    print("\n--- Fix 4: Unguarded .map() Guards ---")
    total_fixes += fix_unguarded_maps(lines)
    
    print(f"\n{'=' * 60}")
    print(f"TOTAL FIXES APPLIED: {total_fixes}")
    print(f"{'=' * 60}")
    
    if total_fixes > 0:
        print("\nWriting file...")
        write_file(lines)
        
        # Verify line count preserved
        with open(FILEPATH, 'r', encoding='utf-8-sig') as f:
            new_lines = f.readlines()
        print(f"Line count: {total_lines} -> {len(new_lines)}")
        if len(new_lines) == total_lines:
            print("[OK] Line count preserved!")
        else:
            print(f"[WARN] Line count changed by {len(new_lines) - total_lines}")
        
        print("\n[OK] All fixes applied successfully!")
    else:
        print("\nNo fixes were applied.")

if __name__ == '__main__':
    main()
