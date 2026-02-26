"""Fix TTS pipeline: restore throw-on-failure + instruction audio bank usage"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()
changes = 0

# =============================================================================
# FIX 1: callTTS null-check — change "return null" to "throw" so callers'
# error/fallback paths fire properly (matching backup behavior)
# =============================================================================
old1 = 'if (!ttsResult) { console.warn("[TTS] fetchTTSBytes returned null"); return null; }'
new1 = 'if (!ttsResult) { throw new Error("[TTS] fetchTTSBytes returned no audio data"); }'

if old1 in content:
    content = content.replace(old1, new1)
    changes += 1
    print("✅ 1: callTTS null-check → throw (fixes fallback chain)")
else:
    print("❌ 1: callTTS null-check pattern not found")

# =============================================================================
# FIX 2: Instruction repeat button — use ISOLATION_AUDIO bank first,
# then Gemini TTS as fallback (instead of always browser TTS)
# =============================================================================
old2_lf = """                                onClick={() => {
                                    const pos = typeof data.position === 'number' ? data.position : 0;
                                    const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
                                    const instruction = `What is the ${ordinals[pos] || (pos + 1) + 'th'} sound?`;
                                    // Use browser TTS for instruction repeat
                                    if (window.speechSynthesis) {
                                        window.speechSynthesis.cancel();
                                        const utter = new SpeechSynthesisUtterance(instruction);
                                        utter.rate = 0.9;
                                        window.speechSynthesis.speak(utter);
                                    }
                                }}"""

new2_lf = """                                onClick={async () => {
                                    const pos = typeof data.position === 'number' ? data.position : 0;
                                    const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
                                    const ordinal = ordinals[pos] || (pos + 1) + 'th';
                                    // 1. Try pre-recorded audio bank first (ISOLATION_AUDIO)
                                    const bankAudio = ISOLATION_AUDIO[ordinal];
                                    if (bankAudio) {
                                        try {
                                            const audio = new Audio(bankAudio);
                                            audio.playbackRate = 0.9;
                                            await audio.play();
                                            return;
                                        } catch (e) { /* fall through to Gemini TTS */ }
                                    }
                                    // 2. Fallback to Gemini TTS
                                    try {
                                        const instruction = `What is the ${ordinal} sound?`;
                                        const url = await callTTS(instruction, selectedVoice);
                                        if (url) {
                                            const audio = new Audio(url);
                                            audio.playbackRate = 0.9;
                                            await audio.play();
                                        }
                                    } catch (e) {
                                        warnLog("Instruction audio failed:", e);
                                    }
                                }}"""

# Try LF first, then CRLF
old2_crlf = old2_lf.replace('\n', '\r\n')
new2_crlf = new2_lf.replace('\n', '\r\n')

if old2_crlf in content:
    content = content.replace(old2_crlf, new2_crlf)
    changes += 1
    print("✅ 2: Instruction button → audio bank + Gemini TTS fallback (CRLF)")
elif old2_lf in content:
    content = content.replace(old2_lf, new2_lf)
    changes += 1
    print("✅ 2: Instruction button → audio bank + Gemini TTS fallback (LF)")
else:
    print("❌ 2: Instruction button pattern not found")

# Write
with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal changes: {changes}")
