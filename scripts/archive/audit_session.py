"""
Audit: Session goal + spelling toggle interaction
Output all relevant references to a file to avoid terminal truncation
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

out = []

# 1. Session goal state and setter
out.append("=" * 60)
out.append("1. wordSoundsSessionGoal STATE DECLARATIONS")
out.append("=" * 60)
for i, line in enumerate(lines):
    if 'wordSoundsSessionGoal' in line and ('useState' in line or 'const ' in line):
        out.append(f"L{i+1}: {line.strip()[:200]}")

# 2. Include spelling / orthographic state
out.append("")
out.append("=" * 60)
out.append("2. includeSpelling / includeOrthographic STATE")
out.append("=" * 60)
for i, line in enumerate(lines):
    if ('includeSpelling' in line or 'includeOrthographic' in line or 'include_spelling' in line):
        l = line.strip()
        if len(l) < 250:
            out.append(f"L{i+1}: {l[:200]}")

# 3. Session slider UI
out.append("")
out.append("=" * 60)
out.append("3. SESSION SLIDER / ITEMS PER SESSION UI")
out.append("=" * 60)
for i, line in enumerate(lines):
    if 'ws_gen_session' in line or 'session_slider' in line or ('Items' in line and 'Session' in line):
        l = line.strip()
        if len(l) < 250:
            out.append(f"L{i+1}: {l[:200]}")

# 4. Session goal USAGE (comparisons, conditionals)
out.append("")
out.append("=" * 60)
out.append("4. SESSION GOAL USAGE (comparisons)")
out.append("=" * 60)
for i, line in enumerate(lines):
    if 'wordSoundsSessionGoal' in line:
        l = line.strip()
        if any(op in l for op in ['>=', '<=', '>', '<', '===', '!==']):
            out.append(f"L{i+1}: {l[:200]}")

# 5. Adaptive director: ortho transition logic
out.append("")
out.append("=" * 60)
out.append("5. ADAPTIVE DIRECTOR TRANSITIONS (phono->ortho)")
out.append("=" * 60)
for i, line in enumerate(lines):
    l = line.strip()
    if ('orthograph' in l.lower() or 'spelling' in l.lower()) and ('transition' in l.lower() or 'gate' in l.lower() or 'advance' in l.lower() or 'director' in l.lower()):
        if len(l) < 250:
            out.append(f"L{i+1}: {l[:200]}")

# 6. All wordSoundsSessionGoal references (compact)
out.append("")
out.append("=" * 60)
out.append("6. ALL wordSoundsSessionGoal REFERENCES")
out.append("=" * 60)
for i, line in enumerate(lines):
    if 'wordSoundsSessionGoal' in line:
        l = line.strip()
        if len(l) < 250:
            out.append(f"L{i+1}: {l[:200]}")

# 7. Advanced lesson plan settings for word sounds
out.append("")
out.append("=" * 60)
out.append("7. LESSON PLAN / ADVANCED SETTINGS for Word Sounds")
out.append("=" * 60)
for i, line in enumerate(lines):
    l = line.strip()
    if ('lesson' in l.lower() and 'word' in l.lower() and 'sound' in l.lower()) or ('advanced' in l.lower() and ('setting' in l.lower() or 'config' in l.lower()) and 'word' in l.lower()):
        if len(l) < 250 and len(l) > 10:
            out.append(f"L{i+1}: {l[:200]}")

# 8. Session completion/progress tracking
out.append("")
out.append("=" * 60)
out.append("8. SESSION COMPLETION LOGIC (score/progress)")
out.append("=" * 60)
for i, line in enumerate(lines):
    if 'correctCount' in line or 'totalAttempts' in line or 'sessionComplete' in line:
        l = line.strip()
        if ('wordSounds' in l or 'session' in l.lower()) and len(l) < 250:
            out.append(f"L{i+1}: {l[:200]}")

with open('_session_audit.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print(f"Audit saved to _session_audit.txt ({len(out)} lines)")
