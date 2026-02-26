#!/usr/bin/env python3
"""Fix the 2 skipped changes: chat panel UI and bridge payload blast info."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# ===================================================================
# 1. Insert chat panel before the closing divs of the send panel body
# ===================================================================

# The send panel body ends with </button> then </div></div></div>)}
old_close = """            </div>
          </div>

        </div>

      )}

      {/* === BRIDGE MESSAGE PANEL (Phase E1) === */}"""

new_close_with_chat = """              {/* ═══ Live Chat Mode ═══ */}
              {bridgeChatOpen && (
                <div style={{marginTop:'20px',borderTop:'1px solid rgba(20,184,166,0.15)',paddingTop:'20px'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
                    <h3 style={{margin:0,fontSize:'16px',fontWeight:800,color:'#5eead4',display:'flex',alignItems:'center',gap:'8px'}}>
                      <span>\U0001f4ac</span> Live Translation Chat
                    </h3>
                    <button
                      onClick={() => { setBridgeChatOpen(false); setBridgeChatMessages([]); }}
                      style={{background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)',color:'#fca5a5',padding:'6px 14px',borderRadius:'10px',fontSize:'12px',fontWeight:700,cursor:'pointer'}}
                    >End Chat</button>
                  </div>

                  {/* Chat Messages */}
                  <div id="bridge-chat-messages" style={{
                    background:'rgba(0,0,0,0.2)',border:'1px solid rgba(255,255,255,0.04)',borderRadius:'16px',
                    padding:'16px',maxHeight:'320px',overflowY:'auto',marginBottom:'12px',
                    display:'flex',flexDirection:'column',gap:'10px'
                  }}>
                    {bridgeChatMessages.length === 0 ? (
                      <div style={{textAlign:'center',padding:'40px 20px',color:'#475569'}}>
                        <div style={{fontSize:'32px',marginBottom:'8px'}}>\U0001f310</div>
                        <div style={{fontSize:'13px',fontWeight:600}}>Start a conversation</div>
                        <div style={{fontSize:'11px',marginTop:'4px'}}>Messages will be auto-translated for each student</div>
                      </div>
                    ) : (
                      bridgeChatMessages.map((msg, ci) => (
                        <div key={ci} style={{
                          display:'flex',
                          justifyContent: msg.sender === 'teacher' ? 'flex-end' : 'flex-start'
                        }}>
                          <div style={{
                            maxWidth:'75%',
                            background: msg.sender === 'teacher'
                              ? 'linear-gradient(135deg, rgba(20,184,166,0.2), rgba(13,148,136,0.15))'
                              : 'rgba(99,102,241,0.15)',
                            border: '1px solid ' + (msg.sender === 'teacher' ? 'rgba(20,184,166,0.25)' : 'rgba(99,102,241,0.2)'),
                            borderRadius: msg.sender === 'teacher' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            padding:'12px 16px'
                          }}>
                            {msg.sender !== 'teacher' && (
                              <div style={{fontSize:'11px',fontWeight:700,color:'#a5b4fc',marginBottom:'4px'}}>
                                {msg.senderName || 'Student'}
                                {msg.language && <span style={{marginLeft:'6px',fontSize:'10px',padding:'1px 6px',borderRadius:'4px',background:'rgba(99,102,241,0.2)',color:'#c7d2fe'}}>{msg.language}</span>}
                              </div>
                            )}
                            <div style={{fontSize:'14px',color:'#e2e8f0',lineHeight:1.5}}>{msg.text}</div>
                            {msg.translatedText && msg.translatedText !== msg.text && (
                              <div style={{fontSize:'12px',color:'#94a3b8',marginTop:'6px',paddingTop:'6px',borderTop:'1px solid rgba(255,255,255,0.06)',fontStyle:'italic'}}>
                                {msg.translatedText}
                              </div>
                            )}
                            <div style={{fontSize:'10px',color:'#475569',marginTop:'4px',textAlign:'right'}}>
                              {new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Chat Input */}
                  <div style={{display:'flex',gap:'8px',alignItems:'flex-end'}}>
                    <div style={{flex:1,position:'relative'}}>
                      <input
                        id="bridge-chat-input"
                        type="text"
                        placeholder="Type a message... (auto-translated for students)"
                        onKeyDown={async (e) => {
                          if (e.key !== 'Enter' || !e.target.value.trim()) return;
                          const text = e.target.value.trim();
                          e.target.value = '';
                          const newMsg = { sender: 'teacher', text, timestamp: Date.now(), senderName: user?.displayName || 'Teacher' };
                          setBridgeChatMessages(prev => [...prev, newMsg]);
                          setTimeout(() => { const c = document.getElementById('bridge-chat-messages'); if (c) c.scrollTop = c.scrollHeight; }, 50);
                          if (activeSessionCode) {
                            try {
                              const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
                              await updateDoc(sessionRef, {
                                bridgeChat: {
                                  active: true,
                                  targetStudent: bridgeChatTarget,
                                  lastMessage: { ...newMsg, id: Date.now().toString(36) }
                                }
                              });
                            } catch(e2) { warnLog('Bridge chat write failed:', e2); }
                          }
                        }}
                        style={{
                          width:'100%',boxSizing:'border-box',
                          background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',
                          borderRadius:'14px',padding:'14px 18px',
                          color:'#e2e8f0',fontSize:'14px',outline:'none',fontFamily:'inherit'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'rgba(20,184,166,0.4)'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                      />
                    </div>
                    <button
                      onClick={async () => {
                        const input = document.getElementById('bridge-chat-input');
                        if (!input || !input.value.trim()) return;
                        const text = input.value.trim();
                        input.value = '';
                        const newMsg = { sender: 'teacher', text, timestamp: Date.now(), senderName: user?.displayName || 'Teacher' };
                        setBridgeChatMessages(prev => [...prev, newMsg]);
                        setTimeout(() => { const c = document.getElementById('bridge-chat-messages'); if (c) c.scrollTop = c.scrollHeight; }, 50);
                        if (activeSessionCode) {
                          try {
                            const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
                            await updateDoc(sessionRef, {
                              bridgeChat: {
                                active: true,
                                targetStudent: bridgeChatTarget,
                                lastMessage: { ...newMsg, id: Date.now().toString(36) }
                              }
                            });
                          } catch(e2) { warnLog('Bridge chat write failed:', e2); }
                        }
                      }}
                      style={{
                        background:'linear-gradient(135deg, #0d9488, #14b8a6)',
                        border:'none',borderRadius:'14px',padding:'14px 20px',
                        color:'white',fontSize:'14px',fontWeight:700,cursor:'pointer',
                        display:'flex',alignItems:'center',gap:'6px'
                      }}
                    >\u27a4</button>
                  </div>

                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'8px',padding:'0 4px'}}>
                    <span style={{fontSize:'11px',color:'#475569'}}>
                      {activeSessionCode ? '\U0001f7e2 Live \u2014 ' + bridgeChatMessages.length + ' messages' : '\U0001f534 No active session'}
                    </span>
                    <span style={{fontSize:'11px',color:'#475569'}}>
                      Press Enter to send \u2022 Auto-translated per group language
                    </span>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

      )}

      {/* === BRIDGE MESSAGE PANEL (Phase E1) === */}"""

if old_close in content:
    content = content.replace(old_close, new_close_with_chat, 1)
    changes += 1
    print("1: Inserted Live Chat panel into send panel")
else:
    print("1: SKIP - closing pattern not found")

# ===================================================================
# 2. Update bridge payload with blast info
# ===================================================================

old_payload = """                          bridgePayload: {
                            text: bridgeSendText,
                            mode: selectedMode,
                            targetGroup: selectedTarget,
                            timestamp: Date.now(),
                            senderName: user?.displayName || 'Teacher'
                          }"""

new_payload = """                          bridgePayload: {
                            text: bridgeSendText,
                            mode: selectedMode,
                            targetGroup: selectedTarget,
                            timestamp: Date.now(),
                            senderName: user?.displayName || 'Teacher',
                            isBlast: selectedTarget === 'all',
                            languageMap: selectedTarget === 'all' && rosterKey?.groups
                              ? Object.fromEntries(Object.entries(rosterKey.groups).map(([gId, g]) => [gId, g.profile?.leveledTextLanguage || 'English']))
                              : null
                          }"""

if old_payload in content:
    content = content.replace(old_payload, new_payload, 1)
    changes += 1
    print("2: Updated bridge payload with blast info")
else:
    print("2: SKIP - payload pattern not found")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied.")
