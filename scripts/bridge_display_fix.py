#!/usr/bin/env python3
"""
Fix Bridge: 
1) Add console.error debug to send handler to trace callGemini result
2) Convert Bridge Message Display Panel to inline styles (same fix pattern as send panel)
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# ===================================================================
# 1. Add debug logging to the send handler
# ===================================================================

# Add logging after callGemini returns
old_gemini_call = "const response = await callGemini(prompt, false, false, 0.3);"
new_gemini_call = """const response = await callGemini(prompt, false, false, 0.3);
                    console.error('[BRIDGE] callGemini response length:', response?.length, 'first 100 chars:', response?.substring?.(0, 100));"""

if old_gemini_call in content:
    content = content.replace(old_gemini_call, new_gemini_call, 1)
    changes += 1
    print("1a: Added callGemini response debug logging")

# Add logging when setBridgeMessage is called
old_set_msg = "setBridgeMessage({"
new_set_msg = "console.error('[BRIDGE] Setting bridgeMessage with:', JSON.stringify({english: (parsed.english || bridgeSendText).substring(0,50), translated: (parsed.translated || '').substring(0,50), language: targetLang, terms: parsed.terms?.length}));\n                    setBridgeMessage({"

if old_set_msg in content:
    # Only replace the first occurrence (in the send handler)
    idx = content.find(old_set_msg)
    if idx > 0:
        content = content[:idx] + new_set_msg + content[idx + len(old_set_msg):]
        changes += 1
        print("1b: Added setBridgeMessage debug logging")

# Add logging in exception handlers
old_catch = "warnLog('Bridge send failed', err);"
new_catch = "console.error('[BRIDGE] Send failed with error:', err?.message, err); warnLog('Bridge send failed', err);"
if old_catch in content:
    content = content.replace(old_catch, new_catch, 1)
    changes += 1
    print("1c: Added error catch debug logging")

# ===================================================================
# 2. Convert Bridge Message Display Panel to inline styles
# ===================================================================

# Find the display panel block
start_marker = "      {/* === BRIDGE MESSAGE PANEL (Phase E1) === */}"
start_idx = content.find(start_marker)
if start_idx == -1:
    print("2: ERROR - Cannot find bridge message panel start marker")
else:
    # Find the end of the block
    # It ends with "      )}" after the closing </div></div>
    # Search for the pattern after the close button
    close_search_start = content.find("bridge_close') || 'Close'}", start_idx)
    if close_search_start == -1:
        print("2: ERROR - Cannot find close button in display panel")
    else:
        close_marker = "\n      )}\n"
        close_idx = content.find(close_marker, close_search_start)
        if close_idx == -1:
            print("2: ERROR - Cannot find closing marker")
        else:
            close_idx += len(close_marker)
            
            old_block = content[start_idx:close_idx]
            print(f"2: Found display panel block: {len(old_block)} chars")

            # Build new display panel with inline styles
            new_display = r"""      {/* === BRIDGE MESSAGE PANEL (Phase E1) === */}

      {bridgeMessage && (

        <div
          style={{position:'fixed',inset:0,zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',background: bridgeProjectionMode ? 'rgba(0,0,0,0.95)' : 'rgba(2,6,23,0.75)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',transition:'background 0.3s'}}
          onClick={(e) => { if (e.target === e.currentTarget) setBridgeMessage(null); }}
        >

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background:'linear-gradient(145deg, rgba(15,23,42,0.97) 0%, rgba(30,41,59,0.95) 50%, rgba(15,23,42,0.97) 100%)',
              borderRadius: bridgeProjectionMode ? '0' : '24px',
              padding:'0',
              maxWidth: bridgeProjectionMode ? '100vw' : '720px',
              width: bridgeProjectionMode ? '100vw' : '94vw',
              maxHeight: bridgeProjectionMode ? '100vh' : '90vh',
              overflowY:'auto',
              color:'#e2e8f0',
              boxShadow: bridgeProjectionMode ? 'none' : '0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(99,102,241,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
              border: bridgeProjectionMode ? 'none' : '1px solid rgba(99,102,241,0.2)',
              pointerEvents:'all',position:'relative',zIndex:100000
            }}
          >

            {/* Header */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'24px 28px 20px',borderBottom:'1px solid rgba(99,102,241,0.15)'}}>
              <h2 style={{fontSize: bridgeProjectionMode ? '28px' : '20px',fontWeight:800,margin:0,color:'#a5b4fc',display:'flex',alignItems:'center',gap:'10px',letterSpacing:'-0.02em'}}>
                <span style={{fontSize: bridgeProjectionMode ? '32px' : '24px'}}>📩</span> {t('roster.bridge_title') || 'Message from your teacher'}
              </h2>
              <div style={{display:'flex',gap:'8px'}}>
                <button
                  onClick={() => setBridgeProjectionMode(p => !p)}
                  title={bridgeProjectionMode ? 'Exit Projection' : 'Projection Mode'}
                  style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#94a3b8',width:'36px',height:'36px',borderRadius:'12px',cursor:'pointer',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s'}}
                >{bridgeProjectionMode ? '🖥️' : '📽️'}</button>
                <button
                  onClick={() => { setBridgeMessage(null); setBridgeKaraokeIndex(-1); setBridgeTtsPlaying(false); setBridgeTermsSaved([]); }}
                  style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#94a3b8',width:'36px',height:'36px',borderRadius:'12px',cursor:'pointer',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s'}}
                >✕</button>
              </div>
            </div>

            {/* Body */}
            <div style={{padding:'24px 28px'}}>

              {/* Image (if visual mode) */}
              {bridgeMessage.imageUrl && (
                <div style={{marginBottom:'20px',borderRadius:'16px',overflow:'hidden',border:'1px solid rgba(255,255,255,0.08)'}}>
                  <img src={bridgeMessage.imageUrl} alt="Visual aid" style={{width:'100%',display:'block',maxHeight:'300px',objectFit:'contain',background:'rgba(0,0,0,0.3)'}} />
                </div>
              )}

              {/* English Text Block */}
              <div style={{marginBottom:'20px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'16px',padding:'20px'}}>
                <div style={{fontSize:'12px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'10px'}}>🇺🇸 {t('roster.bridge_english') || 'English'}</div>
                <div style={{fontSize: bridgeProjectionMode ? '24px' : '16px',lineHeight:1.8,letterSpacing:'0.01em'}}>
                  {bridgeMessage.english.split(/\s+/).map((word, idx) => (
                    <span key={idx} style={{
                      padding:'2px 4px',borderRadius:'4px',transition:'all 0.15s',
                      background: bridgeActiveLanguage === 'en' && idx === bridgeKaraokeIndex ? 'rgba(99,102,241,0.3)' : 'transparent',
                      color: bridgeActiveLanguage === 'en' && idx === bridgeKaraokeIndex ? '#c7d2fe' : '#e2e8f0'
                    }}>{word}{' '}</span>
                  ))}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'10px',marginTop:'12px'}}>
                  <button
                    disabled={bridgeTtsPlaying}
                    onClick={async () => {
                      const text = bridgeMessage.english;
                      const words = text.split(/\s+/);
                      setBridgeTtsPlaying(true);
                      setBridgeActiveLanguage('en');
                      const msPerWord = Math.max(200, 350 / ttsSpeed);
                      let cancelled = false;
                      const karaokeLoop = (async () => {
                        for (let wi = 0; wi < words.length && !cancelled; wi++) {
                          setBridgeKaraokeIndex(wi);
                          await new Promise(r => setTimeout(r, msPerWord));
                        }
                        setBridgeKaraokeIndex(-1);
                      })();
                      try { await handleAudio(text); } catch(e) { warnLog('Bridge TTS error', e); }
                      cancelled = true;
                      setBridgeKaraokeIndex(-1);
                      setBridgeTtsPlaying(false);
                    }}
                    style={{background:'rgba(99,102,241,0.15)',border:'1px solid rgba(99,102,241,0.3)',color:'#a5b4fc',padding:'8px 16px',borderRadius:'10px',fontSize:'13px',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',transition:'all 0.2s',opacity: bridgeTtsPlaying ? 0.5 : 1}}
                  >🔊 {t('roster.bridge_play_en') || 'Play English'}</button>
                  {bridgeTtsPlaying && bridgeActiveLanguage === 'en' && (
                    <div style={{flex:1,height:'4px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',overflow:'hidden'}}>
                      <div style={{height:'100%',background:'linear-gradient(90deg,#6366f1,#818cf8)',borderRadius:'2px',transition:'width 0.15s',width: bridgeKaraokeIndex >= 0 ? `${(bridgeKaraokeIndex / Math.max(1, bridgeMessage.english.split(/\s+/).length)) * 100}%` : '0%'}} />
                    </div>
                  )}
                </div>
              </div>

              {/* Translated Text Block */}
              {bridgeMessage.translated && (
                <div style={{marginBottom:'20px',background:'rgba(20,184,166,0.04)',border:'1px solid rgba(20,184,166,0.12)',borderRadius:'16px',padding:'20px'}}>
                  <div style={{fontSize:'12px',fontWeight:700,color:'#5eead4',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'10px'}}>🌐 {bridgeMessage.languageName || bridgeMessage.language}</div>
                  <div style={{fontSize: bridgeProjectionMode ? '24px' : '16px',lineHeight:1.8,letterSpacing:'0.01em'}}>
                    {bridgeMessage.translated.split(/\s+/).map((word, idx) => (
                      <span key={idx} style={{
                        padding:'2px 4px',borderRadius:'4px',transition:'all 0.15s',
                        background: bridgeActiveLanguage === 'translated' && idx === bridgeKaraokeIndex ? 'rgba(20,184,166,0.3)' : 'transparent',
                        color: bridgeActiveLanguage === 'translated' && idx === bridgeKaraokeIndex ? '#99f6e4' : '#e2e8f0'
                      }}>{word}{' '}</span>
                    ))}
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginTop:'12px'}}>
                    <button
                      disabled={bridgeTtsPlaying}
                      onClick={async () => {
                        const text = bridgeMessage.translated;
                        const words = text.split(/\s+/);
                        setBridgeTtsPlaying(true);
                        setBridgeActiveLanguage('translated');
                        const msPerWord = Math.max(200, 350 / ttsSpeed);
                        let cancelled = false;
                        const karaokeLoop = (async () => {
                          for (let wi = 0; wi < words.length && !cancelled; wi++) {
                            setBridgeKaraokeIndex(wi);
                            await new Promise(r => setTimeout(r, msPerWord));
                          }
                          setBridgeKaraokeIndex(-1);
                        })();
                        try { await handleAudio(text); } catch(e) { warnLog('Bridge TTS error', e); }
                        cancelled = true;
                        setBridgeKaraokeIndex(-1);
                        setBridgeTtsPlaying(false);
                      }}
                      style={{background:'rgba(20,184,166,0.15)',border:'1px solid rgba(20,184,166,0.3)',color:'#5eead4',padding:'8px 16px',borderRadius:'10px',fontSize:'13px',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',transition:'all 0.2s',opacity: bridgeTtsPlaying ? 0.5 : 1}}
                    >🔊 {t('roster.bridge_play_translated') || 'Play Translation'}</button>
                    {bridgeTtsPlaying && bridgeActiveLanguage === 'translated' && (
                      <div style={{flex:1,height:'4px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',overflow:'hidden'}}>
                        <div style={{height:'100%',background:'linear-gradient(90deg,#0d9488,#14b8a6)',borderRadius:'2px',transition:'width 0.15s',width: bridgeKaraokeIndex >= 0 ? `${(bridgeKaraokeIndex / Math.max(1, bridgeMessage.translated.split(/\s+/).length)) * 100}%` : '0%'}} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Key Terms */}
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
              )}

              {/* Action Buttons */}
              <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
                {bridgeMessage.terms && bridgeMessage.terms.length > 0 && (
                  <button
                    disabled={!bridgeMessage.terms || bridgeMessage.terms.every(t2 => bridgeTermsSaved.includes(t2))}
                    onClick={async () => {
                      const unsaved = bridgeMessage.terms.filter(t2 => !bridgeTermsSaved.includes(t2));
                      if (unsaved.length === 0) return;
                      addToast(`Saving ${unsaved.length} terms...`, 'info');
                      for (const term of unsaved) {
                        try { await handleQuickAddGlossary(term); setBridgeTermsSaved(prev => [...prev, term]); }
                        catch(err) { warnLog('Bridge term save failed:', term, err); }
                      }
                      addToast('All terms saved to glossary!', 'success');
                    }}
                    style={{background:'rgba(99,102,241,0.15)',border:'1px solid rgba(99,102,241,0.25)',color:'#a5b4fc',padding:'10px 18px',borderRadius:'12px',fontSize:'13px',fontWeight:700,cursor:'pointer',transition:'all 0.2s',flex:1}}
                  >{bridgeMessage.terms.every(t2 => bridgeTermsSaved.includes(t2)) ? '✅ All Saved' : '📖 Save All Terms'}</button>
                )}

                <button
                  onClick={async () => {
                    setBridgeTtsPlaying(true); setBridgeActiveLanguage('en');
                    const words = bridgeMessage.english.split(/\s+/);
                    const msPerWord = Math.max(200, 350 / ttsSpeed);
                    for (let wi = 0; wi < words.length; wi++) { setBridgeKaraokeIndex(wi); await new Promise(r => setTimeout(r, msPerWord)); }
                    setBridgeKaraokeIndex(-1);
                    try { await handleAudio(bridgeMessage.english); } catch(e) {}
                    if (bridgeMessage.translated) {
                      setBridgeActiveLanguage('translated');
                      const tWords = bridgeMessage.translated.split(/\s+/);
                      for (let wi = 0; wi < tWords.length; wi++) { setBridgeKaraokeIndex(wi); await new Promise(r => setTimeout(r, msPerWord)); }
                      setBridgeKaraokeIndex(-1);
                      try { await handleAudio(bridgeMessage.translated); } catch(e) {}
                    }
                    setBridgeTtsPlaying(false);
                  }}
                  style={{background:'rgba(20,184,166,0.15)',border:'1px solid rgba(20,184,166,0.25)',color:'#5eead4',padding:'10px 18px',borderRadius:'12px',fontSize:'13px',fontWeight:700,cursor:'pointer',transition:'all 0.2s',flex:1}}
                >🔄 Read Again</button>

                <button
                  onClick={() => { setBridgeMessage(null); setBridgeKaraokeIndex(-1); setBridgeTtsPlaying(false); }}
                  style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#94a3b8',padding:'10px 18px',borderRadius:'12px',fontSize:'13px',fontWeight:700,cursor:'pointer',transition:'all 0.2s',flex:1}}
                >{t('roster.bridge_close') || 'Close'}</button>
              </div>

            </div>

          </div>

        </div>

      )}
"""

            content = content[:start_idx] + new_display + content[close_idx:]
            changes += 1
            print(f"2: Replaced display panel ({len(old_block)} chars -> {len(new_display)} chars)")


with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied.")
