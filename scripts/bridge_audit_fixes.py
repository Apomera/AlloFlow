#!/usr/bin/env python3
"""
Bridge Mode Audit Fixes:
1. Theme: Replace all remaining hardcoded colors with _bt tokens
2. Accessibility: Add aria labels, keyboard handlers, role=dialog
3. Fix: Attach Image button query selector bug
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# ===================================================================
# ADD GLOBAL _bt VISIBILITY HELPERS (data attributes for JS access)
# ===================================================================

# The mode buttons use JS .style = ... which can't reference _bt.
# Solution: Store _bt values as data attributes on the mode container,
# then read them from JS event handlers.

old_mode_container = """<div id="bridge-mode-selector" style={{display:'grid',gridTemplateColumns:'repeat(5, 1fr)',gap:'8px'}}>"""

new_mode_container = """<div id="bridge-mode-selector" data-card-bg={_bt.cardBg} data-card-border={_bt.cardBorder} data-card-active-bg={_bt.cardActiveBg} data-card-active-border={_bt.cardActiveBorder} data-text-secondary={_bt.textSecondary} data-text-accent={_bt.textAccent} data-dot-active={_bt.dotActive} data-dot-inactive={_bt.dotInactive} style={{display:'grid',gridTemplateColumns:'repeat(5, 1fr)',gap:'8px'}}>"""

if old_mode_container in content:
    content = content.replace(old_mode_container, new_mode_container, 1)
    changes += 1
    print("1: Added _bt data attributes to mode container for JS access")
else:
    print("1: SKIP - mode container not found")

# ===================================================================
# FIX MODE BUTTON RESET — use data-attributes for theme colors
# ===================================================================

old_mode_reset = """document.querySelectorAll('[data-bridge-mode]').forEach(b => {
                          b.style.background = 'rgba(255,255,255,0.04)';
                          b.style.borderColor = 'rgba(255,255,255,0.08)';
                          b.style.color = '#94a3b8';
                          b.querySelector('[data-mode-dot]').style.background = 'rgba(255,255,255,0.1)';
                        });
                        e.currentTarget.style.background = 'rgba(20,184,166,0.12)';
                        e.currentTarget.style.borderColor = 'rgba(20,184,166,0.35)';
                        e.currentTarget.style.color = '#5eead4';
                        e.currentTarget.querySelector('[data-mode-dot]').style.background = '#14b8a6';"""

new_mode_reset = """const _mC = document.getElementById('bridge-mode-selector');
                        const _cBg = _mC?.dataset.cardBg || 'rgba(255,255,255,0.04)';
                        const _cBr = _mC?.dataset.cardBorder || 'rgba(255,255,255,0.08)';
                        const _cTs = _mC?.dataset.textSecondary || '#94a3b8';
                        const _cDi = _mC?.dataset.dotInactive || 'rgba(255,255,255,0.1)';
                        document.querySelectorAll('[data-bridge-mode]').forEach(b => {
                          b.style.background = _cBg;
                          b.style.borderColor = _cBr;
                          b.style.color = _cTs;
                          b.querySelector('[data-mode-dot]').style.background = _cDi;
                        });
                        e.currentTarget.style.background = _mC?.dataset.cardActiveBg || 'rgba(20,184,166,0.12)';
                        e.currentTarget.style.borderColor = _mC?.dataset.cardActiveBorder || 'rgba(20,184,166,0.35)';
                        e.currentTarget.style.color = _mC?.dataset.textAccent || '#5eead4';
                        e.currentTarget.querySelector('[data-mode-dot]').style.background = _mC?.dataset.dotActive || '#14b8a6';"""

if old_mode_reset in content:
    content = content.replace(old_mode_reset, new_mode_reset, 1)
    changes += 1
    print("2: Fixed mode button reset to use theme data-attributes")
else:
    print("2: SKIP - mode reset not found")

# ===================================================================
# FIX MODE BUTTON INITIAL STYLE — use _bt tokens
# ===================================================================

old_mode_style = """style={{
                        background: mi === 0 ? 'rgba(20,184,166,0.12)' : 'rgba(255,255,255,0.04)',
                        border: '1px solid ' + (mi === 0 ? 'rgba(20,184,166,0.35)' : 'rgba(255,255,255,0.08)'),
                        borderRadius:'14px',padding:'14px 12px',cursor:'pointer',
                        textAlign:'left',transition:'all 0.2s',
                        color: mi === 0 ? '#5eead4' : '#94a3b8',"""

new_mode_style = """style={{
                        background: mi === 0 ? _bt.cardActiveBg : _bt.cardBg,
                        border: mi === 0 ? _bt.cardActiveBorder : _bt.cardBorder,
                        borderRadius:'14px',padding:'14px 12px',cursor:'pointer',
                        textAlign:'left',transition:'all 0.2s',
                        color: mi === 0 ? _bt.textAccent : _bt.textSecondary,"""

if old_mode_style in content:
    content = content.replace(old_mode_style, new_mode_style, 1)
    changes += 1
    print("3: Fixed mode button initial style to use _bt tokens")
else:
    print("3: SKIP - mode initial style not found")

# ===================================================================
# FIX MODE DOT AND DESC
# ===================================================================

old_mode_dot = """style={{width:'8px',height:'8px',borderRadius:'50%',background: mi === 0 ? '#14b8a6' : 'rgba(255,255,255,0.1)',transition:'background 0.2s',flexShrink:0}}"""

new_mode_dot = """style={{width:'8px',height:'8px',borderRadius:'50%',background: mi === 0 ? _bt.dotActive : _bt.dotInactive,transition:'background 0.2s',flexShrink:0}}"""

if old_mode_dot in content:
    content = content.replace(old_mode_dot, new_mode_dot, 1)
    changes += 1
    print("4: Fixed mode dot to use _bt tokens")
else:
    print("4: SKIP")

old_mode_desc = """<span style={{fontSize:'11px',color:'#64748b',lineHeight:1.4}}>{m.desc}</span>"""
new_mode_desc = """<span style={{fontSize:'11px',color:_bt.textMuted,lineHeight:1.4}}>{m.desc}</span>"""

if old_mode_desc in content:
    content = content.replace(old_mode_desc, new_mode_desc, 1)
    changes += 1
    print("5: Fixed mode description color")
else:
    print("5: SKIP")

# ===================================================================
# FIX QUICK TEMPLATES
# ===================================================================

old_tpl_label = """<div style={{fontSize:'12px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'8px'}}>Quick Templates</div>"""
new_tpl_label = """<div style={{fontSize:'12px',fontWeight:700,color:_bt.textSecondary,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'8px'}}>Quick Templates</div>"""

if old_tpl_label in content:
    content = content.replace(old_tpl_label, new_tpl_label, 1)
    changes += 1
    print("6: Fixed Quick Templates label")
else:
    print("6: SKIP")

old_tpl_btn = """style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'10px',padding:'6px 12px',color:'#94a3b8',fontSize:'12px',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:'5px',transition:'all 0.2s',whiteSpace:'nowrap'}}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(20,184,166,0.1)'; e.currentTarget.style.borderColor = 'rgba(20,184,166,0.3)'; e.currentTarget.style.color = '#5eead4'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#94a3b8'; }}"""

new_tpl_btn = """style={{background:_bt.cardBg,border:_bt.cardBorder,borderRadius:'10px',padding:'6px 12px',color:_bt.textSecondary,fontSize:'12px',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:'5px',transition:'all 0.2s',whiteSpace:'nowrap'}}
                      aria-label={tmpl.label + ' template'}
                      onMouseEnter={(e) => { e.currentTarget.style.background = _bt.cardActiveBg; e.currentTarget.style.borderColor = _bt.cardActiveBorder; e.currentTarget.style.color = _bt.textAccent; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = _bt.cardBg; e.currentTarget.style.borderColor = _bt.cardBorder; e.currentTarget.style.color = _bt.textSecondary; }}"""

if old_tpl_btn in content:
    content = content.replace(old_tpl_btn, new_tpl_btn, 1)
    changes += 1
    print("7: Fixed template button colors + added aria-label")
else:
    print("7: SKIP - template button not found")

# ===================================================================
# FIX CUSTOM LANGUAGE INPUT
# ===================================================================

old_custom_input = """style={{display:'none',width:'100%',boxSizing:'border-box',marginTop:'8px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(168,85,247,0.3)',borderRadius:'10px',padding:'10px 14px',color:'#e2e8f0',fontSize:'13px',fontWeight:600,outline:'none'}}"""

new_custom_input = """style={{display:'none',width:'100%',boxSizing:'border-box',marginTop:'8px',background:_bt.inputBg,border:_bt.inputBorder,borderRadius:'10px',padding:'10px 14px',color:_bt.inputText,fontSize:'13px',fontWeight:600,outline:'none'}}"""

if old_custom_input in content:
    content = content.replace(old_custom_input, new_custom_input, 1)
    changes += 1
    print("8: Fixed custom language input")
else:
    print("8: SKIP")

# ===================================================================
# FIX READING LEVEL LABEL
# ===================================================================

old_reading_label = """<div style={{fontSize:'12px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'8px'}}>Reading Level</div>"""
new_reading_label = """<div style={{fontSize:'12px',fontWeight:700,color:_bt.textSecondary,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'8px'}}>Reading Level</div>"""

if old_reading_label in content:
    content = content.replace(old_reading_label, new_reading_label, 1)
    changes += 1
    print("9: Fixed Reading Level label")
else:
    print("9: SKIP")

# ===================================================================
# FIX SETTINGS PREVIEW
# ===================================================================

old_preview = """<div style={{display:'flex',gap:'16px',marginBottom:'20px',background:'rgba(20,184,166,0.06)',border:'1px solid rgba(20,184,166,0.12)',borderRadius:'14px',padding:'14px 18px'}}>
                <div style={{flex:1,display:'flex',alignItems:'center',gap:'8px',fontSize:'13px'}}>
                  <span style={{fontSize:'16px'}}>🗣️</span>
                  <span style={{color:'#64748b'}}>Language:</span>
                  <span id="bridge-settings-preview-lang" style={{color:'#5eead4',fontWeight:700}}>{leveledTextLanguage || 'English'}</span>
                </div>
                <div style={{width:'1px',background:'rgba(255,255,255,0.08)'}} />
                <div style={{flex:1,display:'flex',alignItems:'center',gap:'8px',fontSize:'13px'}}>
                  <span style={{fontSize:'16px'}}>📚</span>
                  <span style={{color:'#64748b'}}>Grade:</span>
                  <span id="bridge-settings-preview-grade" style={{color:'#5eead4',fontWeight:700}}>{gradeLevel || '5th Grade'}</span>
                </div>
                <div style={{width:'1px',background:'rgba(255,255,255,0.08)'}} />
                <div style={{flex:1,display:'flex',alignItems:'center',gap:'8px',fontSize:'13px'}}>
                  <span style={{fontSize:'16px'}}>📡</span>
                  <span style={{color:'#64748b'}}>Session:</span>
                  <span style={{color: activeSessionCode ? '#34d399' : '#f59e0b',fontWeight:700}}>{activeSessionCode ? 'Live' : 'Preview only'}</span>
                </div>
              </div>"""

new_preview = """<div style={{display:'flex',gap:'16px',marginBottom:'20px',background:_bt.cardBg,border:_bt.cardBorder,borderRadius:'14px',padding:'14px 18px'}}>
                <div style={{flex:1,display:'flex',alignItems:'center',gap:'8px',fontSize:'13px'}}>
                  <span style={{fontSize:'16px'}}>🗣️</span>
                  <span style={{color:_bt.textMuted}}>Language:</span>
                  <span id="bridge-settings-preview-lang" style={{color:_bt.textAccent,fontWeight:700}}>{leveledTextLanguage || 'English'}</span>
                </div>
                <div style={{width:'1px',background:_bt.dotInactive}} />
                <div style={{flex:1,display:'flex',alignItems:'center',gap:'8px',fontSize:'13px'}}>
                  <span style={{fontSize:'16px'}}>📚</span>
                  <span style={{color:_bt.textMuted}}>Grade:</span>
                  <span id="bridge-settings-preview-grade" style={{color:_bt.textAccent,fontWeight:700}}>{gradeLevel || '5th Grade'}</span>
                </div>
                <div style={{width:'1px',background:_bt.dotInactive}} />
                <div style={{flex:1,display:'flex',alignItems:'center',gap:'8px',fontSize:'13px'}}>
                  <span style={{fontSize:'16px'}}>📡</span>
                  <span style={{color:_bt.textMuted}}>Session:</span>
                  <span style={{color: activeSessionCode ? '#34d399' : '#f59e0b',fontWeight:700}}>{activeSessionCode ? 'Live' : 'Preview only'}</span>
                </div>
              </div>"""

if old_preview in content:
    content = content.replace(old_preview, new_preview, 1)
    changes += 1
    print("10: Fixed settings preview section")
else:
    print("10: SKIP - settings preview not found")

# ===================================================================
# FIX BLAST PREVIEW
# ===================================================================

old_blast_bg = """style={{marginBottom:'20px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'14px',padding:'14px 16px'}}"""
new_blast_bg = """style={{marginBottom:'20px',background:_bt.cardBg,border:_bt.cardBorder,borderRadius:'14px',padding:'14px 16px'}}"""

if old_blast_bg in content:
    content = content.replace(old_blast_bg, new_blast_bg, 1)
    changes += 1
    print("11: Fixed blast preview background")
else:
    print("11: SKIP")

old_blast_label = """<div style={{fontSize:'12px',fontWeight:700,color:'#5eead4',textTransform:'uppercase',letterSpacing:'0.08em',display:'flex',alignItems:'center',gap:'6px'}}>"""
new_blast_label = """<div style={{fontSize:'12px',fontWeight:700,color:_bt.textAccent,textTransform:'uppercase',letterSpacing:'0.08em',display:'flex',alignItems:'center',gap:'6px'}}>"""

if old_blast_label in content:
    content = content.replace(old_blast_label, new_blast_label, 1)
    changes += 1
    print("12: Fixed blast label color")
else:
    print("12: SKIP")

old_blast_sub = """<span style={{fontSize:'11px',color:'#64748b'}}>Each device generates in its group's language</span>"""
new_blast_sub = """<span style={{fontSize:'11px',color:_bt.textMuted}}>Each device generates in its group's language</span>"""

if old_blast_sub in content:
    content = content.replace(old_blast_sub, new_blast_sub, 1)
    changes += 1
    print("13: Fixed blast sub-label")
else:
    print("13: SKIP")

# ===================================================================
# FIX AUDIO-FIRST OPTION
# ===================================================================

old_audio_wrap = """style={{display:'flex',alignItems:'center',gap:'8px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'10px 14px',cursor:'pointer',flex:1,minWidth:'200px'}}"""
new_audio_wrap = """style={{display:'flex',alignItems:'center',gap:'8px',background:_bt.cardBg,border:_bt.cardBorder,borderRadius:'10px',padding:'10px 14px',cursor:'pointer',flex:1,minWidth:'200px'}}"""

if old_audio_wrap in content:
    content = content.replace(old_audio_wrap, new_audio_wrap, 1)
    changes += 1
    print("14: Fixed Audio-First wrapper")
else:
    print("14: SKIP")

old_audio_label = """<div style={{fontSize:'13px',fontWeight:700,color:'#e2e8f0'}}>🔊 Audio-First Delivery</div>"""
new_audio_label = """<div style={{fontSize:'13px',fontWeight:700,color:_bt.textPrimary}}>🔊 Audio-First Delivery</div>"""

if old_audio_label in content:
    content = content.replace(old_audio_label, new_audio_label, 1)
    changes += 1
    print("15: Fixed Audio-First label")
else:
    print("15: SKIP")

old_audio_desc = """<div style={{fontSize:'11px',color:'#64748b'}}>Auto-play TTS when students receive</div>"""
new_audio_desc = """<div style={{fontSize:'11px',color:_bt.textMuted}}>Auto-play TTS when students receive</div>"""

if old_audio_desc in content:
    content = content.replace(old_audio_desc, new_audio_desc, 1)
    changes += 1
    print("16: Fixed Audio-First description")
else:
    print("16: SKIP")

# ===================================================================
# FIX MESSAGE HISTORY
# ===================================================================

old_hist_btn = """style={{
                      width:'100%',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',
                      borderRadius:'12px',padding:'12px 16px',color:'#94a3b8',fontSize:'13px',fontWeight:700,"""

new_hist_btn = """style={{
                      width:'100%',background:_bt.cardBg,border:_bt.cardBorder,
                      borderRadius:'12px',padding:'12px 16px',color:_bt.textSecondary,fontSize:'13px',fontWeight:700,"""

if old_hist_btn in content:
    content = content.replace(old_hist_btn, new_hist_btn, 1)
    changes += 1
    print("17: Fixed history toggle button")
else:
    print("17: SKIP")

old_hist_list = """border:'1px solid rgba(255,255,255,0.06)',borderRadius:'14px',
                      background:'rgba(0,0,0,0.2)'"""

new_hist_list = """border:_bt.cardBorder,borderRadius:'14px',
                      background:_bt.cardBg"""

if old_hist_list in content:
    content = content.replace(old_hist_list, new_hist_list, 1)
    changes += 1
    print("18: Fixed history list background")
else:
    print("18: SKIP")

old_hist_text = """style={{fontSize:'13px',fontWeight:600,color:'#e2e8f0',marginBottom:'4px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}"""
new_hist_text = """style={{fontSize:'13px',fontWeight:600,color:_bt.textPrimary,marginBottom:'4px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}"""

if old_hist_text in content:
    content = content.replace(old_hist_text, new_hist_text, 1)
    changes += 1
    print("19: Fixed history item text color")
else:
    print("19: SKIP")

# ===================================================================
# FIX ATTACH IMAGE BUG
# ===================================================================

old_attach = """onClick={() => {
                    const existingImages = document.querySelectorAll('[data-generated-image]');
                    if (existingImages.length === 0) { addToast('No generated images found. Generate a visual first.', 'warning'); return; }
                    const lastImg = existingImages[existingImages.length - 1];
                    const src = lastImg?.src || lastImg?.getAttribute('data-generated-image');
                    if (src) { window.__bridgeAttachedImage = src; document.getElementById('bridge-attach-image-btn').textContent = '✅ Image Attached'; addToast('Image attached to bridge message', 'success'); }
                  }}"""

new_attach = """onClick={() => {
                    // Try multiple sources for generated images
                    let src = null;
                    // 1. Check generatedContent state (React-managed)
                    if (generatedContent?.imageUrl) { src = generatedContent.imageUrl; }
                    // 2. Check for any displayed images with data URI source
                    if (!src) {
                      const allImgs = document.querySelectorAll('img[src^="data:image"]');
                      if (allImgs.length > 0) src = allImgs[allImgs.length - 1].src;
                    }
                    // 3. Check for Imagen-generated images via class
                    if (!src) {
                      const genImgs = document.querySelectorAll('.generated-image, [data-generated-image], img[alt*="Generated"], img[alt*="Illustration"]');
                      if (genImgs.length > 0) src = genImgs[genImgs.length - 1].src || genImgs[genImgs.length - 1].getAttribute('data-generated-image');
                    }
                    if (!src) { addToast('No generated images found. Generate a visual first using Text Adaptation.', 'warning'); return; }
                    window.__bridgeAttachedImage = src;
                    const btn = document.getElementById('bridge-attach-image-btn');
                    if (btn) btn.textContent = '✅ Image Attached';
                    addToast('Image attached to bridge message', 'success');
                  }}"""

if old_attach in content:
    content = content.replace(old_attach, new_attach, 1)
    changes += 1
    print("20: Fixed attach image bug — now checks generatedContent, data URIs, and class selectors")
else:
    print("20: SKIP - attach image handler not found")

# ===================================================================
# ADD ACCESSIBILITY: role="dialog", aria-modal, aria-label on panels
# ===================================================================

# Send panel overlay
old_send_overlay = """style={{position:'fixed',inset:0,zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',background:_bt.overlay,backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)'}}
          onClick={(e) => { if (e.target === e.currentTarget) setBridgeSendOpen(false); }}"""

new_send_overlay = """role="dialog" aria-modal="true" aria-label="Bridge Mode Send Panel"
          style={{position:'fixed',inset:0,zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',background:_bt.overlay,backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)'}}
          onClick={(e) => { if (e.target === e.currentTarget) setBridgeSendOpen(false); }}
          onKeyDown={(e) => { if (e.key === 'Escape') setBridgeSendOpen(false); }}"""

if old_send_overlay in content:
    content = content.replace(old_send_overlay, new_send_overlay, 1)
    changes += 1
    print("21: Added role=dialog, aria-modal, Escape handler to send panel")
else:
    print("21: SKIP - send overlay not found")

# Display panel overlay
old_disp_overlay = """style={{position:'fixed',inset:0,zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',background: bridgeProjectionMode ? 'rgba(0,0,0,0.95)' : _dt.overlay,backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',transition:'background 0.3s'}}
          onClick={(e) => { if (e.target === e.currentTarget) setBridgeMessage(null); }}"""

new_disp_overlay = """role="dialog" aria-modal="true" aria-label="Bridge Message Display"
          style={{position:'fixed',inset:0,zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',background: bridgeProjectionMode ? 'rgba(0,0,0,0.95)' : _dt.overlay,backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',transition:'background 0.3s'}}
          onClick={(e) => { if (e.target === e.currentTarget) setBridgeMessage(null); }}
          onKeyDown={(e) => { if (e.key === 'Escape') setBridgeMessage(null); }}"""

if old_disp_overlay in content:
    content = content.replace(old_disp_overlay, new_disp_overlay, 1)
    changes += 1
    print("22: Added role=dialog, aria-modal, Escape handler to display panel")
else:
    print("22: SKIP - display overlay not found")

# ===================================================================
# ADD ARIA LABELS TO DROPDOWNS
# ===================================================================

old_target_sel = """id="bridge-target-selector"
                    defaultValue="all"
                    onChange={(e) => { window.__bridgeTarget = e.target.value; }}"""

new_target_sel = """id="bridge-target-selector"
                    aria-label="Target group selector"
                    defaultValue="all"
                    onChange={(e) => { window.__bridgeTarget = e.target.value; }}"""

if old_target_sel in content:
    content = content.replace(old_target_sel, new_target_sel, 1)
    changes += 1
    print("23a: Added aria-label to target selector")
else:
    print("23a: SKIP")

old_lang_sel = """id="bridge-language-selector"
                    defaultValue={leveledTextLanguage || 'English'}"""

new_lang_sel = """id="bridge-language-selector"
                    aria-label="Target language selector"
                    defaultValue={leveledTextLanguage || 'English'}"""

if old_lang_sel in content:
    content = content.replace(old_lang_sel, new_lang_sel, 1)
    changes += 1
    print("23b: Added aria-label to language selector")
else:
    print("23b: SKIP")

old_grade_sel = """id="bridge-grade-selector"
                    defaultValue={gradeLevel || '5th Grade'}"""

new_grade_sel = """id="bridge-grade-selector"
                    aria-label="Grade level selector"
                    defaultValue={gradeLevel || '5th Grade'}"""

if old_grade_sel in content:
    content = content.replace(old_grade_sel, new_grade_sel, 1)
    changes += 1
    print("23c: Added aria-label to grade selector")
else:
    print("23c: SKIP")

# ===================================================================
# ADD ARIA LABELS TO MODE BUTTONS
# ===================================================================

old_mode_btn = """<button
                      key={m.id}
                      data-bridge-mode={m.id}"""

new_mode_btn = """<button
                      key={m.id}
                      aria-label={m.title + ': ' + m.desc}
                      data-bridge-mode={m.id}"""

if old_mode_btn in content:
    content = content.replace(old_mode_btn, new_mode_btn, 1)
    changes += 1
    print("24: Added aria-label to mode buttons")
else:
    print("24: SKIP")

# ===================================================================
# ADD ARIA LABELS TO HELPER BUTTONS
# ===================================================================

old_use_text = """style={{background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:'10px',padding:'8px 14px',color:'#a5b4fc',fontSize:'12px',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',transition:'all 0.2s'}}
                ><span>📎</span> Use Current Text</button>"""

new_use_text = """aria-label="Use current generated text"
                  style={{background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:'10px',padding:'8px 14px',color:'#a5b4fc',fontSize:'12px',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',transition:'all 0.2s'}}
                ><span>📎</span> Use Current Text</button>"""

if old_use_text in content:
    content = content.replace(old_use_text, new_use_text, 1)
    changes += 1
    print("25a: Added aria-label to Use Current Text")
else:
    print("25a: SKIP")

old_attach_style = """style={{background:'rgba(168,85,247,0.1)',border:'1px solid rgba(168,85,247,0.25)',borderRadius:'10px',padding:'8px 14px',color:'#c084fc',fontSize:'12px',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',transition:'all 0.2s'}}
                ><span>🖼️</span> Attach Image</button>"""

new_attach_style = """aria-label="Attach a generated image"
                  style={{background:'rgba(168,85,247,0.1)',border:'1px solid rgba(168,85,247,0.25)',borderRadius:'10px',padding:'8px 14px',color:'#c084fc',fontSize:'12px',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',transition:'all 0.2s'}}
                ><span>🖼️</span> Attach Image</button>"""

if old_attach_style in content:
    content = content.replace(old_attach_style, new_attach_style, 1)
    changes += 1
    print("25b: Added aria-label to Attach Image")
else:
    print("25b: SKIP")

# ===================================================================
# ADD ARIA LABEL TO SEND BUTTON  
# ===================================================================

old_send_btn = """id="bridge-send-button"
                disabled={bridgeSending}"""

new_send_btn = """id="bridge-send-button"
                aria-label={bridgeSending ? 'Generating content...' : 'Generate and send bridge message'}
                disabled={bridgeSending}"""

if old_send_btn in content:
    content = content.replace(old_send_btn, new_send_btn, 1)
    changes += 1
    print("26: Added aria-label to send button")
else:
    print("26: SKIP")

# ===================================================================
# TEXTAREA BLUR — use _bt token 
# ===================================================================

old_blur = """onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}"""
new_blur = """onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = 'none'; }}"""

if old_blur in content:
    content = content.replace(old_blur, new_blur, 1)
    changes += 1
    print("27: Fixed textarea blur to reset to default border")
else:
    print("27: SKIP")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied for audit fixes.")
