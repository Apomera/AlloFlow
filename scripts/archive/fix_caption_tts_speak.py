"""
Fix caption TTS: use handleSpeak (the working orchestrator) instead of callTTS.
1. Replace callTTS prop with handleSpeak
2. Simplify handleCaptionTTS to just call handleSpeak
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
with open(filepath, 'rb') as f:
    content = f.read().decode('utf-8')
original_lines = len(content.split('\n'))
fixed = 0

# ============================================================
# FIX 1: Replace callTTS prop with handleSpeak in component definition
# ============================================================
old_props = "const VisualPanelGrid = React.memo(({ visualPlan, onRefinePanel, onUpdateLabel, callTTS, t: tProp }) => {"
new_props = "const VisualPanelGrid = React.memo(({ visualPlan, onRefinePanel, onUpdateLabel, onSpeak, t: tProp }) => {"

if old_props in content:
    content = content.replace(old_props, new_props)
    fixed += 1
    print("[OK] FIX 1: Replaced callTTS prop with onSpeak")
else:
    print("[WARN] FIX 1: Props not found")

# ============================================================
# FIX 2: Replace callTTS with handleSpeak at call site
# ============================================================
old_callsite = """<VisualPanelGrid
                                    visualPlan={generatedContent?.data.visualPlan}
                                    onRefinePanel={handleRefinePanel}
                                    onUpdateLabel={handleUpdateVisualLabel}
                                    callTTS={callTTS}
                                    t={t}
                                />"""

new_callsite = """<VisualPanelGrid
                                    visualPlan={generatedContent?.data.visualPlan}
                                    onRefinePanel={handleRefinePanel}
                                    onUpdateLabel={handleUpdateVisualLabel}
                                    onSpeak={handleSpeak}
                                    t={t}
                                />"""

if old_callsite in content:
    content = content.replace(old_callsite, new_callsite)
    fixed += 1
    print("[OK] FIX 2: Passed handleSpeak as onSpeak prop at call site")
else:
    print("[WARN] FIX 2: Call site not found")

# ============================================================
# FIX 3: Replace handleCaptionTTS to use onSpeak (handleSpeak)
# The handleSpeak signature: handleSpeak(text, contentId, startIndex)
# FAQ uses: handleSpeak(sentenceText, 'faq-active', globalIdx)
# For captions: handleSpeak(captionText, 'caption-panelIdx', 0)
# ============================================================

old_tts = """    // Caption TTS: Gemini TTS first, browser speechSynthesis as fallback
    const captionAudioRef = React.useRef(null);
    const handleCaptionTTS = async (panelIdx) => {
        // Stop if already speaking this caption
        if (speakingCaptionIdx === panelIdx) {
            if (captionAudioRef.current) { captionAudioRef.current.pause(); captionAudioRef.current = null; }
            if (window.speechSynthesis) window.speechSynthesis.cancel();
            setSpeakingCaptionIdx(null);
            return;
        }
        // Stop any previous audio
        if (captionAudioRef.current) { captionAudioRef.current.pause(); captionAudioRef.current = null; }
        if (window.speechSynthesis) window.speechSynthesis.cancel();

        const panels = visualPlan.panels || [];
        const captionText = captionOverrides[panelIdx] || (panels[panelIdx] ? panels[panelIdx].caption : '') || '';
        if (!captionText) return;
        const clean = captionText.replace(/\\*\\*(.+?)\\*\\*/g, '$1').replace(/<[^>]+>/g, '');
        setSpeakingCaptionIdx(panelIdx);

        // Try Gemini TTS first (callTTS returns a blob: URL)
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
        }

        // Fallback: Browser speechSynthesis
        if (window.speechSynthesis) {
            const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
            let idx = 0;
            const speakNext = () => {
                if (idx >= sentences.length) { setSpeakingCaptionIdx(null); return; }
                const utt = new SpeechSynthesisUtterance(sentences[idx].trim());
                utt.rate = 0.9;
                utt.onend = () => { idx++; speakNext(); };
                utt.onerror = () => setSpeakingCaptionIdx(null);
                window.speechSynthesis.speak(utt);
            };
            speakNext();
        } else {
            setSpeakingCaptionIdx(null);
        }
    };"""

new_tts = """    // Caption TTS: Uses handleSpeak (same as FAQ/Adapted Text)
    const handleCaptionTTS = (panelIdx) => {
        const panels = visualPlan.panels || [];
        const captionText = captionOverrides[panelIdx] || (panels[panelIdx] ? panels[panelIdx].caption : '') || '';
        if (!captionText) return;
        const clean = captionText.replace(/\\*\\*(.+?)\\*\\*/g, '$1').replace(/<[^>]+>/g, '');
        if (!clean.trim()) return;
        setSpeakingCaptionIdx(prev => prev === panelIdx ? null : panelIdx);
        if (typeof onSpeak === 'function') {
            onSpeak(clean, 'caption-' + panelIdx, 0);
        }
    };"""

if old_tts in content:
    content = content.replace(old_tts, new_tts, 1)
    fixed += 1
    print("[OK] FIX 3: Simplified handleCaptionTTS to use onSpeak (handleSpeak)")
else:
    print("[WARN] FIX 3: Old handleCaptionTTS not found")

# ============================================================
# Write safely
# ============================================================
new_lines = len(content.split('\n'))
diff = new_lines - original_lines
print(f"\nLine count: {original_lines} -> {new_lines} (diff: {diff:+d})")

with open(filepath, 'wb') as f:
    f.write(content.encode('utf-8'))
print(f"\nDone! {fixed} fixes applied.")
