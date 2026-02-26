"""
Add editable captions and caption TTS karaoke to VisualPanelGrid.

1. Editable captions: double-click to edit, stores overrides in state
2. Caption TTS: click caption to read aloud sentence-by-sentence with highlighting
   Uses window.speechSynthesis (Web Speech API) - no API calls needed
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
original_lines = len(content.split('\n'))
fixed = 0

# ============================================================
# FIX 1: Add state for caption editing and TTS
# Insert after hoveredLabelKey state
# ============================================================

old_hover_state = "const [hoveredLabelKey, setHoveredLabelKey] = React.useState(null); // key of currently hovered label"
new_states = """const [hoveredLabelKey, setHoveredLabelKey] = React.useState(null); // key of currently hovered label
    const [captionOverrides, setCaptionOverrides] = React.useState({}); // { panelIdx: 'edited caption' }
    const [editingCaptionIdx, setEditingCaptionIdx] = React.useState(null); // panelIdx being edited
    const [speakingCaptionIdx, setSpeakingCaptionIdx] = React.useState(null); // panelIdx being spoken"""

if old_hover_state in content:
    content = content.replace(old_hover_state, new_states)
    fixed += 1
    print("[OK] FIX 1: Added captionOverrides, editingCaptionIdx, speakingCaptionIdx state")
else:
    print("[WARN] FIX 1: hoveredLabelKey state not found")

# ============================================================
# FIX 2: Add caption TTS function (uses Web Speech API)
# Insert before handlePanelDragStart
# ============================================================

old_panel_drag_start = "    // Drag handler for AI-generated labels"
new_caption_tts = """    // Caption TTS: sentence-by-sentence with highlighting
    const handleCaptionTTS = (panelIdx) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        if (speakingCaptionIdx === panelIdx) { setSpeakingCaptionIdx(null); return; }
        const captionText = captionOverrides[panelIdx] || (visualPlan.panels[panelIdx]?.caption || '');
        if (!captionText) return;
        const cleanText = captionText.replace(/\\*\\*(.+?)\\*\\*/g, '$1').replace(/<[^>]+>/g, '');
        const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
        let currentIdx = 0;
        const speakNext = () => {
            if (currentIdx >= sentences.length) { setSpeakingCaptionIdx(null); return; }
            setSpeakingCaptionIdx(panelIdx);
            const utterance = new SpeechSynthesisUtterance(sentences[currentIdx].trim());
            utterance.rate = 0.9;
            utterance.onend = () => { currentIdx++; speakNext(); };
            utterance.onerror = () => { setSpeakingCaptionIdx(null); };
            window.speechSynthesis.speak(utterance);
        };
        speakNext();
    };

    // Drag handler for AI-generated labels"""

if old_panel_drag_start in content:
    content = content.replace(old_panel_drag_start, new_caption_tts, 1)
    fixed += 1
    print("[OK] FIX 2: Added handleCaptionTTS function")
else:
    print("[WARN] FIX 2: AI label drag handler comment not found")

# ============================================================
# FIX 3: Replace caption figcaption with editable + TTS version
# ============================================================

old_caption = """{panel.caption && <figcaption className="visual-caption" style={{ textAlign: 'center' }} dangerouslySetInnerHTML={{ __html: panel.caption.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>') }} />}"""

new_caption = """{(captionOverrides[panelIdx] || panel.caption) && (
                            editingCaptionIdx === panelIdx ? (
                                <div style={{ padding: '4px 8px', background: '#f8fafc', borderTop: '1px solid #e0e7ff' }}>
                                    <textarea
                                        autoFocus
                                        defaultValue={captionOverrides[panelIdx] || panel.caption || ''}
                                        onBlur={(e) => { setCaptionOverrides(prev => ({...prev, [panelIdx]: e.target.value})); setEditingCaptionIdx(null); }}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.target.blur(); }}}
                                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #c7d2fe', fontSize: '12px', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", outline: 'none', resize: 'vertical', minHeight: '40px', textAlign: 'center', color: '#334155', lineHeight: 1.4 }}
                                    />
                                </div>
                            ) : (
                                <figcaption
                                    className="visual-caption"
                                    style={{ textAlign: 'center', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', background: speakingCaptionIdx === panelIdx ? 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)' : '#f8fafc' }}
                                    onClick={() => handleCaptionTTS(panelIdx)}
                                    onDoubleClick={(e) => { e.stopPropagation(); window.speechSynthesis.cancel(); setSpeakingCaptionIdx(null); setEditingCaptionIdx(panelIdx); }}
                                    title="Click to hear \u2022 Double-click to edit"
                                >
                                    <span dangerouslySetInnerHTML={{ __html: (captionOverrides[panelIdx] || panel.caption).replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>') }} />
                                    {speakingCaptionIdx === panelIdx && <span style={{ marginLeft: '6px', fontSize: '10px' }}>\uD83D\uDD0A</span>}
                                </figcaption>
                            )
                        )}"""

if old_caption in content:
    content = content.replace(old_caption, new_caption)
    fixed += 1
    print("[OK] FIX 3: Replaced caption with editable + TTS version")
else:
    print("[WARN] FIX 3: Caption figcaption not found")
    # Try to find what it actually looks like
    if 'visual-caption' in content:
        print("  -> visual-caption class exists, checking format...")
        import re
        m = re.search(r'\{panel\.caption.*?figcaption.*?/\>', content, re.DOTALL)
        if m:
            print(f"  -> Found: {m.group()[:100]}...")

# ============================================================
# Verify
# ============================================================
new_lines = len(content.split('\n'))
diff = new_lines - original_lines
print(f"\nLine count: {original_lines} -> {new_lines} (diff: {diff:+d})")

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! {fixed} fixes applied.")
