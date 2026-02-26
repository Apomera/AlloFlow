"""Find the TTS karaoke/highlighting pattern in leveled text or other sections."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()
lines = content.split('\n')

# Search for karaoke/highlighting patterns
patterns = ['highlightSentence', 'karaoke', 'sentence.*highlight', 'activeSentence', 'readAloud', 'ttsQueue', 'playCaption', 'speakSentence', 'currentlySpeaking', 'speakingIdx', 'handleCaptionClick']
for pat in patterns:
    import re
    matches = [(i+1, lines[i].rstrip()[:140]) for i in range(len(lines)) if re.search(pat, lines[i], re.IGNORECASE)]
    if matches:
        print(f"\n=== {pat} ({len(matches)} hits) ===")
        for ln, txt in matches[:5]:
            print(f"  L{ln}: {txt}")

# Also look for how leveled text handles sentence clicking / TTS
print("\n=== Leveled text sentence click patterns ===")
for i in range(len(lines)):
    line = lines[i]
    if 'LeveledText' in line and ('sentence' in line.lower() or 'tts' in line.lower() or 'speak' in line.lower()):
        print(f"  L{i+1}: {line.rstrip()[:140]}")

# Look for callTTS usage near sentence highlighting
print("\n=== callTTS usage (first 10) ===")
hits = [(i+1, lines[i].rstrip()[:140]) for i in range(len(lines)) if 'callTTS' in lines[i]]
for ln, txt in hits[:10]:
    print(f"  L{ln}: {txt}")

# Look for how VisualPanelGrid receives props (does it get callTTS?)
print("\n=== VisualPanelGrid props ===")
for i in range(len(lines)):
    if 'VisualPanelGrid' in lines[i] and ('=' in lines[i] or 'props' in lines[i].lower()):
        print(f"  L{i+1}: {lines[i].rstrip()[:160]}")
