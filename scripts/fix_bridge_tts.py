"""
fix_bridge_tts.py — Fix Bridge mode TTS by replacing handleAudio (scoped to WordSoundsStudio)
with direct callTTS calls (in main App scope).

The problem: Bridge mode (L70764, L70916, L70922) calls handleAudio() which is defined inside
WordSoundsStudio component. Since it's not exposed to the main App scope, the call silently fails.

The fix: Use callTTS(text, selectedVoice) directly, which IS in the main App scope.
Then play the returned audio URL using standard Audio API.
"""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    
    # Fix 1: English playback (L70764)
    # Before: try { await handleAudio(text.replace(/\*\*/g, '')); } catch(e) { warnLog('Bridge TTS error', e); }
    old_en = "try { await handleAudio(text.replace(/\\*\\*/g, '')); } catch(e) { warnLog('Bridge TTS error', e); }"
    new_en = """try {
                          const cleanText = text.replace(/\\*\\*/g, '');
                          const ttsUrl = await callTTS(cleanText, selectedVoice);
                          if (ttsUrl) {
                            const audio = new Audio(ttsUrl);
                            audio.playbackRate = typeof ttsSpeed !== 'undefined' ? ttsSpeed : 1.0;
                            await new Promise((resolve) => {
                              audio.onended = resolve;
                              audio.onerror = () => { warnLog('Bridge audio playback error'); resolve(); };
                              setTimeout(resolve, 15000);
                              audio.play().catch(e => { warnLog('Bridge audio play() failed', e); resolve(); });
                            });
                          } else {
                            await speakWord(cleanText, 'en-US', typeof ttsSpeed !== 'undefined' ? ttsSpeed : 1.0);
                          }
                        } catch(e) { warnLog('Bridge TTS error', e); await speakWord(text.replace(/\\*\\*/g, ''), 'en-US', 1.0).catch(() => {}); }"""
    
    if old_en in content:
        content = content.replace(old_en, new_en)
        print("✅ Fixed English TTS (L70764)")
    else:
        print("⚠️  English TTS anchor not found — trying alternate...")
        # Try with single backslash escaping
        old_en2 = "try { await handleAudio(text.replace(/\\*\\*/g, '')); } catch(e) { warnLog('Bridge TTS error', e); }"
        if old_en2 in content:
            content = content.replace(old_en2, new_en)
            print("✅ Fixed English TTS (alternate anchor)")
        else:
            print("❌ Could not find English TTS anchor")
    
    # Fix 2: Find and fix translated text TTS (L70916/70922)
    # These also call handleAudio for the translated text
    old_tr = "try { await handleAudio(translated"
    if old_tr in content:
        # Find the exact pattern
        idx = content.find(old_tr)
        # Get the full line
        line_start = content.rfind('\n', 0, idx) + 1
        line_end = content.find('\n', idx)
        old_line = content[line_start:line_end]
        print(f"Found translated TTS: {old_line.strip()[:80]}")
    
    # Count remaining handleAudio calls in Bridge mode area
    bridge_area = content[content.find('bridgeMessage.english'):content.find('bridgeMessage.english') + 5000] if 'bridgeMessage.english' in content else ''
    remaining = bridge_area.count('handleAudio')
    print(f"\nRemaining handleAudio calls in Bridge area: {remaining}")
    
    SRC.write_text(content, encoding='utf-8')
    print(f"\n✅ Saved {SRC.name}")

if __name__ == "__main__":
    main()
