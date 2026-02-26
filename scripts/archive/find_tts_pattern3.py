"""Find the karaoke sentence highlighting pattern and callTTS availability."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read().split('\n')

# Find handleAudio / callTTS near the VisualPanelGrid call site
print("=== callTTS/handleAudio near L69074 ===")
for i in range(69000, min(69100, len(lines))):
    if 'callTTS' in lines[i] or 'handleAudio' in lines[i]:
        print(f"  L{i+1}: {lines[i].rstrip()[:160]}")

# Find karaoke sentence click pattern 
print("\n=== Karaoke sentence-by-sentence pattern ===")
for i in range(len(lines)):
    line = lines[i]
    if any(p in line for p in ['karaokeSentence', 'karaokeIndex', 'karaokeRef', 'karaokeActive', 'karaokePlay']):
        print(f"  L{i+1}: {line.rstrip()[:160]}")
        if len([1 for j in range(i-2, i+4) if 'karaoke' in lines[j].lower()]) > 1:
            pass  # already covered in range

# Look for sentence-level click-to-speak in any section
print("\n=== Sentence click handlers ===")
for i in range(len(lines)):
    line = lines[i]
    if 'onClick' in line and ('sentence' in line.lower() or 'speak' in line.lower() or 'readAloud' in line):
        print(f"  L{i+1}: {line.rstrip()[:160]}")

# Find how leveled text renders paragraphs with karaoke
print("\n=== Leveled Text karaoke rendering ===")
for i in range(len(lines)):
    line = lines[i] 
    if 'karaoke' in line.lower() and ('style' in line or 'className' in line or 'background' in line.lower()):
        if 'highlight' in lines[max(0,i-3):i+4].__str__().lower() or 'speaking' in lines[max(0,i-3):i+4].__str__().lower():
            print(f"  L{i+1}: {line.rstrip()[:160]}")
