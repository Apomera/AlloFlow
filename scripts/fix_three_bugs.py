"""
Fix 3 bugs:
1. StemLab: missing comma after })() at L4405 before new tools
2. Word Sounds: showReviewPanel TDZ - move useEffect after const declaration
3. Streaks: gate behind !isTeacherMode
"""

# ===== FIX 1: StemLab syntax error =====
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\stem_lab_module.js"
with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()

# The issue: })() followed by new tool code without comma
# Find "})() " followed by "// ═══" (Solar System comment)
OLD_DECOMP_END = "})()\r\n\r\n// ═══════════════════════════════════════════════════════\r\n// SOLAR SYSTEM EXPLORER"
NEW_DECOMP_END = "})(),\r\n\r\n// ═══════════════════════════════════════════════════════\r\n// SOLAR SYSTEM EXPLORER"

if OLD_DECOMP_END in c:
    c = c.replace(OLD_DECOMP_END, NEW_DECOMP_END)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(c)
    print('Fix 1: Added comma after decomposer })() in StemLab')
else:
    # Try \n instead of \r\n
    OLD2 = "})()\n\n// ═══════════════════════════════════════════════════════\n// SOLAR SYSTEM EXPLORER"
    NEW2 = "})(),\n\n// ═══════════════════════════════════════════════════════\n// SOLAR SYSTEM EXPLORER"
    if OLD2 in c:
        c = c.replace(OLD2, NEW2)
        with open(FILE, 'w', encoding='utf-8') as f:
            f.write(c)
        print('Fix 1b: Added comma (\\n variant)')
    else:
        # Direct approach - find })() right before the SOLAR SYSTEM comment
        idx = c.find('// SOLAR SYSTEM EXPLORER')
        if idx > 0:
            # Look backwards for })()
            before = c[max(0, idx-50):idx]
            close_idx = before.rfind('})()')
            if close_idx >= 0:
                abs_idx = max(0, idx-50) + close_idx
                # Check if already has comma
                after_close = c[abs_idx+4:abs_idx+5]
                if after_close != ',':
                    c = c[:abs_idx+4] + ',' + c[abs_idx+4:]
                    with open(FILE, 'w', encoding='utf-8') as f:
                        f.write(c)
                    print('Fix 1c: Inserted comma at char', abs_idx+4)
                else:
                    print('Fix 1: Already has comma')
            else:
                print('Fix 1 FAIL: })() not found before SOLAR SYSTEM')
        else:
            print('Fix 1 FAIL: SOLAR SYSTEM comment not found')

# Also check that every new tool block has proper commas between them
# The last tool (probability) should end with })(), before the module closing
with open(FILE, 'r', encoding='utf-8') as f:
    c2 = f.read()
# Find all tool block boundary issues
import re
# Check all })() that should be })(),
for tool_name in ['WATER CYCLE', 'ROCK CYCLE', 'ECOSYSTEM SIMULATOR', 'FRACTION VISUALIZER', 'UNIT CONVERTER', 'PROBABILITY LAB']:
    anchor = '// ' + tool_name
    idx = c2.find(anchor)
    if idx > 0:
        before = c2[max(0,idx-30):idx]
        if '})()' in before and '})(),' not in before:
            # Need to add comma
            close_idx = before.rfind('})()')
            abs_idx = max(0,idx-30) + close_idx
            c2 = c2[:abs_idx+4] + ',' + c2[abs_idx+4:]
            print(f'Fix 1+: Added comma before {tool_name}')

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(c2)

# ===== FIX 2: Word Sounds showReviewPanel TDZ =====
FILE2 = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_sounds_module.js"
with open(FILE2, 'r', encoding='utf-8') as f:
    wc = f.read()

# The issue: useEffect at L18 uses showReviewPanel in deps, but const showReviewPanel is declared later on L73
# Fix: In the useEffect dependency array, replace showReviewPanel with a ref check
# The useEffect currently is:
# }, [wordSoundsActivity, showReviewPanel]);
# Change to: }, [wordSoundsActivity]);
# And add the showReviewPanel check inside the effect body instead

OLD_DEP = "}, [wordSoundsActivity, showReviewPanel]); const audioCache"
NEW_DEP = "}, [wordSoundsActivity]); const audioCache"

if OLD_DEP in wc:
    wc = wc.replace(OLD_DEP, NEW_DEP)
    with open(FILE2, 'w', encoding='utf-8') as f:
        f.write(wc)
    print('Fix 2: Removed showReviewPanel from useEffect deps (TDZ fix)')
else:
    print('Fix 2 FAIL: old dep pattern not found')

# ===== FIX 3: Streaks in teacher mode =====
FILE3 = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE3, 'r', encoding='utf-8') as f:
    ac = f.read()

# The streak UI starts at L20456 with:
# {(wordSoundsScore?.streak > 0 || (() => {
# Wrap this with !isTeacherMode &&
OLD_STREAK = "{(wordSoundsScore?.streak > 0 || (() => {\r\n                        const days = new Set();\r\n                        pointHistory.forEach(e => { if (e.timestamp) days.add(new Date(e.timestamp).toDateString()); });\r\n                        const dayList = Array.from(days).sort((a, b) => new Date(b) - new Date(a));\r\n                        let dayStreak = 0;\r\n                        const today = new Date();\r\n                        for (let i = 0; i < dayList.length; i++) {\r\n                            const expected = new Date(today);\r\n                            expected.setDate(today.getDate() - i);\r\n                            if (dayList[i] === expected.toDateString()) dayStreak++;\r\n                            else break;\r\n                        }\r\n                        return dayStreak >= 2;\r\n                    })()) && ("

NEW_STREAK = "{!isTeacherMode && (wordSoundsScore?.streak > 0 || (() => {\r\n                        const days = new Set();\r\n                        pointHistory.forEach(e => { if (e.timestamp) days.add(new Date(e.timestamp).toDateString()); });\r\n                        const dayList = Array.from(days).sort((a, b) => new Date(b) - new Date(a));\r\n                        let dayStreak = 0;\r\n                        const today = new Date();\r\n                        for (let i = 0; i < dayList.length; i++) {\r\n                            const expected = new Date(today);\r\n                            expected.setDate(today.getDate() - i);\r\n                            if (dayList[i] === expected.toDateString()) dayStreak++;\r\n                            else break;\r\n                        }\r\n                        return dayStreak >= 2;\r\n                    })()) && ("

if OLD_STREAK in ac:
    ac = ac.replace(OLD_STREAK, NEW_STREAK)
    with open(FILE3, 'w', encoding='utf-8') as f:
        f.write(ac)
    print('Fix 3: Gated streaks behind !isTeacherMode')
else:
    print('Fix 3 FAIL: streak pattern not found')
