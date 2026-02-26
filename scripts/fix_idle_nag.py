#!/usr/bin/env python3
"""Fix Allobot idle nagging: speak fallback wake-up only once until user interacts again."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Fix 1: Add hasSpokenFallback flag after let lastActivityTime
old1 = "let lastActivityTime = Date.now();"
new1 = "let lastActivityTime = Date.now();\n    let hasSpokenFallback = false;"
content = content.replace(old1, new1, 1)
print("1: Added hasSpokenFallback flag")

# Fix 2: Guard the fallback speak with hasSpokenFallback check
old2 = """if (now - lastActivityTime > 300000) { // 5 minutes
             if (!isDragging && !isTalking && !isSystemAudioActive && !customMessage && !isIdleDisabled && !isSleeping) {
                 const tip = getRandomTip();
                 speak(tip, false); // Audio = true (Wake up!)
             }
             lastActivityTime = Date.now(); // Reset to avoid spamming every tick"""

new2 = """if (now - lastActivityTime > 300000 && !hasSpokenFallback) { // 5 minutes, once only
             if (!isDragging && !isTalking && !isSystemAudioActive && !customMessage && !isIdleDisabled && !isSleeping) {
                 const tip = getRandomTip();
                 speak(tip, false); // Audio wake-up (once only until user interacts)
                 hasSpokenFallback = true; // Don't nag again until user activity resets this
             }
             lastActivityTime = Date.now();"""

if old2 in content:
    content = content.replace(old2, new2, 1)
    print("2: Added hasSpokenFallback guard to fallback loop")
else:
    print("2: FAILED - could not find fallback block (trying normalized)")
    # Try with different whitespace
    import re
    old2_pattern = r'if \(now - lastActivityTime > 300000\) \{'
    match = re.search(old2_pattern, content)
    if match:
        print(f"   Found pattern at offset {match.start()}, doing manual fix")

# Fix 3: Reset hasSpokenFallback when user interacts
old3 = """const resetInactivity = () => {
        lastActivityTime = Date.now();
    };"""
new3 = """const resetInactivity = () => {
        lastActivityTime = Date.now();
        hasSpokenFallback = false; // User is back — allow one more wake-up next idle period
    };"""

if old3 in content:
    content = content.replace(old3, new3, 1)
    print("3: Reset hasSpokenFallback on user activity")
else:
    print("3: FAILED - could not find resetInactivity")

with open(FILE, 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(content)
print("Done!")
