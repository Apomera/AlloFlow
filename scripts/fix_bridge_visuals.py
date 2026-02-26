"""
Bridge Mode Visual Explanation Enhancement
===========================================
1. Visual mode prompt now requests term definitions + image prompts
2. Generates per-term images using Imagen
3. Terms rendered as rich cards with definitions + images
4. Adds animated generation indicator overlay
5. Updates copy/print/save flows to handle object-style terms
"""

import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

original_len = len(content)
fixes = []

# =============================================================================
# FIX 1: Enhance visual mode prompt to return term definitions
# =============================================================================
# The generic 'explain' prompt at the else branch doesn't ask for definitions.
# For visual mode specifically, we want definitions per term.

OLD_PROMPT_BLOCK = '''                    } else {
                      prompt = `Explain the following concept at ${gradeLevel} reading level. Also provide a translation in ${targetLang}. Format your response as JSON: {"english": "explanation in English", "translated": "explanation in ${targetLang}", "terms": ["key", "vocabulary", "terms"]}\\n\\nConcept: ${bridgeSendText}`;
                    }'''

NEW_PROMPT_BLOCK = '''                    } else if (selectedMode === 'visual') {
                      prompt = `Explain the following concept at ${gradeLevel} reading level with visual vocabulary support. Also provide a translation in ${targetLang}. For each key term, include a simple child-friendly definition AND a short image description prompt. Format your response as JSON: {"english": "explanation in English", "translated": "explanation in ${targetLang}", "terms": [{"word": "term1", "definition": "simple definition", "imagePrompt": "short visual description for child-friendly illustration"}, {"word": "term2", "definition": "simple definition", "imagePrompt": "short visual description"}]}\\n\\nConcept: ${bridgeSendText}`;
                    } else {
                      prompt = `Explain the following concept at ${gradeLevel} reading level. Also provide a translation in ${targetLang}. Format your response as JSON: {"english": "explanation in English", "translated": "explanation in ${targetLang}", "terms": ["key", "vocabulary", "terms"]}\\n\\nConcept: ${bridgeSendText}`;
                    }'''

if OLD_PROMPT_BLOCK in content:
    content = content.replace(OLD_PROMPT_BLOCK, NEW_PROMPT_BLOCK)
    fixes.append("FIX 1: Added visual mode prompt with term definitions + image prompts")
else:
    print("WARNING: FIX 1 (prompt block) not found!")

# =============================================================================
# FIX 2: After main image gen, generate per-term images for visual mode
# =============================================================================

OLD_IMAGE_BLOCK = """                    let imageUrl = null;
                    if (selectedMode === 'visual') {
                      try {
                        imageUrl = await callGeminiImageEdit(`Educational illustration: ${bridgeSendText}. Clear, simple, child-friendly diagram suitable for ${gradeLevel} students.`);
                      } catch(e) { warnLog('Bridge visual generation failed', e); }
                    }"""

NEW_IMAGE_BLOCK = """                    let imageUrl = null;
                    if (selectedMode === 'visual') {
                      try {
                        imageUrl = await callGeminiImageEdit(`Educational illustration: ${bridgeSendText}. Clear, simple, child-friendly diagram suitable for ${gradeLevel} students.`);
                      } catch(e) { warnLog('Bridge visual generation failed', e); }
                      // Generate per-term images (limit to 3 to avoid rate limits)
                      if (parsed.terms && Array.isArray(parsed.terms)) {
                        const termObjs = parsed.terms.filter(t => t && typeof t === 'object' && t.imagePrompt);
                        const toGenerate = termObjs.slice(0, 3);
                        for (const termObj of toGenerate) {
                          try {
                            termObj.imageUrl = await callGeminiImageEdit(`Simple child-friendly illustration of: ${termObj.imagePrompt}. Clean, colorful, educational style on white background.`);
                          } catch(e) { warnLog('Bridge term image failed:', termObj.word, e); }
                        }
                      }
                    }"""

if OLD_IMAGE_BLOCK in content:
    content = content.replace(OLD_IMAGE_BLOCK, NEW_IMAGE_BLOCK)
    fixes.append("FIX 2: Added per-term image generation (max 3 terms)")
else:
    print("WARNING: FIX 2 (image block) not found!")

# =============================================================================
# FIX 3: Replace the simple term pill badges with rich visual term cards
# =============================================================================

