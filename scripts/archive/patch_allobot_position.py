"""
Add AlloBot wizard-aware repositioning useEffect + fix double CRs.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

print(f"Lines: {len(lines)}")
changes = 0

# ===================================================================
# 1. Find a good place to insert AlloBot wizard repositioning effect
# Near the existing auto-speak effect that uses alloBotRef and moveTo
# The auto-speak effect at L35857 (shifted) already calls moveTo
# Let's find it and insert our new effect after it
# ===================================================================

# Find the auto-speak effect
auto_speak_effect = None
for i, l in enumerate(lines):
    if 'lastSpokenMessageIndexRef' in l and 'useEffect' in l:
        auto_speak_effect = i
        break

if auto_speak_effect is None:
    # Find by the speak call
    for i, l in enumerate(lines):
        if 'alloBotRef.current.speak(lastMsg.text)' in l:
            # Go up to find the useEffect
            for j in range(i, max(0, i-20), -1):
                if 'useEffect' in lines[j]:
                    auto_speak_effect = j
                    break
            break

if auto_speak_effect:
    # Find the end of this useEffect (the closing })
    # useEffect(() => { ... }, [deps]);
    expr_depth = 0
    effect_end = None
    for i in range(auto_speak_effect, auto_speak_effect + 30):
        for ch in lines[i]:
            if ch == '{':
                expr_depth += 1
            elif ch == '}':
                expr_depth -= 1
        if expr_depth <= 0 and i > auto_speak_effect:
            effect_end = i + 1
            break
    
    if effect_end:
        # Insert new useEffect after the auto-speak effect
        new_effect = [
            "\r\n",
            "    // Reposition AlloBot when wizard dialog opens/closes\r\n",
            "    useEffect(() => {\r\n",
            "        if (!alloBotRef.current) return;\r\n",
            "        if (showWizard) {\r\n",
            "            // Move AlloBot to top-right corner to avoid overlapping the centered wizard modal\r\n",
            "            const safeX = 20; // 20px from right edge\r\n",
            "            const safeY = window.innerHeight - 120; // near top (bot uses bottom positioning)\r\n",
            "            alloBotRef.current.moveTo(safeX, safeY);\r\n",
            "        } else {\r\n",
            "            // Return to default bottom-right position\r\n",
            "            alloBotRef.current.moveTo(20, 20);\r\n",
            "        }\r\n",
            "    }, [showWizard]);\r\n",
        ]
        
        for j, line in enumerate(new_effect):
            lines.insert(effect_end + j, line)
        
        print(f"[1] Added wizard repositioning effect after L{effect_end}")
        changes += 1
    else:
        print("[1] FAIL: could not find auto-speak effect end")
else:
    print("[1] FAIL: could not find auto-speak effect")

# ===================================================================
# 2. Fix double CRs
# ===================================================================
content = ''.join(lines)
raw = content.encode('utf-8')
dbl = raw.count(b'\r\r\n')
print(f"Double CRs: {dbl}")
if dbl > 0:
    raw = raw.replace(b'\r\r\n', b'\r\n')
    with open(FILE, 'wb') as f:
        f.write(raw)
    print("Fixed double CRs.")
elif changes > 0:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    
print(f"{changes} changes applied.")
