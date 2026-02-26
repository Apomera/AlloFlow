"""
Fix caption rendering - apply the remaining FIX 3 only (FIX 1 and 2 already applied).
Use escaped Unicode to avoid encoding issues.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
original_lines = len(content.split('\n'))
fixed = 0

# The speaker emoji as a safe Unicode escape
speaker_emoji = '\U0001F50A'

old_caption = """{panel.caption && <figcaption className="visual-caption" style={{ textAlign: 'center' }} dangerouslySetInnerHTML={{ __html: panel.caption.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>') }} />}"""

new_caption = '{(captionOverrides[panelIdx] || panel.caption) && (\n'
new_caption += '                            editingCaptionIdx === panelIdx ? (\n'
new_caption += "                                <div style={{ padding: '4px 8px', background: '#f8fafc', borderTop: '1px solid #e0e7ff' }}>\n"
new_caption += '                                    <textarea\n'
new_caption += '                                        autoFocus\n'
new_caption += "                                        defaultValue={captionOverrides[panelIdx] || panel.caption || ''}\n"
new_caption += "                                        onBlur={(e) => { setCaptionOverrides(prev => ({...prev, [panelIdx]: e.target.value})); setEditingCaptionIdx(null); }}\n"
new_caption += "                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.target.blur(); }}}\n"
new_caption += """                                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #c7d2fe', fontSize: '12px', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", outline: 'none', resize: 'vertical', minHeight: '40px', textAlign: 'center', color: '#334155', lineHeight: 1.4 }}\n"""
new_caption += '                                    />\n'
new_caption += '                                </div>\n'
new_caption += '                            ) : (\n'
new_caption += '                                <figcaption\n'
new_caption += '                                    className="visual-caption"\n'
new_caption += "                                    style={{ textAlign: 'center', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', background: speakingCaptionIdx === panelIdx ? 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)' : '#f8fafc' }}\n"
new_caption += '                                    onClick={() => handleCaptionTTS(panelIdx)}\n'
new_caption += "                                    onDoubleClick={(e) => { e.stopPropagation(); window.speechSynthesis.cancel(); setSpeakingCaptionIdx(null); setEditingCaptionIdx(panelIdx); }}\n"
new_caption += '                                    title="Click to hear \\u2022 Double-click to edit"\n'
new_caption += '                                >\n'
new_caption += "                                    <span dangerouslySetInnerHTML={{ __html: (captionOverrides[panelIdx] || panel.caption).replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>') }} />\n"
new_caption += "                                    {speakingCaptionIdx === panelIdx && <span style={{ marginLeft: '6px', fontSize: '10px' }}>" + speaker_emoji + "</span>}\n"
new_caption += '                                </figcaption>\n'
new_caption += '                            )\n'
new_caption += '                        )}'

if old_caption in content:
    content = content.replace(old_caption, new_caption)
    fixed += 1
    print("[OK] FIX 3: Replaced caption with editable + TTS version")
else:
    print("[WARN] Caption not found - checking if already modified or different format")
    # Show what's actually there
    idx = content.find('visual-caption')
    if idx > -1:
        context = content[max(0,idx-200):idx+200]
        print(f"  Context around visual-caption: ...{context[:100]}...")

new_lines = len(content.split('\n'))
diff = new_lines - original_lines
print(f"\nLine count: {original_lines} -> {new_lines} (diff: {diff:+d})")

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! {fixed} fixes applied.")