OLD_TERMS_RENDER = """              {/* Key Terms */}
              {bridgeMessage.terms && bridgeMessage.terms.length > 0 && (
                <div style={{marginBottom:'20px'}}>
                  <div style={{fontSize:'12px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'10px'}}>📖 Key Vocabulary</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
                    {bridgeMessage.terms.map((term, ti) => (
                      <span key={ti} style={{
                        background: bridgeTermsSaved.includes(term) ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.12)',
                        color: bridgeTermsSaved.includes(term) ? '#86efac' : '#a5b4fc',
                        border: '1px solid ' + (bridgeTermsSaved.includes(term) ? 'rgba(34,197,94,0.25)' : 'rgba(99,102,241,0.2)'),
                        padding:'6px 12px',borderRadius:'10px',fontSize:'13px',fontWeight:600,
                        display:'inline-flex',alignItems:'center',gap:'8px',transition:'all 0.2s'
                      }}>
                        {term}
                        {!bridgeTermsSaved.includes(term) ? (
                          <button onClick={async (e) => {
                            e.stopPropagation();
                            try { await handleQuickAddGlossary(term); setBridgeTermsSaved(prev => [...prev, term]); addToast(`Saved "${term}" to glossary`, 'success'); }
                            catch(err) { warnLog('Bridge term save failed:', err); }
                          }} style={{background:'none',border:'1px solid rgba(165,180,252,0.3)',color:'#a5b4fc',padding:'2px 8px',borderRadius:'8px',fontSize:'11px',cursor:'pointer',fontWeight:700}}>+ Save</button>
                        ) : (
                          <span style={{fontSize:'12px',opacity:0.8}}>✓</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}"""

NEW_TERMS_RENDER = """              {/* Key Terms */}
              {bridgeMessage.terms && bridgeMessage.terms.length > 0 && (
                <div style={{marginBottom:'20px'}}>
                  <div style={{fontSize:'12px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'10px'}}>📖 Key Vocabulary</div>
                  <div style={{display:'grid',gridTemplateColumns: bridgeMessage.terms.some(t => t && typeof t === 'object' && t.definition) ? 'repeat(auto-fill, minmax(200px, 1fr))' : 'none',gap: bridgeMessage.terms.some(t => t && typeof t === 'object' && t.definition) ? '12px' : '8px',flexWrap:'wrap',flexDirection:'row'}}>
                    {bridgeMessage.terms.map((termRaw, ti) => {
                      const isObj = termRaw && typeof termRaw === 'object';
                      const word = isObj ? termRaw.word : termRaw;
                      const def = isObj ? termRaw.definition : null;
                      const termImg = isObj ? termRaw.imageUrl : null;
                      const isSaved = bridgeTermsSaved.includes(word);
                      if (def || termImg) {
                        return (
                          <div key={ti} style={{
                            background: isSaved ? 'rgba(34,197,94,0.08)' : 'rgba(99,102,241,0.06)',
                            border: '1px solid ' + (isSaved ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.15)'),
                            borderRadius:'14px',padding:'14px',transition:'all 0.2s'
                          }}>
                            {termImg && <img src={termImg} alt={word} style={{width:'100%',height:'100px',objectFit:'contain',borderRadius:'10px',marginBottom:'10px',background:'rgba(0,0,0,0.15)'}} />}
                            <div style={{fontSize:'14px',fontWeight:700,color: isSaved ? '#86efac' : '#a5b4fc',marginBottom:'6px',display:'flex',alignItems:'center',gap:'6px'}}>
                              {word}
                              {isSaved && <span style={{fontSize:'11px'}}>✓</span>}
                            </div>
                            {def && <div style={{fontSize:'12px',color:_dt.textSecondary,lineHeight:1.5,marginBottom:'8px'}}>{def}</div>}
                            {!isSaved && (
                              <button onClick={async (e) => {
                                e.stopPropagation();
                                try { await handleQuickAddGlossary(word); setBridgeTermsSaved(prev => [...prev, word]); addToast(`Saved "${word}" to glossary`, 'success'); }
                                catch(err) { warnLog('Bridge term save failed:', err); }
                              }} style={{background:'rgba(99,102,241,0.12)',border:'1px solid rgba(99,102,241,0.2)',color:'#a5b4fc',padding:'4px 12px',borderRadius:'8px',fontSize:'11px',cursor:'pointer',fontWeight:700,width:'100%',transition:'all 0.2s'}}>+ Save to Glossary</button>
                            )}
                          </div>
                        );
                      }
                      return (
                        <span key={ti} style={{
                          background: isSaved ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.12)',
                          color: isSaved ? '#86efac' : '#a5b4fc',
                          border: '1px solid ' + (isSaved ? 'rgba(34,197,94,0.25)' : 'rgba(99,102,241,0.2)'),
                          padding:'6px 12px',borderRadius:'10px',fontSize:'13px',fontWeight:600,
                          display:'inline-flex',alignItems:'center',gap:'8px',transition:'all 0.2s'
                        }}>
                          {word}
                          {!isSaved ? (
                            <button onClick={async (e) => {
                              e.stopPropagation();
                              try { await handleQuickAddGlossary(word); setBridgeTermsSaved(prev => [...prev, word]); addToast(`Saved "${word}" to glossary`, 'success'); }
                              catch(err) { warnLog('Bridge term save failed:', err); }
                            }} style={{background:'none',border:'1px solid rgba(165,180,252,0.3)',color:'#a5b4fc',padding:'2px 8px',borderRadius:'8px',fontSize:'11px',cursor:'pointer',fontWeight:700}}>+ Save</button>
                          ) : (
                            <span style={{fontSize:'12px',opacity:0.8}}>✓</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}"""

