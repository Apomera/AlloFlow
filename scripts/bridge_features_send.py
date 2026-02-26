#!/usr/bin/env python3
"""
Bridge Mode Feature Expansion — Send Panel Enhancements:
1. Quick Templates row above textarea
2. Simplification Mode (4th mode button)
3. Pull from Generated Content button 
4. Attach Image button
5. Multi-Language Blast checkbox
6. Audio-First Delivery toggle
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# ===================================================================
# 1. Add Quick Templates above the textarea
# ===================================================================

old_textarea_section = """              {/* Textarea */}
              <div style={{position:'relative',marginBottom:'20px'}}>
                <textarea"""

new_textarea_section = """              {/* Quick Templates */}
              <div style={{marginBottom:'14px'}}>
                <div style={{fontSize:'12px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'8px'}}>Quick Templates</div>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                  {[
                    {icon:'\U0001f4d6',label:'Vocabulary',prompt:'Introduce and explain the following vocabulary word to students: '},
                    {icon:'\U0001f3af',label:'Objective',prompt:'Today\\'s learning objective is: '},
                    {icon:'\U0001f4cb',label:'Instructions',prompt:'Instructions for this activity: '},
                    {icon:'\U0001f4ac',label:'Discussion',prompt:'Think about and discuss with a partner: '},
                    {icon:'\U0001f50d',label:'Review',prompt:'Let\\'s review what we learned about: '},
                    {icon:'\u2757',label:'Reminder',prompt:'Important reminder for class: '}
                  ].map((tmpl, ti) => (
                    <button
                      key={ti}
                      onClick={() => {
                        const ta = document.getElementById('bridge-send-textarea');
                        if (ta) { ta.value = tmpl.prompt; ta.focus(); ta.setSelectionRange(tmpl.prompt.length, tmpl.prompt.length); }
                        const counter = document.getElementById('bridge-char-count');
                        if (counter) counter.textContent = tmpl.prompt.length + ' chars';
                      }}
                      style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'10px',padding:'6px 12px',color:'#94a3b8',fontSize:'12px',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:'5px',transition:'all 0.2s',whiteSpace:'nowrap'}}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(20,184,166,0.1)'; e.currentTarget.style.borderColor = 'rgba(20,184,166,0.3)'; e.currentTarget.style.color = '#5eead4'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#94a3b8'; }}
                    ><span>{tmpl.icon}</span> {tmpl.label}</button>
                  ))}
                </div>
              </div>

              {/* Textarea with helper buttons */}
              <div style={{position:'relative',marginBottom:'12px'}}>
                <textarea"""

if old_textarea_section in content:
    content = content.replace(old_textarea_section, new_textarea_section, 1)
    changes += 1
    print("1: Added Quick Templates row above textarea")
else:
    print("1: SKIP - textarea section not found")

# ===================================================================
# 2. Add Pull from Content + Attach Image buttons below textarea char count
# ===================================================================

old_char_count_close = """                <span id="bridge-char-count" style={{position:'absolute',bottom:'10px',right:'16px',fontSize:'11px',color:'#475569',pointerEvents:'none'}}>0 chars</span>
              </div>"""

new_char_count_close = """                <span id="bridge-char-count" style={{position:'absolute',bottom:'10px',right:'16px',fontSize:'11px',color:'#475569',pointerEvents:'none'}}>0 chars</span>
              </div>

              {/* Helper Actions */}
              <div style={{display:'flex',gap:'8px',marginBottom:'20px',flexWrap:'wrap'}}>
                <button
                  onClick={() => {
                    const ta = document.getElementById('bridge-send-textarea');
                    if (!ta) return;
                    const src = generatedContent?.data;
                    if (!src) { addToast('No generated content available. Create content first in Text Adaptation.', 'warning'); return; }
                    let text = '';
                    if (typeof src === 'string') text = src;
                    else if (Array.isArray(src)) text = src.map(item => item.term ? `${item.term}: ${item.definition || ''}` : JSON.stringify(item)).join('\\n');
                    else if (src.main) text = src.main;
                    else if (src.text) text = src.text;
                    else text = JSON.stringify(src).substring(0, 500);
                    if (text) { ta.value = text; const counter = document.getElementById('bridge-char-count'); if (counter) counter.textContent = text.length + ' chars'; addToast('Loaded current generated content', 'info'); }
                  }}
                  style={{background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:'10px',padding:'8px 14px',color:'#a5b4fc',fontSize:'12px',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',transition:'all 0.2s'}}
                ><span>\U0001f4ce</span> Use Current Text</button>

                <button
                  id="bridge-attach-image-btn"
                  onClick={() => {
                    const existingImages = document.querySelectorAll('[data-generated-image]');
                    if (existingImages.length === 0) { addToast('No generated images found. Generate a visual first.', 'warning'); return; }
                    const lastImg = existingImages[existingImages.length - 1];
                    const src = lastImg?.src || lastImg?.getAttribute('data-generated-image');
                    if (src) { window.__bridgeAttachedImage = src; document.getElementById('bridge-attach-image-btn').textContent = '\u2705 Image Attached'; addToast('Image attached to bridge message', 'success'); }
                  }}
                  style={{background:'rgba(168,85,247,0.1)',border:'1px solid rgba(168,85,247,0.25)',borderRadius:'10px',padding:'8px 14px',color:'#c084fc',fontSize:'12px',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',transition:'all 0.2s'}}
                ><span>\U0001f5bc\ufe0f</span> Attach Image</button>
              </div>"""

if old_char_count_close in content:
    content = content.replace(old_char_count_close, new_char_count_close, 1)
    changes += 1
    print("2: Added Pull from Content + Attach Image buttons")
else:
    print("2: SKIP - char count close pattern not found")

# ===================================================================
# 3. Add Simplification Mode (4th mode button)
# ===================================================================

old_modes = """                  {[
                    {id:'explain', icon:'\U0001f4dd', title:'Explain', desc:'AI explains the concept bilingually'},
                    {id:'translate', icon:'\U0001f310', title:'Translate', desc:'Direct translation to target language'},
                    {id:'visual', icon:'\U0001f5bc\ufe0f', title:'Visual + Explain', desc:'Explanation with AI-generated visual'}
                  ].map((m, mi) => ("""

new_modes = """                <div id="bridge-mode-selector" style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:'10px'}}>
                  {[
                    {id:'explain', icon:'\U0001f4dd', title:'Explain', desc:'AI explains the concept bilingually'},
                    {id:'translate', icon:'\U0001f310', title:'Translate', desc:'Direct translation to target language'},
                    {id:'visual', icon:'\U0001f5bc\ufe0f', title:'Visual + Explain', desc:'Explanation with AI-generated visual'},
                    {id:'simplify', icon:'\u2728', title:'Simplify', desc:'Rewrite at selected grade reading level'}
                  ].map((m, mi) => ("""

# But we also need to remove the old grid wrapper
old_grid_wrapper = """                <div id="bridge-mode-selector" style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:'10px'}}>
                  {[
                    {id:'explain', icon:'\U0001f4dd', title:'Explain', desc:'AI explains the concept bilingually'},
                    {id:'translate', icon:'\U0001f310', title:'Translate', desc:'Direct translation to target language'},
                    {id:'visual', icon:'\U0001f5bc\ufe0f', title:'Visual + Explain', desc:'Explanation with AI-generated visual'}
                  ].map((m, mi) => ("""

if old_grid_wrapper in content:
    content = content.replace(old_grid_wrapper, new_modes, 1)
    changes += 1
    print("3: Added Simplification Mode (4th button, now 4-column grid)")
else:
    print("3: SKIP - mode grid wrapper not found")

# ===================================================================
# 4. Add Multi-Language and Audio-First toggles (below settings preview)
# ===================================================================

old_send_btn_comment = """              {/* Message History */}"""

new_toggles_and_history = """              {/* Advanced Options */}
              <div style={{display:'flex',gap:'12px',marginBottom:'20px',flexWrap:'wrap'}}>
                <label style={{display:'flex',alignItems:'center',gap:'8px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'10px 14px',cursor:'pointer',flex:1,minWidth:'200px'}}>
                  <input
                    type="checkbox"
                    id="bridge-autoplay-toggle"
                    onChange={(e) => { window.__bridgeAutoplay = e.target.checked; }}
                    style={{accentColor:'#14b8a6',width:'16px',height:'16px',cursor:'pointer'}}
                  />
                  <div>
                    <div style={{fontSize:'13px',fontWeight:700,color:'#e2e8f0'}}>\U0001f50a Audio-First Delivery</div>
                    <div style={{fontSize:'11px',color:'#64748b'}}>Auto-play TTS when students receive</div>
                  </div>
                </label>
              </div>

              {/* Message History */}"""

if old_send_btn_comment in content:
    content = content.replace(old_send_btn_comment, new_toggles_and_history, 1)
    changes += 1
    print("4: Added Audio-First Delivery toggle")
else:
    print("4: SKIP - message history comment not found")

# ===================================================================
# 5. Update the prompt builder to handle 'simplify' mode
# ===================================================================

old_prompt_builder = """                    const prompt = selectedMode === 'translate'
                      ? `Translate the following text to ${targetLang}. Keep it at ${gradeLevel} reading level. Return ONLY the translation, nothing else:\\n\\n${bridgeSendText}`
                      : `Explain the following concept at ${gradeLevel} reading level. Also provide a translation in ${targetLang}. Format your response as JSON: {"english": "explanation in English", "translated": "explanation in ${targetLang}", "terms": ["key", "vocabulary", "terms"]}\\n\\nConcept: ${bridgeSendText}`;"""

new_prompt_builder = """                    let prompt;
                    if (selectedMode === 'translate') {
                      prompt = `Translate the following text to ${targetLang}. Keep it at ${gradeLevel} reading level. Return ONLY the translation, nothing else:\\n\\n${bridgeSendText}`;
                    } else if (selectedMode === 'simplify') {
                      prompt = `Rewrite the following text at a ${gradeLevel} reading level. Simplify vocabulary and sentence structure while preserving the key meaning. Also provide a translation in ${targetLang}. Format your response as JSON: {"english": "simplified version in English", "translated": "simplified version in ${targetLang}", "terms": ["simplified", "key", "terms"]}\\n\\nOriginal text: ${bridgeSendText}`;
                    } else {
                      prompt = `Explain the following concept at ${gradeLevel} reading level. Also provide a translation in ${targetLang}. Format your response as JSON: {"english": "explanation in English", "translated": "explanation in ${targetLang}", "terms": ["key", "vocabulary", "terms"]}\\n\\nConcept: ${bridgeSendText}`;
                    }"""

if old_prompt_builder in content:
    content = content.replace(old_prompt_builder, new_prompt_builder, 1)
    changes += 1
    print("5: Updated prompt builder to handle 'simplify' mode")
else:
    print("5: SKIP - prompt builder pattern not found")

# ===================================================================
# 6. Update setBridgeMessage to include autoplay and attached image
# ===================================================================

old_set_bridge = """                    setBridgeMessage({
                      english: parsed.english || bridgeSendText,
                      translated: parsed.translated || '',
                      language: targetLang,
                      languageName: langNames[targetLang] || ('\U0001f310 ' + targetLang),
                      imageUrl: imageUrl,
                      terms: parsed.terms || [],
                      timestamp: Date.now()
                    });"""

new_set_bridge = """                    setBridgeMessage({
                      english: parsed.english || bridgeSendText,
                      translated: parsed.translated || '',
                      language: targetLang,
                      languageName: langNames[targetLang] || ('\U0001f310 ' + targetLang),
                      imageUrl: imageUrl || window.__bridgeAttachedImage || null,
                      terms: parsed.terms || [],
                      timestamp: Date.now(),
                      autoplay: !!window.__bridgeAutoplay,
                      mode: selectedMode
                    });"""

if old_set_bridge in content:
    content = content.replace(old_set_bridge, new_set_bridge, 1)
    changes += 1
    print("6: Updated setBridgeMessage with autoplay and attached image")
else:
    print("6: SKIP - setBridgeMessage pattern not found")

# ===================================================================
# 7. Update history push to include mode
# ===================================================================

old_history_push = """                    setBridgeHistory(prev => [{
                      english: parsed.english || bridgeSendText,
                      translated: parsed.translated || '',
                      language: targetLang,
                      languageName: langNames[targetLang] || ('\U0001f310 ' + targetLang),
                      imageUrl: imageUrl,
                      terms: parsed.terms || [],
                      mode: selectedMode,
                      originalPrompt: bridgeSendText,
                      timestamp: Date.now()
                    }, ...prev].slice(0, 20));"""

new_history_push = """                    // Clean up attached image after use
                    window.__bridgeAttachedImage = null;
                    const attachBtn = document.getElementById('bridge-attach-image-btn');
                    if (attachBtn) attachBtn.textContent = '\U0001f5bc\ufe0f Attach Image';

                    setBridgeHistory(prev => [{
                      english: parsed.english || bridgeSendText,
                      translated: parsed.translated || '',
                      language: targetLang,
                      languageName: langNames[targetLang] || ('\U0001f310 ' + targetLang),
                      imageUrl: imageUrl || window.__bridgeAttachedImage || null,
                      terms: parsed.terms || [],
                      mode: selectedMode,
                      originalPrompt: bridgeSendText,
                      timestamp: Date.now()
                    }, ...prev].slice(0, 20));"""

if old_history_push in content:
    content = content.replace(old_history_push, new_history_push, 1)
    changes += 1
    print("7: Updated history push with cleanup")
else:
    print("7: SKIP - history push pattern not found")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied to send panel.")
