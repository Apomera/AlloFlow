"""Focused search for karaoke pattern and VisualPanelGrid props."""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read().split('\n')

# Find VisualPanelGrid definition and its props
print("=== VisualPanelGrid Definition ===")
for i in range(len(lines)):
    if 'VisualPanelGrid' in lines[i] and 'React.memo' in lines[i]:
        for j in range(i, min(i+3, len(lines))):
            print(f"  L{j+1}: {lines[j].rstrip()[:180]}")
        break

# Find VisualPanelGrid usage (how it's called)
print("\n=== VisualPanelGrid Usage ===")
for i in range(len(lines)):
    if '<VisualPanelGrid' in lines[i]:
        for j in range(i, min(i+8, len(lines))):
            print(f"  L{j+1}: {lines[j].rstrip()[:180]}")
        print("  ...")

# Find karaoke state pattern
print("\n=== Karaoke State/Handler (first component that uses it) ===")
for i in range(len(lines)):
    if 'karaoke' in lines[i].lower() and ('useState' in lines[i] or 'handleKaraoke' in lines[i] or 'startKaraoke' in lines[i] or 'karaokePlaying' in lines[i]):
        print(f"  L{i+1}: {lines[i].rstrip()[:160]}")

# Find sentence click handler in leveled text
print("\n=== Sentence click / TTS trigger ===")
for i in range(len(lines)):
    line = lines[i]
    if ('handleSentenceClick' in line or 'onSentenceClick' in line or 
        ('sentence' in line.lower() and 'click' in line.lower() and 'tts' in line.lower())):
        print(f"  L{i+1}: {line.rstrip()[:160]}")

# Find how karaoke reads sentences sequentially
print("\n=== Karaoke sequential play (handleAudio/playNext) ===")
for i in range(len(lines)):
    line = lines[i]
    if 'karaoke' in line.lower() and ('next' in line.lower() or 'queue' in line.lower() or 'index' in line.lower()):
        if i < 10000:  # Only check first part of file
            print(f"  L{i+1}: {line.rstrip()[:160]}")
