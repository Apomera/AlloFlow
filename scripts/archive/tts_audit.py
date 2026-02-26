"""
Add console.log diagnostics to handleSpeak so we can see exactly which branch is taken.
Also check if playSequence uses browser TTS directly.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()

# 1. Add entry log to handleSpeak
old1 = '''    debugLog("[handleSpeak] Called with:", { contentId, textLen: text?.length, startIndex });'''
new1 = '''    console.log("[handleSpeak] Called with:", { contentId, textLen: text?.length, startIndex });'''
if old1 in content:
    content = content.replace(old1, new1)
    print("✅ 1. handleSpeak entry log")
else:
    print("❌ 1. handleSpeak entry pattern not found")

# 2. Add log when glossary cache HIT
old2 = '''            debugLog("⚡ Playing from Glossary Cache:", effectiveText);'''
new2 = '''            console.log("[handleSpeak] ⚡ Glossary CACHE HIT:", effectiveText.substring(0, 30));'''
if old2 in content:
    content = content.replace(old2, new2)
    print("✅ 2. Glossary cache hit log")
else:
    print("❌ 2. Glossary cache hit pattern not found")

# 3. Add log before playSequence call
old3 = '''        playSequence(startIndex, cleanSentences, sessionId, mode, voiceMap, activeSpeaker);
    } else {'''
new3 = '''        console.log("[handleSpeak] Using playSequence() - mode:", mode, "sentences:", cleanSentences.length);
        playSequence(startIndex, cleanSentences, sessionId, mode, voiceMap, activeSpeaker);
    } else {'''
if old3 in content:
    content = content.replace(old3, new3)
    print("✅ 3. playSequence log")
else:
    print("❌ 3. playSequence pattern not found")

# 4. Add log before callTTS in else branch
old4 = '''        setIsGeneratingAudio(true);
        setPlayingContentId(contentId);
        try {
            const audioUrl = await callTTS(effectiveText, selectedVoice);'''
new4 = '''        console.log("[handleSpeak] Using callTTS() for:", effectiveText.substring(0, 30), "contentId:", contentId);
        setIsGeneratingAudio(true);
        setPlayingContentId(contentId);
        try {
            const audioUrl = await callTTS(effectiveText, selectedVoice);'''
if old4 in content:
    content = content.replace(old4, new4)
    print("✅ 4. callTTS branch log")
else:
    print("❌ 4. callTTS branch pattern not found")

# 5. Add log to playSequence when it falls back to browser TTS  
old5 = '''          const utterance = new SpeechSynthesisUtterance(sequence[idx]);'''
new5 = '''          console.warn("[playSequence] ⚠️ Using BROWSER TTS for:", sequence[idx]?.substring(0, 30));
          const utterance = new SpeechSynthesisUtterance(sequence[idx]);'''
if old5 in content:
    content = content.replace(old5, new5)
    print("✅ 5. playSequence browser TTS log")
else:
    print("❌ 5. playSequence browser TTS pattern not found")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nDone.")
