"""
Extract in-JSX .filter() calls to useMemo constants.

Safe strategy:
1. For each return block with repeated filters on the same source array,
   create useMemo constants BEFORE the return statement
2. Replace the inline .filter() calls with the memoized variable

Focus on the highest-impact clusters:
- Concept Sort: items.filter(i => i.currentContainer/currentZone === x) 
- Escape Room: Object.entries(groups).filter(([_, g]) => g !== null)
- Sound Sort: soundChips.filter(c => !c.used)
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

changes = 0

# ===================================================================
# 1. CONCEPT SORT - Bucket View (return@L23065)
# items.filter(i => i.currentContainer === bucket.id) — called 2x
# items.filter(i => i.currentContainer === 'deck') — called 2x
# These are INSIDE a .map() loop (buckets.map) so they run N*M times
# ===================================================================

# These are inside a buckets.map() so we can't easily extract to useMemo
# without restructuring. Skip for now — would need a memo per bucket.

# ===================================================================
# 2. CONCEPT SORT - Venn View (return@L23330) 
# items.filter(i => i.currentZone === 'setA') — 1x
# items.filter(i => i.currentZone === 'setB') — 1x
# items.filter(i => i.currentZone === 'shared') — 1x
# items.filter(i => i.currentZone === 'bank') — 2x
# These CAN be extracted since the zones are constants
# ===================================================================

# Find the return statement for the Venn view
# We'll look for the specific pattern and insert useMemo before it
lines = content.split('\n')

# Strategy: Find pairs of identical filter expressions and create
# a shared useMemo. But since these are in sub-components with their 
# own return blocks, we need to insert the useMemo INSIDE the component.

# Better approach: Create a COMPANION useMemo script that generates
# all the useMemo lines and tells us where to insert them.
# For safety, let's do targeted string replacements.

# ===================================================================
# 3. Object.entries(groups).filter(([_, g]) => g !== null)
# This appears 4+ times in the Escape Room return block
# Extract to a single useMemo
# ===================================================================

# Find and count this exact pattern
pattern_escape_groups = 'Object.entries(groups).filter(([_, g]) => g !== null)'
count = content.count(pattern_escape_groups)
print(f"Escape Room groups pattern found: {count} times")

if count >= 2:
    # Find the enclosing component/function
    first_idx = content.index(pattern_escape_groups)
    # Find the line number
    line_num = content[:first_idx].count('\n') + 1
    print(f"  First occurrence at L{line_num}")
    
    # Find the return statement before this
    lines_before = content[:first_idx].split('\n')
    return_line = None
    for j in range(len(lines_before) - 1, max(0, len(lines_before) - 200), -1):
        if 'return (' in lines_before[j] or 'return(' in lines_before[j]:
            return_line = j + 1
            break
    
    if return_line:
        print(f"  Return statement at L{return_line}")
        # Get the indentation of the return
        return_indent = len(lines[return_line - 1]) - len(lines[return_line - 1].lstrip())
        indent = ' ' * return_indent
        
        # Insert a useMemo BEFORE the return
        memo_line = f"{indent}const activeGroups = useMemo(() => Object.entries(groups).filter(([_, g]) => g !== null), [groups]);\n"
        
        # Insert before the return line
        lines_list = content.split('\n')
        lines_list.insert(return_line - 1, memo_line.rstrip())
        content = '\n'.join(lines_list)
        
        # Replace all occurrences of the pattern with the memoized var
        content = content.replace(pattern_escape_groups + '.map', 'activeGroups.map')
        content = content.replace(pattern_escape_groups + '.length', 'activeGroups.length')
        # Keep any remaining as-is (might be in different format)
        changes += 1
        print(f"  Extracted to useMemo: activeGroups")

# ===================================================================
# 4. Object.entries(sessionData.groups).filter(([_, g]) => g !== null)  
# Similar pattern in student view
# ===================================================================
pattern_session_groups = 'Object.entries(sessionData.groups).filter(([_, g]) => g !== null)'
count2 = content.count(pattern_session_groups)
print(f"\nSession groups pattern found: {count2} times")

if count2 >= 2:
    first_idx = content.index(pattern_session_groups)
    line_num = content[:first_idx].count('\n') + 1
    print(f"  First occurrence at L{line_num}")
    
    lines_before = content[:first_idx].split('\n')
    return_line = None
    for j in range(len(lines_before) - 1, max(0, len(lines_before) - 200), -1):
        if 'return (' in lines_before[j] or 'return(' in lines_before[j]:
            return_line = j + 1
            break
    
    if return_line:
        print(f"  Return statement at L{return_line}")
        return_indent = len(content.split('\n')[return_line - 1]) - len(content.split('\n')[return_line - 1].lstrip())
        indent = ' ' * return_indent
        
        memo_line = f"{indent}const activeSessionGroups = useMemo(() => Object.entries(sessionData?.groups || {{}}).filter(([_, g]) => g !== null), [sessionData?.groups]);\n"
        
        lines_list = content.split('\n')
        lines_list.insert(return_line - 1, memo_line.rstrip())
        content = '\n'.join(lines_list)
        
        content = content.replace(pattern_session_groups + '.map', 'activeSessionGroups.map')
        content = content.replace(pattern_session_groups + '.length', 'activeSessionGroups.length')
        changes += 1
        print(f"  Extracted to useMemo: activeSessionGroups")

# ===================================================================
# 5. selectedStudent.history.filter(h => h.type === 'quiz')
# Called 2x in the student detail view
# ===================================================================
pattern_quiz_history = "selectedStudent.history.filter(h => h.type === 'quiz')"
count3 = content.count(pattern_quiz_history)
print(f"\nQuiz history pattern found: {count3} times")

if count3 >= 2:
    first_idx = content.index(pattern_quiz_history)
    line_num = content[:first_idx].count('\n') + 1
    
    lines_before = content[:first_idx].split('\n')
    return_line = None
    for j in range(len(lines_before) - 1, max(0, len(lines_before) - 200), -1):
        if 'return (' in lines_before[j] or 'return(' in lines_before[j]:
            return_line = j + 1
            break
    
    if return_line:
        return_indent = len(content.split('\n')[return_line - 1]) - len(content.split('\n')[return_line - 1].lstrip())
        indent = ' ' * return_indent
        
        memo_line = f"{indent}const quizHistory = useMemo(() => selectedStudent?.history?.filter(h => h.type === 'quiz') || [], [selectedStudent?.history]);"
        
        lines_list = content.split('\n')
        lines_list.insert(return_line - 1, memo_line)
        content = '\n'.join(lines_list)
        
        content = content.replace(pattern_quiz_history, 'quizHistory')
        changes += 1
        print(f"  Extracted to useMemo: quizHistory")

# ===================================================================
# 6. Object.values(escapeState.teams || {}).filter(t => t === team)
# Called 2x in escape room team selection
# ===================================================================
pattern_team_filter = "Object.values(escapeState.teams || {}).filter(t => t === team)"
count4 = content.count(pattern_team_filter)
print(f"\nTeam filter pattern found: {count4} times")

# This one is tricky because 'team' changes per iteration — skip

# ===================================================================
# 7. Object.entries(sessionData.roster) patterns
# ===================================================================
pattern_roster = "Object.entries(sessionData.roster)"
count5 = content.count(pattern_roster)
print(f"\nRoster entries pattern found: {count5} times")
# These have different .filter/.map chains, harder to extract

# ===================================================================
# 8. WORD_FAMILY_PRESETS / SIGHT_WORD_PRESETS keys
# Object.keys(WORD_FAMILY_PRESETS) and Object.keys(SIGHT_WORD_PRESETS)
# These operate on CONSTANTS, so useMemo with [] deps is ideal
# ===================================================================
for const_name in ['WORD_FAMILY_PRESETS', 'SIGHT_WORD_PRESETS', 'PHONEME_BANK', 'FLUENCY_BENCHMARKS']:
    for op in ['Object.keys', 'Object.entries', 'Object.values']:
        pattern = f'{op}({const_name})'
        count = content.count(pattern)
        if count >= 1:
            print(f"\n{pattern} found: {count} times")
            # These operate on constants — could use a top-level const
            # But useMemo with [] is safer since they're inside components

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal useMemo extractions: {changes}")
print("DONE")
