#!/usr/bin/env python3
"""
Multi-Language Blast Preview + Live Translation Chat Mode
1. Language Blast Preview box below target group selector
2. Live Chat mode (5th mode button) + full chat UI
3. Chat states (bridgeChatOpen, bridgeChatMessages)
4. Chat Firebase listener + sender
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# ===================================================================
# 1. Add bridgeChat states
# ===================================================================

old_history_states = """  const [bridgeHistory, setBridgeHistory] = useState([]);
  const [bridgeHistoryOpen, setBridgeHistoryOpen] = useState(false);"""

new_history_states = """  const [bridgeHistory, setBridgeHistory] = useState([]);
  const [bridgeHistoryOpen, setBridgeHistoryOpen] = useState(false);
  const [bridgeChatOpen, setBridgeChatOpen] = useState(false);
  const [bridgeChatMessages, setBridgeChatMessages] = useState([]);
  const [bridgeChatTarget, setBridgeChatTarget] = useState('all');
  const bridgeChatInputRef = React.useRef(null);"""

if old_history_states in content:
    content = content.replace(old_history_states, new_history_states, 1)
    changes += 1
    print("1: Added bridgeChat states")
else:
    print("1: SKIP - history states not found")

# ===================================================================
# 2. Add Language Blast Preview below the 3-column selectors grid
# ===================================================================

old_selectors_end = """              {/* Advanced Options */}"""

new_blast_preview = """              {/* Multi-Language Blast Preview */}
              {rosterKey?.groups && Object.keys(rosterKey.groups).length > 0 && (
                <div style={{marginBottom:'20px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'14px',padding:'14px 16px'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                    <div style={{fontSize:'12px',fontWeight:700,color:'#5eead4',textTransform:'uppercase',letterSpacing:'0.08em',display:'flex',alignItems:'center',gap:'6px'}}>
                      <span>\U0001f310</span> Language Blast Preview
                    </div>
                    <span style={{fontSize:'11px',color:'#64748b'}}>Each device generates in its group's language</span>
                  </div>
                  <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                    {Object.entries(rosterKey.groups).map(([gId, g]) => {
                      const langMap = {
                        'English':'\U0001f1fa\U0001f1f8','Spanish':'\U0001f1ea\U0001f1f8','French':'\U0001f1eb\U0001f1f7','Arabic':'\U0001f1f8\U0001f1e6',
                        'Somali':'\U0001f1f8\U0001f1f4','Vietnamese':'\U0001f1fb\U0001f1f3','Portuguese':'\U0001f1e7\U0001f1f7','Mandarin':'\U0001f1e8\U0001f1f3',
                        'Korean':'\U0001f1f0\U0001f1f7','Tagalog':'\U0001f1f5\U0001f1ed','Russian':'\U0001f1f7\U0001f1fa','Japanese':'\U0001f1ef\U0001f1f5'
                      };
                      const lang = g.profile?.leveledTextLanguage || 'English';
                      const flag = langMap[lang] || '\U0001f310';
                      const targetSel = document.getElementById('bridge-target-selector');
                      const currentTarget = targetSel?.value || 'all';
                      const isActive = currentTarget === 'all' || currentTarget === gId;
                      return (
                        <div key={gId} style={{
                          background: isActive ? 'rgba(20,184,166,0.08)' : 'rgba(255,255,255,0.02)',
                          border: '1px solid ' + (isActive ? 'rgba(20,184,166,0.2)' : 'rgba(255,255,255,0.04)'),
                          borderRadius:'10px',padding:'8px 12px',minWidth:'110px',
                          opacity: isActive ? 1 : 0.4,transition:'all 0.2s'
                        }}>
                          <div style={{fontSize:'12px',fontWeight:700,color: isActive ? '#e2e8f0' : '#64748b',marginBottom:'2px'}}>{g.name}</div>
                          <div style={{fontSize:'11px',color: isActive ? '#5eead4' : '#475569'}}>{flag} {lang}</div>
                          <div style={{fontSize:'10px',color:'#475569',marginTop:'2px'}}>{g.profile?.gradeLevel || '—'}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Advanced Options */}"""

if old_selectors_end in content:
    content = content.replace(old_selectors_end, new_blast_preview, 1)
    changes += 1
    print("2: Added Multi-Language Blast Preview")
else:
    print("2: SKIP - advanced options comment not found")

# ===================================================================
# 3. Add Live Chat mode button (5th mode)
# ===================================================================

old_mode_buttons = """                    {id:'simplify', icon:'\u2728', title:'Simplify', desc:'Rewrite at selected grade reading level'}
                  ].map((m, mi) => ("""

new_mode_buttons = """                    {id:'simplify', icon:'\u2728', title:'Simplify', desc:'Rewrite at selected grade reading level'},
                    {id:'livechat', icon:'\U0001f4ac', title:'Live Chat', desc:'Real-time translated conversation'}
                  ].map((m, mi) => ("""

if old_mode_buttons in content:
    content = content.replace(old_mode_buttons, new_mode_buttons, 1)
    changes += 1
    print("3: Added Live Chat as 5th mode button")
else:
    print("3: SKIP - simplify mode button not found")

# Need to update grid from 4 to 5 columns
old_mode_grid = "style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:'10px'}}"
new_mode_grid = "style={{display:'grid',gridTemplateColumns:'repeat(5, 1fr)',gap:'8px'}}"

if old_mode_grid in content:
    content = content.replace(old_mode_grid, new_mode_grid, 1)
    changes += 1
    print("4: Updated mode grid to 5 columns")
else:
    print("4: SKIP - mode grid pattern not found")

# ===================================================================
# 5. Add Live Chat panel (replaces the rest of the send panel when livechat is selected)
# ===================================================================

# Add the chat UI right before the closing of the body div,
# after the send button (before the last closing divs of the panel)
old_body_close = """              </div>
            </div>

          </div>

        </div>

      )}

      {/* === BRIDGE MESSAGE PANEL"""

new_chat_panel = """              </div>

              {/* ═══ Live Chat Mode ═══ */}
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
                        ref={bridgeChatInputRef}
                        type="text"
                        placeholder="Type a message... (auto-translated for students)"
                        onKeyDown={async (e) => {
                          if (e.key !== 'Enter' || !e.target.value.trim()) return;
                          const text = e.target.value.trim();
                          e.target.value = '';
                          const newMsg = { sender: 'teacher', text, timestamp: Date.now(), senderName: user?.displayName || 'Teacher' };
                          setBridgeChatMessages(prev => [...prev, newMsg]);
                          // Scroll to bottom
                          setTimeout(() => {
                            const container = document.getElementById('bridge-chat-messages');
                            if (container) container.scrollTop = container.scrollHeight;
                          }, 50);
                          // Write to Firebase if session active
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
                            } catch(e2) { warnLog('Bridge chat Firebase write failed:', e2); }
                          }
                        }}
                        style={{
                          width:'100%',boxSizing:'border-box',
                          background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',
                          borderRadius:'14px',padding:'14px 18px',
                          color:'#e2e8f0',fontSize:'14px',outline:'none',fontFamily:'inherit',
                          transition:'border-color 0.2s'
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
                        setTimeout(() => {
                          const container = document.getElementById('bridge-chat-messages');
                          if (container) container.scrollTop = container.scrollHeight;
                        }, 50);
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
                          } catch(e2) { warnLog('Bridge chat Firebase write failed:', e2); }
                        }
                      }}
                      style={{
                        background:'linear-gradient(135deg, #0d9488, #14b8a6)',
                        border:'none',borderRadius:'14px',padding:'14px 20px',
                        color:'white',fontSize:'14px',fontWeight:700,cursor:'pointer',
                        display:'flex',alignItems:'center',gap:'6px',
                        transition:'transform 0.15s'
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >\u27a4</button>
                  </div>

                  {/* Chat status bar */}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'8px',padding:'0 4px'}}>
                    <span style={{fontSize:'11px',color:'#475569'}}>
                      {activeSessionCode ? '\U0001f7e2 Live — ' + bridgeChatMessages.length + ' messages' : '\U0001f534 No active session'}
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

      {/* === BRIDGE MESSAGE PANEL"""

if old_body_close in content:
    content = content.replace(old_body_close, new_chat_panel, 1)
    changes += 1
    print("5: Added Live Chat panel UI")
else:
    print("5: SKIP - body close pattern not found")

# ===================================================================
# 6. Handle livechat mode click — open chat panel instead of sending
# ===================================================================

old_mode_click = "window.__bridgeMode = m.id;"
new_mode_click = """window.__bridgeMode = m.id;
                        if (m.id === 'livechat') { setBridgeChatOpen(true); } else { setBridgeChatOpen(false); }"""

if old_mode_click in content:
    content = content.replace(old_mode_click, new_mode_click, 1)
    changes += 1
    print("6: Added livechat mode click handler")
else:
    print("6: SKIP - mode click handler not found")

# ===================================================================
# 7. Add student-side bridgeChat listener (in the Firebase onSnapshot)
# ===================================================================

old_bridge_listener_end = """                      debugLog('Bridge: Received payload, generating locally...', bp.text);"""

new_bridge_listener_with_chat = """                      debugLog('Bridge: Received payload, generating locally...', bp.text);

                    // ====== Live Chat Listener ======
                    if (data.bridgeChat && data.bridgeChat.active && data.bridgeChat.lastMessage) {
                      const chatMsg = data.bridgeChat.lastMessage;
                      const chatTs = chatMsg.timestamp || 0;
                      if (chatTs > (window.__lastBridgeChatTs || 0)) {
                        window.__lastBridgeChatTs = chatTs;
                        const myGroupId2 = data.roster?.[user?.uid]?.groupId;
                        const myProfile2 = myGroupId2 && data.groups?.[myGroupId2]?.profile
                          ? data.groups[myGroupId2].profile
                          : { gradeLevel: '5th Grade', leveledTextLanguage: 'English' };
                        const myLang = myProfile2.leveledTextLanguage || 'English';
                        // Translate teacher message to student language
                        if (chatMsg.sender === 'teacher' && myLang !== 'English') {
                          (async () => {
                            try {
                              const translated = await callGemini(
                                `Translate the following to ${myLang}. Return ONLY the translation:\\n\\n${chatMsg.text}`,
                                false, false, 0.3
                              );
                              setBridgeChatMessages(prev => [...prev, {
                                ...chatMsg,
                                translatedText: translated,
                                language: 'English'
                              }]);
                            } catch(e) {
                              setBridgeChatMessages(prev => [...prev, { ...chatMsg, language: 'English' }]);
                            }
                            setBridgeChatOpen(true);
                          })();
                        } else {
                          setBridgeChatMessages(prev => [...prev, chatMsg]);
                          setBridgeChatOpen(true);
                        }
                      }
                    }"""

if old_bridge_listener_end in content:
    content = content.replace(old_bridge_listener_end, new_bridge_listener_with_chat, 1)
    changes += 1
    print("7: Added student-side bridgeChat listener")
else:
    print("7: SKIP - bridge listener end not found")

# ===================================================================
# 8. Update bridge payload to include blast info
# ===================================================================

old_payload = """                         await updateDoc(sessionRef, {
                          bridgePayload: {
                            text: bridgeSendText,
                            mode: selectedMode,
                            targetGroup: selectedTarget,
                            timestamp: Date.now(),
                            senderName: user?.displayName || 'Teacher'
                          }
                        });"""

new_payload = """                         await updateDoc(sessionRef, {
                          bridgePayload: {
                            text: bridgeSendText,
                            mode: selectedMode,
                            targetGroup: selectedTarget,
                            timestamp: Date.now(),
                            senderName: user?.displayName || 'Teacher',
                            isBlast: selectedTarget === 'all',
                            languageMap: selectedTarget === 'all' && rosterKey?.groups
                              ? Object.fromEntries(Object.entries(rosterKey.groups).map(([gId, g]) => [gId, g.profile?.leveledTextLanguage || 'English']))
                              : null
                          }
                        });"""

if old_payload in content:
    content = content.replace(old_payload, new_payload, 1)
    changes += 1
    print("8: Updated bridge payload with blast info")
else:
    print("8: SKIP - bridge payload pattern not found")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied.")
