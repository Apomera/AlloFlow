"""Find how the existing karaoke/TTS works for leveled text."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read().split('\n')

# Search for karaoke-related state and functions
print("=== Karaoke state declarations ===")
for i, line in enumerate(lines):
    if ('karaoke' in line.lower() and 'useState' in line) or 'karaokeIndex' in line and 'useState' in line:
        print(f"  L{i+1}: {line.rstrip()[:160]}")

# Find the actual karaoke playback function
print("\n=== Karaoke playback functions ===")
for i, line in enumerate(lines):
    stripped = line.strip()
    if ('karaoke' in stripped.lower() and ('const ' in stripped or 'function ' in stripped) and 
        ('=' in stripped or '{' in stripped)):
        print(f"  L{i+1}: {stripped[:160]}")

# Find how handleAudio is called for karaoke
print("\n=== handleAudio usage in karaoke ===")
for i, line in enumerate(lines):
    if 'handleAudio' in line and 'karaoke' in lines[max(0,i-5):i+5].__str__().lower():
        print(f"  L{i+1}: {line.rstrip()[:160]}")

# Find sentence-level highlight styling
print("\n=== Sentence highlight styling ===")
for i, line in enumerate(lines):
    if ('sentence' in line.lower() and 'highlight' in line.lower()) or \
       ('karaoke' in line.lower() and ('background' in line.lower() or 'color' in line.lower())):
        print(f"  L{i+1}: {line.rstrip()[:160]}")

# Find SpeechSynthesis usage  
print("\n=== speechSynthesis / SpeechSynthesis ===")
for i, line in enumerate(lines):
    if 'speechSynthesis' in line or 'SpeechSynthesis' in line:
        print(f"  L{i+1}: {line.rstrip()[:160]}")
