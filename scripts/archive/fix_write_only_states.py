"""
Write-Only State Fixes:
1. Make pulseScale functional — inject into AlloBot transform
2. Make studyDuration functional — add progress bar to study timer
3. Delete dead state: blueprintSelection, isReviewingBlueprint, isDefining, isRevising, sourceStandards
   (awardedPoints kept for now, pending XP audit)
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

changes = 0

# ==================================================================
# 1. MAKE pulseScale FUNCTIONAL
# Inject pulseScale into AlloBot's transform property
# Current: scale(${isSquashed ? '1.1, 0.9' : '1'})
# New:     scale(${isSquashed ? '1.1, 0.9' : String(pulseScale)})
# ==================================================================
old_transform = "scale(${isSquashed ? '1.1, 0.9' : '1'})"
new_transform = "scale(${isSquashed ? '1.1, 0.9' : String(pulseScale)})"
if old_transform in content:
    content = content.replace(old_transform, new_transform, 1)
    changes += 1
    print("[1] Made pulseScale functional — AlloBot now breathes!")

# ==================================================================
# 2. MAKE studyDuration FUNCTIONAL — Add progress bar
# Insert after the timer display div (after the line with formatTime)
# ==================================================================
old_timer = """                <div className="text-center mb-6 relative">
                    <div className="text-5xl font-black text-slate-700 font-mono tracking-wider">
                        {formatTime(studyTimeLeft)}
                    </div>
                </div>"""

new_timer = """                <div className="text-center mb-6 relative">
                    <div className="text-5xl font-black text-slate-700 font-mono tracking-wider">
                        {formatTime(studyTimeLeft)}
                    </div>
                    {studyDuration > 0 && (
                        <div className="mt-3 mx-auto max-w-[200px]">
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-linear"
                                    style={{ width: `${Math.max(0, Math.min(100, ((studyDuration - studyTimeLeft) / studyDuration) * 100))}%` }}
                                />
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 font-medium">
                                {Math.round(((studyDuration - studyTimeLeft) / studyDuration) * 100)}% complete
                            </div>
                        </div>
                    )}
                </div>"""

if old_timer in content:
    content = content.replace(old_timer, new_timer, 1)
    changes += 1
    print("[2] Made studyDuration functional — added progress bar!")
else:
    print("[2] WARNING: Could not find timer display block — trying flexible match")
    # Try a more flexible match
    if '{formatTime(studyTimeLeft)}' in content:
        # Find the closing </div> after formatTime
        idx = content.index('{formatTime(studyTimeLeft)}')
        # Find the next </div>\n after it, then the next one (closing the wrapper)
        first_close = content.index('</div>', idx)
        second_close = content.index('</div>', first_close + 6)
        # Insert progress bar before the second closing </div>
        insert_point = second_close
        progress_bar = """
                    {studyDuration > 0 && (
                        <div className="mt-3 mx-auto max-w-[200px]">
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-linear"
                                    style={{ width: `${Math.max(0, Math.min(100, ((studyDuration - studyTimeLeft) / studyDuration) * 100))}%` }}
                                />
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 font-medium">
                                {Math.round(((studyDuration - studyTimeLeft) / studyDuration) * 100)}% complete
                            </div>
                        </div>
                    )}
"""
        content = content[:insert_point] + progress_bar + content[insert_point:]
        changes += 1
        print("[2] Made studyDuration functional — added progress bar (flexible match)!")

# ==================================================================
# 3. DELETE dead state variables and their setter calls
# Strategy: Remove declaration lines and all setter call lines
# ==================================================================

def delete_state_and_setters(content, getter, setter, changes):
    """Remove useState declaration and all setter calls"""
    lines = content.split('\n')
    new_lines = []
    removed = 0
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        # Remove the declaration: const [getter, setter] = useState(...)
        if f'const [{getter}, {setter}]' in line and 'useState' in line:
            removed += 1
            continue
        
        # Remove standalone setter calls: setter(...)  (entire line is just the setter)
        # But be careful not to remove lines where setter is part of a larger expression
        if setter in stripped:
            # Check if this line is JUST a setter call (possibly with leading whitespace and trailing semicolon)
            setter_only_pattern = re.compile(r'^\s*' + re.escape(setter) + r'\s*\(.*\)\s*;?\s*$')
            if setter_only_pattern.match(line):
                removed += 1
                continue
        
        new_lines.append(line)
    
    if removed > 0:
        print(f"  [{getter}] Removed {removed} lines (1 declaration + {removed-1} setter calls)")
        changes += removed
    else:
        print(f"  [{getter}] WARNING: No lines removed")
    
    return '\n'.join(new_lines), changes

# Delete these 5 state variables
deletions = [
    ('blueprintSelection', 'setBlueprintSelection'),
    ('isReviewingBlueprint', 'setIsReviewingBlueprint'),
    ('isDefining', 'setIsDefining'),
    ('isRevising', 'setIsRevising'),
    ('sourceStandards', 'setSourceStandards'),
]

print("\n[3] Deleting dead state variables:")
for getter, setter in deletions:
    content, changes = delete_state_and_setters(content, getter, setter, changes)

# Save
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal changes: {changes}")
print("DONE")
