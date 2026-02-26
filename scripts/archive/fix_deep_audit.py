"""
Deep Audit Fixes — Pass 2
Remove 5 safe write-only state vars and their associated setters/useEffects:
1. pulseScale — set every 2s via interval but never rendered (perf waste)
2. awardedPoints — only reset to 0, never read
3. sourceStandards — set once but never read 
4. isDefining — flag set/unset but never queried
5. isRevising — flag set/unset but never queried (NOTE: isRevisingTimeline is a DIFFERENT var, leave it)
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

changes = 0

# ============================================================
# 1. Remove pulseScale state + its useEffect (L17577-17584)
# ============================================================
new_lines = []
skip_until = -1
for i, line in enumerate(lines):
    if i < skip_until:
        continue
    
    # Remove the pulseScale state declaration
    if 'const [pulseScale, setPulseScale] = useState' in line:
        print(f"[1a] Removed pulseScale state at L{i+1}")
        changes += 1
        continue
    
    # Remove the pulseScale useEffect block (comment + useEffect + interval + clear + close)
    if '// ANIMATION ENHANCEMENT: Subtle breathing/pulsing' in line:
        # Skip this line and the next 5 lines (the useEffect block)
        skip_count = 0
        for j in range(i, min(len(lines), i + 8)):
            skip_count += 1
            if lines[j].strip() == '}, []);':
                break
        if skip_count <= 8:
            skip_until = i + skip_count
            print(f"[1b] Removed pulseScale useEffect block ({skip_count} lines at L{i+1})")
            changes += 1
            continue
    
    new_lines.append(line)

lines = new_lines

# ============================================================
# 2. Remove awardedPoints state + its setter calls
# ============================================================
new_lines = []
for i, line in enumerate(lines):
    if 'const [awardedPoints, setAwardedPoints] = useState' in line:
        print(f"[2a] Removed awardedPoints state at L{i+1}")
        changes += 1
        continue
    if 'setAwardedPoints(' in line:
        # Check if this is a standalone line
        if line.strip().startswith('setAwardedPoints('):
            print(f"[2b] Removed setAwardedPoints call at L{i+1}")
            changes += 1
            continue
    new_lines.append(line)
lines = new_lines

# ============================================================
# 3. Remove sourceStandards state + its setter calls  
# ============================================================
new_lines = []
for i, line in enumerate(lines):
    if 'const [sourceStandards, setSourceStandards] = useState' in line:
        print(f"[3a] Removed sourceStandards state at L{i+1}")
        changes += 1
        continue
    if 'setSourceStandards(' in line:
        if line.strip().startswith('setSourceStandards('):
            print(f"[3b] Removed setSourceStandards call at L{i+1}")
            changes += 1
            continue
    new_lines.append(line)
lines = new_lines

# ============================================================
# 4. Remove isDefining state + its setter calls
# The state at ~L31297 is `const [isDefining, setIsDefining] = useState(false);`
# Be careful: isDefining only, not isReviewingTimeline etc.
# ============================================================
new_lines = []
for i, line in enumerate(lines):
    if 'const [isDefining, setIsDefining] = useState' in line:
        print(f"[4a] Removed isDefining state at L{i+1}")
        changes += 1
        continue
    if 'setIsDefining(' in line:
        if line.strip().startswith('setIsDefining('):
            print(f"[4b] Removed setIsDefining call at L{i+1}")
            changes += 1
            continue
    new_lines.append(line)
lines = new_lines

# ============================================================
# 5. Remove isRevising state + its setter calls
# IMPORTANT: Only remove `const [isRevising, setIsRevising]` NOT isRevisingTimeline
# ============================================================
new_lines = []
for i, line in enumerate(lines):
    if 'const [isRevising, setIsRevising] = useState' in line:
        # Make sure it's not isRevisingTimeline
        if 'isRevisingTimeline' not in line:
            print(f"[5a] Removed isRevising state at L{i+1}")
            changes += 1
            continue
    if 'setIsRevising(' in line:
        # Make sure it's exactly setIsRevising, not setIsRevisingTimeline
        if 'setIsRevisingTimeline' not in line and line.strip().startswith('setIsRevising('):
            print(f"[5b] Removed setIsRevising call at L{i+1}")
            changes += 1
            continue
    new_lines.append(line)
lines = new_lines

# Save
with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"\nTotal changes: {changes}")
print("DONE")
