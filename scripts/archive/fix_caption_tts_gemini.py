"""
Switch caption TTS from Web Speech API to Gemini TTS (callTTS) with fallback.
1. Add callTTS prop to VisualPanelGrid component definition
2. Pass callTTS at the call site
3. Update handleCaptionTTS to use callTTS first, speechSynthesis as fallback
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
with open(filepath, 'rb') as f:
    content = f.read().decode('utf-8')
original_lines = len(content.split('\n'))
fixed = 0

# ============================================================
# FIX 1: Add callTTS to component props
# ============================================================

old_props = "const VisualPanelGrid = React.memo(({ visualPlan, onRefinePanel, onUpdateLabel, t: tProp }) => {"
new_props = "const VisualPanelGrid = React.memo(({ visualPlan, onRefinePanel, onUpdateLabel, callTTS, t: tProp }) => {"

if old_props in content:
    content = content.replace(old_props, new_props)
    fixed += 1
    print("[OK] FIX 1: Added callTTS prop to VisualPanelGrid")
else:
    print("[WARN] FIX 1: VisualPanelGrid props not found")

# ============================================================
# FIX 2: Pass callTTS at call site
# ============================================================

old_callsite = """<VisualPanelGrid
                                    visualPlan={generatedContent?.data.visualPlan}
                                    onRefinePanel={handleRefinePanel}
                                    onUpdateLabel={handleUpdateVisualLabel}
                                    t={t}
                                />"""

new_callsite = """<VisualPanelGrid
                                    visualPlan={generatedContent?.data.visualPlan}
                                    onRefinePanel={handleRefinePanel}
                                    onUpdateLabel={handleUpdateVisualLabel}
                                    callTTS={callTTS}
                                    t={t}
                                />"""

if old_callsite in content:
    content = content.replace(old_callsite, new_callsite)
    fixed += 1
    print("[OK] FIX 2: Passed callTTS to VisualPanelGrid at call site")
else:
    print("[WARN] FIX 2: VisualPanelGrid call site not found")

# ============================================================
# FIX 3: Replace handleCaptionTTS to use callTTS with fallback
# ============================================================

old_tts = """    // Caption TTS: sentence-by-sentence with Web Speech API
    const handleCaptionTTS = (panelIdx) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        if (speakingCaptionIdx === panelIdx) { setSpeakingCaptionIdx(null); return; }
        const panels = visualPlan.panels || [];
        const captionText = captionOverrides[panelIdx] || (panels[panelIdx] ? panels[panelIdx].caption : '') || '';
        if (!captionText) return;
        const clean = captionText.replace(/\\*\\*(.+?)\\*\\*/g, '$1').replace(/<[^>]+>/g, '');
        const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
        let idx = 0;
        const speakNext = () => {
            if (idx >= sentences.length) { setSpeakingCaptionIdx(null); return; }
            setSpeakingCaptionIdx(panelIdx);
            const utt = new SpeechSynthesisUtterance(sentences[idx].trim());
            utt.rate = 0.9;
            utt.onend = () => { idx++; speakNext(); };
            utt.onerror = () => setSpeakingCaptionIdx(null);
            window.speechSynthesis.speak(utt);
        };
        speakNext();
    };"""

new_tts = """    // Caption TTS: Gemini TTS first, browser speechSynthesis as fallback
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

        // Try Gemini TTS first
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

if old_tts in content:
    content = content.replace(old_tts, new_tts, 1)
    fixed += 1
    print("[OK] FIX 3: Updated handleCaptionTTS to use Gemini TTS with browser fallback")
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
print(f"\nDone! {fixed} fixes applied safely.")
