"""
Comprehensive fix - all content.replace(), safe Unicode:
1. Null-safety: generatedContent.data -> generatedContent?.data
2. Fix delete image: preserve prompt, clear only imageUrl/visualPlan
3. Add editable captions (double-click to edit)
4. Add caption TTS (click to hear via Web Speech API)
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'

# Read file as bytes first, then decode, to avoid encoding issues
with open(filepath, 'rb') as f:
    raw = f.read()
content = raw.decode('utf-8')
original_lines = len(content.split('\n'))
fixed = 0

# ============================================================
# FIX 1: Null-safety for generatedContent.data
# ============================================================
unsafe_count = content.count('generatedContent.data') - content.count('generatedContent?.data')
if unsafe_count > 0:
    content = content.replace('generatedContent.data', 'generatedContent?.data')
    fixed += 1
    print(f"[OK] FIX 1: Fixed {unsafe_count} unsafe generatedContent.data accesses")
else:
    print("[SKIP] FIX 1: All generatedContent.data already safe")

# ============================================================
# FIX 2: Fix handleDeleteImage to preserve prompt
# Instead of setting null, keep prompt/type/id but clear imageUrl
# ============================================================

old_delete = "const handleDeleteImage = () => setGeneratedContent(null);"
new_delete = """const handleDeleteImage = () => {
    if (generatedContent) {
      setGeneratedContent(prev => prev ? {
        ...prev,
        data: { ...prev.data, imageUrl: null, visualPlan: null }
      } : null);
    }
  };"""

if old_delete in content:
    content = content.replace(old_delete, new_delete)
    fixed += 1
    print("[OK] FIX 2: handleDeleteImage now preserves prompt, clears only imageUrl/visualPlan")
else:
    print("[WARN] FIX 2: handleDeleteImage not found")

# ============================================================
# FIX 3: Add caption editing and TTS states
# ============================================================

old_hover = "const [hoveredLabelKey, setHoveredLabelKey] = React.useState(null); // key of currently hovered label"
new_hover = """const [hoveredLabelKey, setHoveredLabelKey] = React.useState(null); // key of currently hovered label
    const [captionOverrides, setCaptionOverrides] = React.useState({}); // { panelIdx: 'edited text' }
    const [editingCaptionIdx, setEditingCaptionIdx] = React.useState(null);
    const [speakingCaptionIdx, setSpeakingCaptionIdx] = React.useState(null);"""

if old_hover in content:
    content = content.replace(old_hover, new_hover)
    fixed += 1
    print("[OK] FIX 3: Added caption states")
else:
    print("[WARN] FIX 3: hoveredLabelKey state not found")

# ============================================================
# FIX 4: Add caption TTS function
# ============================================================

old_ai_drag_comment = "    // Drag handler for AI-generated labels (stores position overrides)"
new_tts_func = """    // Caption TTS: sentence-by-sentence with Web Speech API
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
    };

    // Drag handler for AI-generated labels (stores position overrides)"""

if old_ai_drag_comment in content:
    content = content.replace(old_ai_drag_comment, new_tts_func, 1)
    fixed += 1
    print("[OK] FIX 4: Added handleCaptionTTS function")
else:
    print("[WARN] FIX 4: AI drag comment not found")

# ============================================================
# FIX 5: Replace figcaption with editable + TTS version
# ============================================================

old_fig = "{panel.caption && <figcaption className=\"visual-caption\" style={{ textAlign: 'center' }} dangerouslySetInnerHTML={{ __html: panel.caption.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>') }} />}"

# Build new caption JSX safely (no raw surrogates)
new_fig_lines = [
    "{(captionOverrides[panelIdx] || panel.caption) && (",
    "                            editingCaptionIdx === panelIdx ? (",
    "                                <div style={{ padding: '4px 8px', background: '#f8fafc', borderTop: '1px solid #e0e7ff' }}>",
    "                                    <textarea",
    "                                        autoFocus",
    "                                        defaultValue={captionOverrides[panelIdx] || panel.caption || ''}",
    "                                        onBlur={(e) => { setCaptionOverrides(prev => ({...prev, [panelIdx]: e.target.value})); setEditingCaptionIdx(null); }}",
    "                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.target.blur(); }}}",
    "                                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #c7d2fe', fontSize: '12px', fontFamily: \"'Inter','Segoe UI',system-ui,sans-serif\", outline: 'none', resize: 'vertical', minHeight: '40px', textAlign: 'center', color: '#334155', lineHeight: 1.4 }}",
    "                                    />",
    "                                </div>",
    "                            ) : (",
    "                                <figcaption",
    "                                    className=\"visual-caption\"",
    "                                    style={{ textAlign: 'center', cursor: 'pointer', transition: 'background 0.2s', background: speakingCaptionIdx === panelIdx ? 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)' : '#f8fafc' }}",
    "                                    onClick={() => handleCaptionTTS(panelIdx)}",
    "                                    onDoubleClick={(e) => { e.stopPropagation(); if (window.speechSynthesis) window.speechSynthesis.cancel(); setSpeakingCaptionIdx(null); setEditingCaptionIdx(panelIdx); }}",
    "                                    title=\"Click to hear \\u2022 Double-click to edit\"",
    "                                >",
    "                                    <span dangerouslySetInnerHTML={{ __html: (captionOverrides[panelIdx] || panel.caption).replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>') }} />",
    "                                    {speakingCaptionIdx === panelIdx && <span style={{ marginLeft: '6px', fontSize: '10px' }}>\\uD83D\\uDD0A</span>}",
    "                                </figcaption>",
    "                            )",
    "                        )}",
]
new_fig = "\n".join(new_fig_lines)

# Actually let's use a regular unicode escape for the speaker emoji
# The issue was \uD83D\uDD0A which are surrogates - in the file they need to be literal chars
# Let's just use a text emoji instead
new_fig = new_fig.replace("\\uD83D\\uDD0A", "\U0001F50A")

if old_fig in content:
    content = content.replace(old_fig, new_fig)
    fixed += 1
    print("[OK] FIX 5: Caption now editable (double-click) with TTS (click)")
else:
    print("[WARN] FIX 5: Caption figcaption not found")
    # Debug
    if 'visual-caption' in content:
        import re
        m = re.search(r'panel\.caption.*?figcaption', content[:200000])
        if m:
            print(f"  -> Found partial: {m.group()[:80]}")

# ============================================================
# Write safely - encode to bytes first
# ============================================================
new_lines = len(content.split('\n'))
diff = new_lines - original_lines
print(f"\nLine count: {original_lines} -> {new_lines} (diff: {diff:+d})")

with open(filepath, 'wb') as f:
    f.write(content.encode('utf-8'))
print(f"\nDone! {fixed} fixes applied safely.")
