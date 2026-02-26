"""Fix remaining: Word Sounds TDZ + Streaks teacher gate using line-based approach"""

# ===== FIX 2: Word Sounds showReviewPanel TDZ =====
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_sounds_module.js"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

ws_changes = 0
for i, line in enumerate(lines):
    # Find the dependency array that references showReviewPanel before it's declared
    if 'wordSoundsActivity, showReviewPanel]' in line:
        old = line
        line = line.replace('wordSoundsActivity, showReviewPanel]', 'wordSoundsActivity]')
        if line != old:
            lines[i] = line
            ws_changes += 1
            print(f'Fix 2: Removed showReviewPanel from deps at L{i+1}')

if ws_changes > 0:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
else:
    # Maybe it's in the minified line - check the content more carefully
    with open(FILE, 'r', encoding='utf-8') as f:
        c = f.read()
    if 'wordSoundsActivity, showReviewPanel]' in c:
        c = c.replace('wordSoundsActivity, showReviewPanel]', 'wordSoundsActivity]')
        with open(FILE, 'w', encoding='utf-8') as f:
            f.write(c)
        print('Fix 2b: Removed showReviewPanel from deps (content match)')
    else:
        print('Fix 2 SKIPPED: pattern not found')

# ===== FIX 3: Streaks gate behind !isTeacherMode =====
FILE2 = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE2, 'r', encoding='utf-8') as f:
    c2 = f.read()

# The line is: {(wordSoundsScore?.streak > 0 || (() => {
# Need to add !isTeacherMode && before the (
OLD = "{(wordSoundsScore?.streak > 0 || (() => {"
NEW = "{!isTeacherMode && (wordSoundsScore?.streak > 0 || (() => {"

if OLD in c2:
    c2 = c2.replace(OLD, NEW)
    with open(FILE2, 'w', encoding='utf-8') as f:
        f.write(c2)
    print('Fix 3: Gated streaks behind !isTeacherMode')
else:
    print('Fix 3 SKIPPED: pattern not found')
