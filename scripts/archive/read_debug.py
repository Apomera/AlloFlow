"""Read the debug output and show key findings"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

content = open('AlloFlowANTI.txt', 'r', encoding='utf-8-sig').read()
lines = content.split('\n')

# 1. Find all handleGenerate call types
import re
calls = re.findall(r"handleGenerate\(['\"](\w+)['\"]", content)
unique = sorted(set(calls))
print("CALL TYPES:", unique)

# 2. Count debug logs added
debug_count = content.count('[DEBUG-QUIZ]')
print(f"DEBUG LOGS: {debug_count}")

# 3. Show the exact quiz/exit ticket generation button
for i, l in enumerate(lines):
    s = l.strip()
    if 'quiz' in s.lower() and 'handleGenerate' in s:
        print(f"QUIZ_GEN L{i+1}: {s[:150]}")

# 4. Total line count
print(f"LINES: {len(lines)}")
