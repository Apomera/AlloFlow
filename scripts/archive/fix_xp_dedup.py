"""
XP System Fixes:
1. Word Search Find (L38795): Add generatedContent?.id
2. Panel Debate Insight (L47924): Add generatedContent?.id  
3. Rapport Building (L48122): Add generatedContent?.id
4. Delete awardedPoints state (crossword) — redundant with dedup system
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

changes = 0

# 1. Fix Word Search: null → generatedContent?.id
old_ws = 'handleScoreUpdate(5, "Word Search Find", null);'
new_ws = 'handleScoreUpdate(5, "Word Search Find", generatedContent?.id);'
if old_ws in content:
    content = content.replace(old_ws, new_ws, 1)
    changes += 1
    print("[1] Fixed Word Search XP — now deduped via generatedContent.id")

# 2. Fix Panel Debate: add missing third argument
old_pd = 'handleScoreUpdate(xpEarned, "Panel Debate Insight");'
new_pd = 'handleScoreUpdate(xpEarned, "Panel Debate Insight", generatedContent?.id);'
if old_pd in content:
    content = content.replace(old_pd, new_pd, 1)
    changes += 1
    print("[2] Fixed Panel Debate XP — now deduped via generatedContent.id")

# 3. Fix Rapport Building: null → generatedContent?.id
old_rb = 'handleScoreUpdate(actualReward, "Rapport Building", null);'
new_rb = 'handleScoreUpdate(actualReward, "Rapport Building", generatedContent?.id);'
if old_rb in content:
    content = content.replace(old_rb, new_rb, 1)
    changes += 1
    print("[3] Fixed Rapport Building XP — now deduped via generatedContent.id")

# 4. Delete awardedPoints state and its setter
lines = content.split('\n')
new_lines = []
removed = 0
for line in lines:
    stripped = line.strip()
    # Remove declaration
    if 'const [awardedPoints, setAwardedPoints]' in line and 'useState' in line:
        removed += 1
        continue
    # Remove setter calls
    if re.match(r'^\s*setAwardedPoints\s*\(.*\)\s*;?\s*$', line):
        removed += 1
        continue
    new_lines.append(line)

if removed > 0:
    content = '\n'.join(new_lines)
    changes += removed
    print(f"[4] Deleted awardedPoints — removed {removed} lines")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal changes: {changes}")
print("DONE")