if OLD_TERMS_RENDER in content:
    content = content.replace(OLD_TERMS_RENDER, NEW_TERMS_RENDER)
    fixes.append("FIX 3: Enhanced terms rendering with rich visual cards (definitions + images)")
else:
    print("WARNING: FIX 3 (terms render) not found!")

# =============================================================================
# FIX 4: Update "Save All Terms" button to handle object-style terms
# =============================================================================

OLD_SAVE_ALL = """                    disabled={!bridgeMessage.terms || bridgeMessage.terms.every(t2 => bridgeTermsSaved.includes(t2))}
                    onClick={async () => {
                      const unsaved = bridgeMessage.terms.filter(t2 => !bridgeTermsSaved.includes(t2));
                      if (unsaved.length === 0) return;
                      addToast(`Saving ${unsaved.length} terms...`, 'info');
                      for (const term of unsaved) {
                        try { await handleQuickAddGlossary(term); setBridgeTermsSaved(prev => [...prev, term]); }
                        catch(err) { warnLog('Bridge term save failed:', term, err); }
                      }
                      addToast('All terms saved to glossary!', 'success');
                    }}"""

NEW_SAVE_ALL = """                    disabled={!bridgeMessage.terms || bridgeMessage.terms.every(t2 => bridgeTermsSaved.includes(typeof t2 === 'object' ? t2.word : t2))}
                    onClick={async () => {
                      const unsaved = bridgeMessage.terms.filter(t2 => !bridgeTermsSaved.includes(typeof t2 === 'object' ? t2.word : t2));
                      if (unsaved.length === 0) return;
                      addToast(`Saving ${unsaved.length} terms...`, 'info');
                      for (const term of unsaved) {
                        const word = typeof term === 'object' ? term.word : term;
                        try { await handleQuickAddGlossary(word); setBridgeTermsSaved(prev => [...prev, word]); }
                        catch(err) { warnLog('Bridge term save failed:', word, err); }
                      }
                      addToast('All terms saved to glossary!', 'success');
                    }}"""

if OLD_SAVE_ALL in content:
    content = content.replace(OLD_SAVE_ALL, NEW_SAVE_ALL)
    fixes.append("FIX 4: Updated Save All Terms to handle object-style terms")
else:
    print("WARNING: FIX 4 (save all) not found!")

# =============================================================================
# FIX 5: Update Copy button to handle object-style terms
# =============================================================================

OLD_COPY_TERMS = """bridgeMessage.terms?.length ? '📖 Key Terms: ' + bridgeMessage.terms.join(', ') : ''"""

NEW_COPY_TERMS = """bridgeMessage.terms?.length ? '📖 Key Terms: ' + bridgeMessage.terms.map(t2 => typeof t2 === 'object' ? t2.word + (t2.definition ? ' - ' + t2.definition : '') : t2).join(', ') : ''"""

