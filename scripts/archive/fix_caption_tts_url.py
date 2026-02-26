"""
Fix: callTTS returns a blob: URL, not base64. 
The handleCaptionTTS was incorrectly treating the return as base64.
Replace the audio creation logic to just use the URL directly.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
with open(filepath, 'rb') as f:
    content = f.read().decode('utf-8')
original_lines = len(content.split('\n'))

# Fix the Gemini TTS audio handling
old_gemini_tts = """        // Try Gemini TTS first
        if (typeof callTTS === 'function') {
            try {
                const audioData = await callTTS(clean);
                if (audioData) {
                    const audio = new Audio(typeof audioData === 'string' && audioData.startsWith('data:') ? audioData : 'data:audio/mp3;base64,' + audioData);
                    captionAudioRef.current = audio;
                    audio.onended = () => { captionAudioRef.current = null; setSpeakingCaptionIdx(null); };
                    audio.onerror = () => { captionAudioRef.current = null; setSpeakingCaptionIdx(null); };
                    await audio.play();
                    return;
                }
            } catch (e) {
                console.warn('[CaptionTTS] Gemini TTS failed, falling back to browser:', e.message);
            }
        }"""

new_gemini_tts = """        // Try Gemini TTS first (callTTS returns a blob: URL)
        if (typeof callTTS === 'function') {
            try {
                const audioUrl = await callTTS(clean);
                if (audioUrl) {
                    const audio = new Audio(audioUrl);
                    captionAudioRef.current = audio;
                    audio.onended = () => { captionAudioRef.current = null; setSpeakingCaptionIdx(null); };
                    audio.onerror = () => { captionAudioRef.current = null; setSpeakingCaptionIdx(null); };
                    await audio.play();
                    return;
                }
            } catch (e) {
                console.warn('[CaptionTTS] Gemini TTS failed, falling back to browser:', e.message);
            }
        }"""

if old_gemini_tts in content:
    content = content.replace(old_gemini_tts, new_gemini_tts)
    print("[OK] Fixed: callTTS return value now used directly as URL (blob: or blob URL)")
else:
    print("[WARN] Old Gemini TTS block not found")

new_lines = len(content.split('\n'))
print(f"Line count: {original_lines} -> {new_lines} (diff: {new_lines - original_lines:+d})")

with open(filepath, 'wb') as f:
    f.write(content.encode('utf-8'))
print("Done!")
