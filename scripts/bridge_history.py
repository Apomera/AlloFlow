#!/usr/bin/env python3
"""
Bridge Message History Feature:
1. Add bridgeHistory state array + bridgeHistoryOpen toggle
2. Push to history after successful send (before closing send panel)
3. Add history section to the bottom of the bridge send panel
4. Allow re-viewing and re-sending past messages
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# ===================================================================
# 1. Add bridgeHistory state after bridgeTermsSaved
# ===================================================================

old_states = "  const [bridgeTermsSaved, setBridgeTermsSaved] = useState([]);"
new_states = """  const [bridgeTermsSaved, setBridgeTermsSaved] = useState([]);
  const [bridgeHistory, setBridgeHistory] = useState([]);
  const [bridgeHistoryOpen, setBridgeHistoryOpen] = useState(false);"""

if old_states in content:
    content = content.replace(old_states, new_states, 1)
    changes += 1
    print("1: Added bridgeHistory and bridgeHistoryOpen states")
else:
    print("1: SKIP - could not find bridgeTermsSaved state")

# ===================================================================
# 2. Push to history after successful send (right before setBridgeSendOpen(false))
# ===================================================================

old_send_close = """                    setBridgeSendOpen(false);
                    const _ta = document.getElementById('bridge-send-textarea');
                    if (_ta) _ta.value = '';
                    addToast(t('roster.bridge_send_success') || '\u2705 Bridge message generated!', 'success');"""

new_send_close = """                    // Save to bridge history
                    setBridgeHistory(prev => [{
                      english: parsed.english || bridgeSendText,
                      translated: parsed.translated || '',
                      language: targetLang,
                      languageName: langNames[targetLang] || ('\U0001f310 ' + targetLang),
                      imageUrl: imageUrl,
                      terms: parsed.terms || [],
                      mode: selectedMode,
                      originalPrompt: bridgeSendText,
                      timestamp: Date.now()
                    }, ...prev].slice(0, 20));

                    setBridgeSendOpen(false);
                    const _ta = document.getElementById('bridge-send-textarea');
                    if (_ta) _ta.value = '';
                    addToast(t('roster.bridge_send_success') || '\u2705 Bridge message generated!', 'success');"""

if old_send_close in content:
    content = content.replace(old_send_close, new_send_close, 1)
    changes += 1
    print("2: Added history push after successful send")
else:
    print("2: SKIP - could not find send close pattern")

# ===================================================================
# 3. Add History section to the bridge send panel (before the send button)
# ===================================================================

# Find the send button section and add history above it
old_send_btn_area = """              {/* Send Button */}"""

new_history_and_btn = """              {/* Message History */}
              {bridgeHistory.length > 0 && (
                <div style={{marginBottom:'20px'}}>
                  <button
                    onClick={() => setBridgeHistoryOpen(h => !h)}
                    style={{
                      width:'100%',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',
                      borderRadius:'12px',padding:'12px 16px',color:'#94a3b8',fontSize:'13px',fontWeight:700,
                      cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',
                      transition:'all 0.2s'
                    }}
                  >
                    <span style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      <span style={{fontSize:'16px'}}>\U0001f4cb</span> Message History ({bridgeHistory.length})
                    </span>
                    <span style={{transform: bridgeHistoryOpen ? 'rotate(180deg)' : 'none',transition:'transform 0.2s',fontSize:'12px'}}>\u25bc</span>
                  </button>

                  {bridgeHistoryOpen && (
                    <div style={{
                      marginTop:'8px',maxHeight:'280px',overflowY:'auto',
                      border:'1px solid rgba(255,255,255,0.06)',borderRadius:'14px',
                      background:'rgba(0,0,0,0.2)'
                    }}>
                      {bridgeHistory.map((msg, hi) => (
                        <div key={hi} style={{
                          padding:'14px 16px',
                          borderBottom: hi < bridgeHistory.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                          transition:'background 0.15s',
                          cursor:'pointer'
                        }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'12px'}}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:'13px',fontWeight:600,color:'#e2e8f0',marginBottom:'4px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                {msg.originalPrompt || msg.english?.substring(0, 60) || 'Message'}
                              </div>
                              <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
                                <span style={{fontSize:'11px',color:'#64748b'}}>
                                  {new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                                </span>
                                <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'6px',background:'rgba(20,184,166,0.12)',color:'#5eead4',fontWeight:600}}>
                                  {msg.languageName || msg.language}
                                </span>
                                <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'6px',background:'rgba(99,102,241,0.12)',color:'#a5b4fc',fontWeight:600}}>
                                  {msg.mode === 'explain' ? '\U0001f4a1 Explain' : msg.mode === 'translate' ? '\U0001f310 Translate' : '\U0001f3a8 Visual'}
                                </span>
                                {msg.terms && msg.terms.length > 0 && (
                                  <span style={{fontSize:'11px',color:'#64748b'}}>{msg.terms.length} terms</span>
                                )}
                              </div>
                            </div>
                            <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBridgeMessage({
                                    english: msg.english,
                                    translated: msg.translated,
                                    language: msg.language,
                                    languageName: msg.languageName,
                                    imageUrl: msg.imageUrl,
                                    terms: msg.terms || [],
                                    timestamp: msg.timestamp
                                  });
                                  setBridgeSendOpen(false);
                                  setBridgeTermsSaved([]);
                                }}
                                title="View this message"
                                style={{background:'rgba(99,102,241,0.15)',border:'1px solid rgba(99,102,241,0.25)',color:'#a5b4fc',padding:'6px 10px',borderRadius:'8px',fontSize:'11px',fontWeight:700,cursor:'pointer',transition:'all 0.2s',whiteSpace:'nowrap'}}
                              >\U0001f441\ufe0f View</button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const ta = document.getElementById('bridge-send-textarea');
                                  if (ta) ta.value = msg.originalPrompt || msg.english || '';
                                  setBridgeHistoryOpen(false);
                                  addToast('Loaded prompt from history', 'info');
                                }}
                                title="Re-use this prompt"
                                style={{background:'rgba(20,184,166,0.15)',border:'1px solid rgba(20,184,166,0.25)',color:'#5eead4',padding:'6px 10px',borderRadius:'8px',fontSize:'11px',fontWeight:700,cursor:'pointer',transition:'all 0.2s',whiteSpace:'nowrap'}}
                              >\u267b\ufe0f Reuse</button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {bridgeHistory.length > 0 && (
                        <div style={{padding:'10px 16px',borderTop:'1px solid rgba(255,255,255,0.04)',textAlign:'center'}}>
                          <button
                            onClick={() => { setBridgeHistory([]); setBridgeHistoryOpen(false); addToast('History cleared', 'info'); }}
                            style={{background:'none',border:'none',color:'#475569',fontSize:'11px',cursor:'pointer',padding:'4px 8px',transition:'color 0.2s'}}
                            onMouseEnter={(e) => e.target.style.color = '#ef4444'}
                            onMouseLeave={(e) => e.target.style.color = '#475569'}
                          >\U0001f5d1\ufe0f Clear History</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Send Button */}"""

if old_send_btn_area in content:
    content = content.replace(old_send_btn_area, new_history_and_btn, 1)
    changes += 1
    print("3: Added history section above send button")
else:
    print("3: SKIP - could not find send button comment")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied.")