if OLD_COPY_TERMS in content:
    content = content.replace(OLD_COPY_TERMS, NEW_COPY_TERMS)
    fixes.append("FIX 5: Updated Copy button for object-style terms with definitions")
else:
    print("WARNING: FIX 5 (copy terms) not found!")

# =============================================================================
# FIX 6: Update Print button to handle object-style terms
# =============================================================================

OLD_PRINT_TERMS = """bridgeMessage.terms.map(t2 => '<span class="term">' + t2 + '</span>').join('')"""

NEW_PRINT_TERMS = """bridgeMessage.terms.map(t2 => { const w = typeof t2 === 'object' ? t2.word : t2; const d = typeof t2 === 'object' && t2.definition ? t2.definition : ''; return '<span class="term">' + w + (d ? '<br/><small style="font-weight:400;color:#555">' + d + '</small>' : '') + '</span>'; }).join('')"""

if OLD_PRINT_TERMS in content:
    content = content.replace(OLD_PRINT_TERMS, NEW_PRINT_TERMS)
    fixes.append("FIX 6: Updated Print button for object-style terms with definitions")
else:
    print("WARNING: FIX 6 (print terms) not found!")

# =============================================================================
# FIX 7: Add generation indicator overlay
# =============================================================================
# The send button already shows 'Generating content...' in aria-label and is disabled,
# but there's no visible spinner. We need to add one right before the send button.

OLD_SEND_BUTTON = """              {/* Send Button */}
              <button
                id="bridge-send-button"
                aria-label={bridgeSending ? 'Generating content...' : 'Generate and send bridge message'}
                disabled={bridgeSending}"""

NEW_SEND_BUTTON = """              {/* Generation Indicator */}
              {bridgeSending && (
                <div style={{
                  display:'flex',alignItems:'center',justifyContent:'center',gap:'12px',
                  padding:'16px 20px',marginBottom:'16px',
                  background:'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.08))',
                  border:'1px solid rgba(99,102,241,0.2)',borderRadius:'14px',
                  animation:'pulse 2s infinite'
                }}>
                  <div style={{
                    width:'24px',height:'24px',borderRadius:'50%',
                    border:'3px solid rgba(99,102,241,0.2)',borderTopColor:'#6366f1',
                    animation:'spin 0.8s linear infinite'
                  }} />
                  <div>
                    <div style={{fontSize:'14px',fontWeight:700,color:'#a5b4fc'}}>✨ Generating your Bridge message...</div>
                    <div style={{fontSize:'11px',color:'#64748b',marginTop:'2px'}}>Creating explanation, translation, and visual content</div>
                  </div>
                </div>
              )}

              {/* Send Button */}
              <button
                id="bridge-send-button"
                aria-label={bridgeSending ? 'Generating content...' : 'Generate and send bridge message'}
                disabled={bridgeSending}"""

if OLD_SEND_BUTTON in content:
    content = content.replace(OLD_SEND_BUTTON, NEW_SEND_BUTTON)
    fixes.append("FIX 7: Added animated generation indicator with spinner and status text")
else:
    print("WARNING: FIX 7 (generation indicator) not found!")

# =============================================================================
# FIX 8: Ensure @keyframes spin exists for the spinner animation
# =============================================================================

if '@keyframes spin' not in content:
    # Find the existing @keyframes pulse and add spin after it
    pulse_idx = content.find('@keyframes pulse')
    if pulse_idx > 0:
        # Find the end of the pulse keyframe block
        end_idx = content.find('}', content.find('}', pulse_idx) + 1) + 1
        content = content[:end_idx] + '\n@keyframes spin { to { transform: rotate(360deg); } }' + content[end_idx:]
        fixes.append("FIX 8: Added @keyframes spin for spinner animation")
    else:
        print("WARNING: FIX 8 - could not find @keyframes pulse to insert spin after")
else:
    fixes.append("FIX 8: @keyframes spin already exists, skipping")

# =============================================================================
# Write result
# =============================================================================

if len(fixes) >= 6:
    with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"\n✅ SUCCESS: {len(fixes)} fixes applied")
    print(f"   File size: {original_len:,} -> {len(content):,} bytes ({len(content) - original_len:+,})")
    for fix in fixes:
        print(f"   {fix}")
else:
    print(f"\n❌ ABORTED: Only {len(fixes)} fixes matched (need >= 6)")
    for fix in fixes:
        print(f"   ✅ {fix}")
