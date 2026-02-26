"""Compare how TTS works in FAQ/Adapted Text vs Captions."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read().split('\n')

# Find how FAQ uses TTS
print("=== FAQ TTS usage ===")
for i, line in enumerate(lines):
    if 'faq' in line.lower() and ('callTTS' in line or 'handleAudio' in line or 'playAudio' in line or 'speakText' in line):
        print(f"  L{i+1}: {line.rstrip()[:160]}")

# Find how Adapted Text uses TTS
print("\n=== Adapted Text TTS usage ===")
for i, line in enumerate(lines):
    if ('adapted' in line.lower() or 'leveled' in line.lower()) and ('callTTS' in line or 'handleAudio' in line or 'playAudio' in line):
        print(f"  L{i+1}: {line.rstrip()[:160]}")

# Find how Adventure uses TTS
print("\n=== Adventure TTS usage ===")
for i, line in enumerate(lines):
    if 'adventure' in line.lower() and ('callTTS' in line or 'handleAudio' in line or 'playAudio' in line):
        print(f"  L{i+1}: {line.rstrip()[:160]}")

# Find ALL onClick handlers that trigger TTS in the reading area
print("\n=== onClick + TTS patterns (not word sounds) ===")
for i, line in enumerate(lines):
    if i < 35000 or i > 65000:  # Skip word sounds area
        if 'onClick' in line and ('callTTS' in line or 'handleAudio' in line or 'speakSentence' in line or 'playback' in line.lower()):
            print(f"  L{i+1}: {line.rstrip()[:160]}")

# Check if handleAudio is the right function for the visual section
print("\n=== handleAudio in visual section area (L65000-72000) ===")
for i in range(65000, min(72000, len(lines))):
    if 'handleAudio' in lines[i] and ('onClick' in lines[i] or 'speak' in lines[i].lower()):
        print(f"  L{i+1}: {lines[i].rstrip()[:160]}")

# Check what functions are available near the VisualPanelGrid call site
print("\n=== Functions available near L69074 call site ===")
for i in range(69060, min(69120, len(lines))):
    if 'handleAudio' in lines[i] or 'callTTS' in lines[i] or 'speak' in lines[i].lower():
        print(f"  L{i+1}: {lines[i].rstrip()[:160]}")
