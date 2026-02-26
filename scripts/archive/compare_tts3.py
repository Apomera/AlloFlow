"""Find the MAIN handleAudio function used in AlloFlowContent (not WordSounds one)."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read().split('\n')

# Find ALL handleAudio definitions
print("=== ALL handleAudio definitions ===")
for i, line in enumerate(lines):
    if 'handleAudio' in line and ('const ' in line or 'function ' in line) and '=' in line:
        print(f"  L{i+1}: {line.rstrip()[:160]}")

# Find the main component's audio playback function
print("\n=== Main component audio functions (L38000-42000) ===")
for i in range(38000, min(42000, len(lines))):
    line = lines[i]
    if ('const ' in line or 'function ' in line) and ('Audio' in line or 'audio' in line or 'speak' in line.lower() or 'TTS' in line or 'tts' in line):
        if '=' in line:
            print(f"  L{i+1}: {line.rstrip()[:160]}")

# Find how FAQ/adapted text renders clickable sentences
print("\n=== FAQ speaker/audio button patterns ===")
for i in range(65000, len(lines)):
    line = lines[i]
    if ('faq' in line.lower() or 'FAQ' in line) and ('speak' in line.lower() or 'audio' in line.lower() or '\U0001F50A' in line or 'Volume' in line):
        print(f"  L{i+1}: {line.rstrip()[:160]}")

# Look for the generic speaker button pattern used across sections
print("\n=== Speaker button onClick patterns (L65000+) ===")
for i in range(65000, len(lines)):
    line = lines[i]
    if 'onClick' in line and ('handleAudio' in line or 'callTTS' in line or 'speak' in line.lower()):
        print(f"  L{i+1}: {line.rstrip()[:160]}")
        if i + 1 < len(lines):
            print(f"  L{i+2}: {lines[i+1].rstrip()[:160]}")

# Check what handleContentAudio is
print("\n=== handleContentAudio ===")
for i, line in enumerate(lines):
    if 'handleContentAudio' in line and ('const ' in line or 'function ' in line):
        print(f"  L{i+1}: {line.rstrip()[:160]}")
