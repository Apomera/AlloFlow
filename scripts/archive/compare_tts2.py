"""Focused: How does TTS get triggered in sections that work?"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read().split('\n')

# Find the click-to-hear pattern in adapted text / leveled text 
print("=== Click-to-hear in adapted/leveled text (sentences) ===")
for i, line in enumerate(lines):
    if i > 65000:
        if 'onClick' in line and 'sentence' in lines[max(0,i-3):i+3].__str__().lower():
            for j in range(max(0,i-2), min(len(lines), i+3)):
                print(f"  L{j+1}: {lines[j].rstrip()[:160]}")
            print()

# Find how the global handleAudio is called in non-word-sounds areas
print("\n=== handleAudio calls in rendering area (L65000+) ===")
for i in range(65000, len(lines)):
    if 'handleAudio(' in lines[i]:
        print(f"  L{i+1}: {lines[i].rstrip()[:160]}")

# Find how callTTS is called in rendering area
print("\n=== callTTS calls in rendering area (L65000+) ===")
for i in range(65000, len(lines)):
    if 'callTTS(' in lines[i] or 'callTTS (' in lines[i]:
        print(f"  L{i+1}: {lines[i].rstrip()[:160]}")

# Find any speakText/readAloud function
print("\n=== speakText / readAloud / playText patterns ===")
for i, line in enumerate(lines):
    if i > 35000:
        if ('speakText' in line or 'readAloud' in line or 'playText' in line) and ('const ' in line or 'function ' in line):
            print(f"  L{i+1}: {line.rstrip()[:160]}")
