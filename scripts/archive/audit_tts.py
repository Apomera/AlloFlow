"""
Audit: TTS quota exhaustion and Allobot error handling
Find all relevant code paths for TTS failures and Allobot chat
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

out = []

# 1. callTTS function definition
out.append("=" * 60)
out.append("1. callTTS FUNCTION DEFINITION")
out.append("=" * 60)
for i, line in enumerate(lines):
    if ('const callTTS' in line or 'function callTTS' in line or 'callTTS =' in line) and ('async' in line or 'function' in line or '=>' in line):
        for j in range(max(0, i-2), min(len(lines), i+30)):
            out.append(f"L{j+1}: {lines[j].rstrip()[:200]}")
        out.append("...")
        break

# 2. TTS error handling / quota
out.append("")
out.append("=" * 60)
out.append("2. TTS ERROR HANDLING / QUOTA")
out.append("=" * 60)
for i, line in enumerate(lines):
    l = line.strip()
    if ('quota' in l.lower() or '429' in l or 'rate' in l.lower() or 'RESOURCE_EXHAUSTED' in l) and ('tts' in l.lower() or 'speech' in l.lower() or 'audio' in l.lower() or 'gemini' in l.lower()):
        out.append(f"L{i+1}: {l[:200]}")

# 3. "something went wrong" / error messages
out.append("")
out.append("=" * 60)
out.append("3. 'SOMETHING WENT WRONG' MESSAGES")
out.append("=" * 60)
for i, line in enumerate(lines):
    l = line.strip().lower()
    if 'something went wrong' in l or 'went wrong' in l:
        out.append(f"L{i+1}: {lines[i].strip()[:200]}")

# 4. Allobot chat send / handle message
out.append("")
out.append("=" * 60)
out.append("4. ALLOBOT CHAT HANDLER / SEND MESSAGE")
out.append("=" * 60)
for i, line in enumerate(lines):
    l = line.strip()
    if ('handleAllobotSend' in l or 'sendAllobot' in l or 'allobotChat' in l or 'handleSend' in l) and ('async' in l or 'function' in l or '=>' in l or 'const' in l):
        out.append(f"L{i+1}: {l[:200]}")

# 5. Allobot TTS usage
out.append("")
out.append("=" * 60)
out.append("5. ALLOBOT TTS / SPEECH USAGE")
out.append("=" * 60)
for i, line in enumerate(lines):
    l = line.strip()
    if ('allobot' in l.lower() or 'socratic' in l.lower()) and ('callTTS' in l or 'speechSynth' in l or 'speak' in l.lower()):
        if len(l) < 250:
            out.append(f"L{i+1}: {l[:200]}")

# 6. Browser speechSynthesis usage
out.append("")
out.append("=" * 60)
out.append("6. BROWSER speechSynthesis USAGE")
out.append("=" * 60)
for i, line in enumerate(lines):
    l = line.strip()
    if 'speechSynthesis' in l or 'SpeechSynthesis' in l:
        if len(l) < 250:
            out.append(f"L{i+1}: {l[:200]}")

# 7. TTS fallback / browser fallback
out.append("")
out.append("=" * 60)
out.append("7. TTS FALLBACK / BROWSER TTS PATTERNS")
out.append("=" * 60)
for i, line in enumerate(lines):
    l = line.strip()
    if ('fallback' in l.lower() and ('tts' in l.lower() or 'speech' in l.lower() or 'audio' in l.lower())):
        if len(l) < 250:
            out.append(f"L{i+1}: {l[:200]}")

# 8. Allobot error catch blocks  
out.append("")
out.append("=" * 60)
out.append("8. ALLOBOT ERROR CATCH BLOCKS")
out.append("=" * 60)
for i, line in enumerate(lines):
    l = line.strip()
    if ('catch' in l or 'error' in l.lower()) and ('allobot' in l.lower() or 'socratic' in l.lower()):
        if len(l) < 250 and len(l) > 5:
            out.append(f"L{i+1}: {l[:200]}")

with open('_tts_audit.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print(f"Audit saved to _tts_audit.txt ({len(out)} lines)")
