"""Find TTS function definitions more precisely"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8-sig').read().split('\n')

# Find callTTS definition
print("=== callTTS definitions ===")
for i, l in enumerate(lines):
    s = l.strip()
    if 'callTTS' in s and ('const ' in s or 'function ' in s):
        print(f"L{i+1}: {s[:140]}")

# Find speak function on AlloBot  
print("\n=== AlloBot speak definitions ===")
for i, l in enumerate(lines):
    s = l.strip()
    if '.speak' in s and ('=' in s) and ('function' in s or '=>' in s):
        print(f"L{i+1}: {s[:140]}")

# Find where browser SpeechSynthesis is called
print("\n=== speechSynthesis usage ===")
for i, l in enumerate(lines):
    s = l.strip()
    if 'speechSynthesis' in s:
        print(f"L{i+1}: {s[:140]}")

# Find the main TTS function that handles AlloBot voice
print("\n=== handleAudio / speakText / voiceAlloBot ===")
for i, l in enumerate(lines):
    s = l.strip()
    if ('handleAudio' in s or 'speakText' in s or 'alloBotSpeak' in s) and ('const ' in s or 'function' in s):
        print(f"L{i+1}: {s[:140]}")

# Find where TTS fallback decision is made
print("\n=== TTS fallback / browser fallback ===")
for i, l in enumerate(lines):
    s = l.strip()
    if ('fallback' in s.lower() and 'tts' in s.lower()) or ('browser' in s.lower() and ('tts' in s.lower() or 'speech' in s.lower())):
        print(f"L{i+1}: {s[:140]}")

# Find the Gemini TTS API call
print("\n=== Gemini TTS API ===")
for i, l in enumerate(lines):
    s = l.strip()
    if 'tts' in s.lower() and ('generativelanguage' in s or 'models/' in s):
        print(f"L{i+1}: {s[:140]}")
