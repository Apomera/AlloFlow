"""Search for 'word sounds' TTS source and handleAudio calls with short strings."""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

# 1. handleAudio with quoted literal strings (potential TTS text)
print("=== handleAudio with quoted literal strings ===")
for i, line in enumerate(lines):
    if 'handleAudio(' in line:
        matches = re.findall(r"handleAudio\(['\"]([^'\"]{3,40})['\"]\)", line)
        for m in matches:
            print(f"L{i+1}: handleAudio('{m}')")

# 2. Text headings containing 'Word Sounds'
print("\n=== Text headings with 'Word Sounds' ===")
for i, line in enumerate(lines):
    if '>Word Sounds<' in line or '>Word Sounds Studio<' in line:
        print(f"L{i+1}: {line.strip()[:160]}")

# 3. The loading message - 'Analyzing word sounds...' could trigger TTS somehow
print("\n=== 'word sounds' in loading/analyzing text ===")
for i, line in enumerate(lines):
    if 'Analyzing word sounds' in line or 'analyzing word sounds' in line:
        print(f"L{i+1}: {line.strip()[:160]}")

# 4. The handleAudio function - does it have any logic that speaks section titles?
print("\n=== handleAudio function continued (L3512+) ===")
for j in range(3512, min(len(lines), 3600)):
    print(f"L{j+1}: {lines[j].rstrip()[:180]}")
