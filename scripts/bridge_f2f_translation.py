#!/usr/bin/env python3
"""
Face-to-Face Translation Mode — Single-device, FERPA-safe, TTS in/out.

Replaces the existing Firebase-based Live Chat with a local-only 
face-to-face conversation panel. Features:
1. Split view: Teacher (English) | Student (their language)
2. Voice input (speech recognition) for both sides
3. Auto-TTS playback of each translated message
4. No Firebase — purely local React state
5. Translation via callGemini
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# ===================================================================
# 1. Update chat states to support face-to-face mode
# ===================================================================

old_chat_states = """  const [bridgeChatOpen, setBridgeChatOpen] = useState(false);
  const [bridgeChatMessages, setBridgeChatMessages] = useState([]);
  const [bridgeChatTarget, setBridgeChatTarget] = useState('all');
  const bridgeChatInputRef = React.useRef(null);"""

new_chat_states = """  const [bridgeChatOpen, setBridgeChatOpen] = useState(false);
  const [bridgeChatMessages, setBridgeChatMessages] = useState([]);
  const [bridgeChatTarget, setBridgeChatTarget] = useState('all');
  const bridgeChatInputRef = React.useRef(null);
  const [bridgeF2FLang, setBridgeF2FLang] = useState('Spanish');
  const [bridgeF2FTranslating, setBridgeF2FTranslating] = useState(false);
  const [bridgeF2FListening, setBridgeF2FListening] = useState(null);"""

if old_chat_states in content:
    content = content.replace(old_chat_states, new_chat_states, 1)
    changes += 1
    print("1: Updated chat states for face-to-face mode")
else:
    print("1: SKIP - chat states not found")

# ===================================================================
# 2. Update mode button desc for Live Chat
# ===================================================================

old_livechat_desc = """{id:'livechat', icon:'\U0001f4ac', title:'Live Chat', desc:'Real-time translated conversation'}"""
new_livechat_desc = """{id:'livechat', icon:'\U0001f4ac', title:'Live Chat', desc:'Face-to-face translation with TTS'}"""

if old_livechat_desc in content:
    content = content.replace(old_livechat_desc, new_livechat_desc, 1)
    changes += 1
    print("2: Updated Live Chat mode description")
else:
    print("2: SKIP - livechat desc not found")

# ===================================================================
# 3. Replace the Firebase-based chat panel with Face-to-Face panel
# ===================================================================

old_chat_panel_start = """              {/* \u2550\u2550\u2550 Live Chat Mode \u2550\u2550\u2550 */}
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
                  </div>"""

# Find the end of the old chat panel
old_chat_end_marker = """                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'8px',padding:'0 4px'}}>
                    <span style={{fontSize:'11px',color:'#475569'}}>
                      {activeSessionCode ? '\U0001f7e2 Live \u2014 ' + bridgeChatMessages.length + ' messages' : '\U0001f534 No active session'}
                    </span>
                    <span style={{fontSize:'11px',color:'#475569'}}>
                      Press Enter to send \u2022 Auto-translated per group language
                    </span>
                  </div>
                </div>
              )}"""

# Find positions of old chat panel
start_pos = content.find(old_chat_panel_start)
end_pos = content.find(old_chat_end_marker)

if start_pos > -1 and end_pos > -1:
    end_pos += len(old_chat_end_marker)
    
    new_f2f_panel = """              {/* \u2550\u2550\u2550 Face-to-Face Translation Mode \u2550\u2550\u2550 */}
              {bridgeChatOpen && (
                <div style={{marginTop:'20px',borderTop:'1px solid rgba(20,184,166,0.15)',paddingTop:'20px'}}>
                  {/* Header */}
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
                    <h3 style={{margin:0,fontSize:'16px',fontWeight:800,color:typeof _bt!=='undefined'?_bt.textAccent:'#5eead4',display:'flex',alignItems:'center',gap:'8px'}}>
                      <span>\U0001f310</span> Face-to-Face Translation
                    </h3>
                    <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                      <select
                        value={bridgeF2FLang}
                        onChange={(e) => setBridgeF2FLang(e.target.value)}
                        style={{background:typeof _bt!=='undefined'?_bt.inputBg:'rgba(255,255,255,0.04)',border:typeof _bt!=='undefined'?_bt.inputBorder:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'6px 10px',color:typeof _bt!=='undefined'?_bt.inputText:'#e2e8f0',fontSize:'12px',fontWeight:600,cursor:'pointer',outline:'none'}}
                      >
                        {['Spanish','French','Arabic','Somali','Vietnamese','Portuguese','Mandarin','Korean','Tagalog','Russian','Japanese','Haitian Creole','Swahili','Hmong','Burmese','Nepali'].map(lang => (
                          <option key={lang} value={lang} style={{background:typeof _bt!=='undefined'?_bt.selectBg:'#1e293b',color:typeof _bt!=='undefined'?_bt.selectText:'#e2e8f0'}}>{lang}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => { setBridgeChatOpen(false); setBridgeChatMessages([]); setBridgeF2FListening(null); }}
                        style={{background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)',color:'#fca5a5',padding:'6px 14px',borderRadius:'10px',fontSize:'12px',fontWeight:700,cursor:'pointer'}}
                      >End</button>
                    </div>
                  </div>

                  <div style={{fontSize:'11px',color:typeof _bt!=='undefined'?_bt.textMuted:'#64748b',marginBottom:'12px',textAlign:'center',fontStyle:'italic'}}>
                    \U0001f512 FERPA-Safe \u2014 No student data leaves this device \u2022 Both sides speak or type in their own language
                  </div>

                  {/* Conversation Messages */}
                  <div id="bridge-f2f-messages" style={{
                    background:'rgba(0,0,0,0.15)',border:'1px solid rgba(255,255,255,0.04)',borderRadius:'16px',
                    padding:'16px',maxHeight:'300px',overflowY:'auto',marginBottom:'16px',
                    display:'flex',flexDirection:'column',gap:'12px'
                  }}>
                    {bridgeChatMessages.length === 0 ? (
                      <div style={{textAlign:'center',padding:'40px 20px',color:'#475569'}}>
                        <div style={{fontSize:'40px',marginBottom:'8px'}}>\U0001f91d</div>
                        <div style={{fontSize:'14px',fontWeight:700}}>Ready for conversation</div>
                        <div style={{fontSize:'12px',marginTop:'6px',lineHeight:1.5}}>Teacher speaks English \u2022 Student speaks {bridgeF2FLang}<br/>Press the microphone or type to begin</div>
                      </div>
                    ) : (
                      bridgeChatMessages.map((msg, ci) => (
                        <div key={ci} style={{
                          display:'flex',flexDirection:'column',
                          alignItems: msg.sender === 'teacher' ? 'flex-end' : 'flex-start',
                          gap:'4px'
                        }}>
                          <div style={{
                            maxWidth:'85%',
                            background: msg.sender === 'teacher'
                              ? 'linear-gradient(135deg, rgba(20,184,166,0.15), rgba(13,148,136,0.1))'
                              : 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(79,70,229,0.1))',
                            border: '1px solid ' + (msg.sender === 'teacher' ? 'rgba(20,184,166,0.2)' : 'rgba(99,102,241,0.2)'),
                            borderRadius: msg.sender === 'teacher' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            padding:'14px 18px'
                          }}>
                            <div style={{fontSize:'10px',fontWeight:700,color:msg.sender === 'teacher' ? '#5eead4' : '#a5b4fc',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.08em'}}>
                              {msg.sender === 'teacher' ? '\U0001f1fa\U0001f1f8 Teacher (English)' : '\U0001f310 Student (' + bridgeF2FLang + ')'}
                            </div>
                            <div style={{fontSize:'16px',color:'#e2e8f0',lineHeight:1.6,fontWeight:500}}>
                              {msg.text}
                            </div>
                            {msg.translated && (
                              <div style={{marginTop:'10px',paddingTop:'10px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                                <div style={{fontSize:'10px',fontWeight:700,color:msg.sender === 'teacher' ? '#a5b4fc' : '#5eead4',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.08em'}}>
                                  {msg.sender === 'teacher' ? '\U0001f30d ' + bridgeF2FLang : '\U0001f1fa\U0001f1f8 English'}
                                </div>
                                <div style={{fontSize:'16px',color:msg.sender === 'teacher' ? '#c7d2fe' : '#99f6e4',lineHeight:1.6,fontWeight:500}}>
                                  {msg.translated}
                                </div>
                              </div>
                            )}
                            {msg.translating && (
                              <div style={{marginTop:'8px',fontSize:'12px',color:'#64748b',fontStyle:'italic'}}>
                                \u23f3 Translating...
                              </div>
                            )}
                            {/* Audio playback button */}
                            {msg.translated && (
                              <div style={{marginTop:'8px',display:'flex',gap:'6px'}}>
                                <button
                                  onClick={() => handleAudio(msg.text)}
                                  style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#94a3b8',padding:'4px 10px',borderRadius:'8px',fontSize:'11px',cursor:'pointer',display:'flex',alignItems:'center',gap:'4px'}}
                                >\U0001f50a {msg.sender === 'teacher' ? 'EN' : bridgeF2FLang.slice(0,2).toUpperCase()}</button>
                                <button
                                  onClick={() => handleAudio(msg.translated)}
                                  style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#94a3b8',padding:'4px 10px',borderRadius:'8px',fontSize:'11px',cursor:'pointer',display:'flex',alignItems:'center',gap:'4px'}}
                                >\U0001f50a {msg.sender === 'teacher' ? bridgeF2FLang.slice(0,2).toUpperCase() : 'EN'}</button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Two-sided Input */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                    {/* Teacher Input (English) */}
                    <div style={{position:'relative'}}>
                      <div style={{fontSize:'11px',fontWeight:700,color:'#5eead4',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'6px',display:'flex',alignItems:'center',gap:'6px'}}>
                        \U0001f1fa\U0001f1f8 Teacher (English)
                      </div>
                      <div style={{display:'flex',gap:'6px'}}>
                        <input
                          id="bridge-f2f-teacher-input"
                          type="text"
                          placeholder="Type or speak..."
                          disabled={bridgeF2FTranslating}
                          onKeyDown={async (e) => {
                            if (e.key !== 'Enter' || !e.target.value.trim() || bridgeF2FTranslating) return;
                            const text = e.target.value.trim();
                            e.target.value = '';
                            const msgId = Date.now();
                            setBridgeChatMessages(prev => [...prev, {id:msgId, sender:'teacher', text, translating:true, timestamp:Date.now()}]);
                            setBridgeF2FTranslating(true);
                            setTimeout(() => { const c = document.getElementById('bridge-f2f-messages'); if(c) c.scrollTop = c.scrollHeight; }, 50);
                            try {
                              const translated = await callGemini('Translate the following English text to ' + bridgeF2FLang + '. Return ONLY the translation, no explanations:\\n\\n' + text, false, false, 0.3);
                              setBridgeChatMessages(prev => prev.map(m => m.id === msgId ? {...m, translated, translating:false} : m));
                              setTimeout(() => { const c = document.getElementById('bridge-f2f-messages'); if(c) c.scrollTop = c.scrollHeight; }, 50);
                              // Auto TTS: play the translated text so student hears it
                              try { await handleAudio(translated); } catch(e2) { warnLog('F2F TTS error', e2); }
                            } catch(err) {
                              setBridgeChatMessages(prev => prev.map(m => m.id === msgId ? {...m, translated:'[Translation failed]', translating:false} : m));
                              addToast('Translation failed: ' + err.message, 'error');
                            }
                            setBridgeF2FTranslating(false);
                          }}
                          style={{
                            flex:1,background:'rgba(20,184,166,0.06)',border:'1px solid rgba(20,184,166,0.15)',
                            borderRadius:'12px',padding:'12px 14px',color:'#e2e8f0',fontSize:'14px',
                            outline:'none',fontFamily:'inherit',opacity:bridgeF2FTranslating?0.5:1
                          }}
                          onFocus={(e) => e.target.style.borderColor = 'rgba(20,184,166,0.4)'}
                          onBlur={(e) => e.target.style.borderColor = 'rgba(20,184,166,0.15)'}
                        />
                        <button
                          disabled={bridgeF2FTranslating}
                          onClick={() => {
                            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
                            if (!SR) { addToast('Speech recognition not supported in this browser', 'error'); return; }
                            if (bridgeF2FListening === 'teacher') { setBridgeF2FListening(null); return; }
                            const rec = new SR();
                            rec.lang = 'en-US';
                            rec.interimResults = false;
                            rec.maxAlternatives = 1;
                            setBridgeF2FListening('teacher');
                            rec.onresult = (event) => {
                              const text = event.results[0][0].transcript;
                              const input = document.getElementById('bridge-f2f-teacher-input');
                              if (input) { input.value = text; input.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter',bubbles:true})); }
                            };
                            rec.onerror = () => setBridgeF2FListening(null);
                            rec.onend = () => setBridgeF2FListening(null);
                            rec.start();
                          }}
                          style={{
                            background: bridgeF2FListening === 'teacher' ? 'rgba(239,68,68,0.3)' : 'rgba(20,184,166,0.15)',
                            border:'1px solid ' + (bridgeF2FListening === 'teacher' ? 'rgba(239,68,68,0.4)' : 'rgba(20,184,166,0.25)'),
                            borderRadius:'12px',padding:'12px 14px',cursor:'pointer',fontSize:'18px',
                            animation: bridgeF2FListening === 'teacher' ? 'pulse 1.5s infinite' : 'none'
                          }}
                        >{bridgeF2FListening === 'teacher' ? '\U0001f534' : '\U0001f3a4'}</button>
                      </div>
                    </div>

                    {/* Student Input (Their Language) */}
                    <div style={{position:'relative'}}>
                      <div style={{fontSize:'11px',fontWeight:700,color:'#a5b4fc',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'6px',display:'flex',alignItems:'center',gap:'6px'}}>
                        \U0001f310 Student ({bridgeF2FLang})
                      </div>
                      <div style={{display:'flex',gap:'6px'}}>
                        <input
                          id="bridge-f2f-student-input"
                          type="text"
                          placeholder={'Type in ' + bridgeF2FLang + '...'}
                          disabled={bridgeF2FTranslating}
                          onKeyDown={async (e) => {
                            if (e.key !== 'Enter' || !e.target.value.trim() || bridgeF2FTranslating) return;
                            const text = e.target.value.trim();
                            e.target.value = '';
                            const msgId = Date.now();
                            setBridgeChatMessages(prev => [...prev, {id:msgId, sender:'student', text, translating:true, timestamp:Date.now()}]);
                            setBridgeF2FTranslating(true);
                            setTimeout(() => { const c = document.getElementById('bridge-f2f-messages'); if(c) c.scrollTop = c.scrollHeight; }, 50);
                            try {
                              const translated = await callGemini('Translate the following ' + bridgeF2FLang + ' text to English. Return ONLY the translation, no explanations:\\n\\n' + text, false, false, 0.3);
                              setBridgeChatMessages(prev => prev.map(m => m.id === msgId ? {...m, translated, translating:false} : m));
                              setTimeout(() => { const c = document.getElementById('bridge-f2f-messages'); if(c) c.scrollTop = c.scrollHeight; }, 50);
                              // Auto TTS: play the English translation so teacher hears it
                              try { await handleAudio(translated); } catch(e2) { warnLog('F2F TTS error', e2); }
                            } catch(err) {
                              setBridgeChatMessages(prev => prev.map(m => m.id === msgId ? {...m, translated:'[Translation failed]', translating:false} : m));
                              addToast('Translation failed: ' + err.message, 'error');
                            }
                            setBridgeF2FTranslating(false);
                          }}
                          style={{
                            flex:1,background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.15)',
                            borderRadius:'12px',padding:'12px 14px',color:'#e2e8f0',fontSize:'14px',
                            outline:'none',fontFamily:'inherit',opacity:bridgeF2FTranslating?0.5:1
                          }}
                          onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.4)'}
                          onBlur={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.15)'}
                        />
                        <button
                          disabled={bridgeF2FTranslating}
                          onClick={() => {
                            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
                            if (!SR) { addToast('Speech recognition not supported in this browser', 'error'); return; }
                            if (bridgeF2FListening === 'student') { setBridgeF2FListening(null); return; }
                            const rec = new SR();
                            const langCodes = {'Spanish':'es-ES','French':'fr-FR','Arabic':'ar-SA','Somali':'so-SO','Vietnamese':'vi-VN','Portuguese':'pt-BR','Mandarin':'zh-CN','Korean':'ko-KR','Tagalog':'tl-PH','Russian':'ru-RU','Japanese':'ja-JP','Haitian Creole':'ht-HT','Swahili':'sw-KE','Hmong':'hmn','Burmese':'my-MM','Nepali':'ne-NP'};
                            rec.lang = langCodes[bridgeF2FLang] || 'es-ES';
                            rec.interimResults = false;
                            rec.maxAlternatives = 1;
                            setBridgeF2FListening('student');
                            rec.onresult = (event) => {
                              const text = event.results[0][0].transcript;
                              const input = document.getElementById('bridge-f2f-student-input');
                              if (input) { input.value = text; input.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter',bubbles:true})); }
                            };
                            rec.onerror = () => setBridgeF2FListening(null);
                            rec.onend = () => setBridgeF2FListening(null);
                            rec.start();
                          }}
                          style={{
                            background: bridgeF2FListening === 'student' ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.15)',
                            border:'1px solid ' + (bridgeF2FListening === 'student' ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.25)'),
                            borderRadius:'12px',padding:'12px 14px',cursor:'pointer',fontSize:'18px',
                            animation: bridgeF2FListening === 'student' ? 'pulse 1.5s infinite' : 'none'
                          }}
                        >{bridgeF2FListening === 'student' ? '\U0001f534' : '\U0001f3a4'}</button>
                      </div>
                    </div>
                  </div>

                  {/* Status Bar */}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'10px',padding:'0 4px'}}>
                    <span style={{fontSize:'11px',color:'#475569'}}>
                      \U0001f512 Local only \u2022 {bridgeChatMessages.length} messages \u2022 {bridgeF2FTranslating ? '\u23f3 Translating...' : '\u2705 Ready'}
                    </span>
                    <span style={{fontSize:'11px',color:'#475569'}}>
                      \U0001f50a TTS auto-plays \u2022 \U0001f3a4 Hold mic to speak \u2022 Enter to send
                    </span>
                  </div>
                </div>
              )}"""

    content = content[:start_pos] + new_f2f_panel + content[end_pos:]
    changes += 1
    print("3: Replaced Firebase chat with Face-to-Face Translation panel")
else:
    if start_pos == -1:
        print("3: SKIP - chat panel start not found")
    else:
        print("3: SKIP - chat panel end not found")

# ===================================================================
# 4. Remove the Firebase chat write from mode click handler
#    (livechat mode should NOT write to Firebase anymore)
# ===================================================================

# The old handler writes to Firebase bridgeChat — remove that for F2F mode
# The student-side listener we added for bridgeChat should remain for
# the broadcast "all groups" path, but the livechat mode is now local-only

# Update the mode click to NOT send to Firebase when in livechat
old_mode_handler = """window.__bridgeMode = m.id;
                        if (m.id === 'livechat') { setBridgeChatOpen(true); } else { setBridgeChatOpen(false); }"""

new_mode_handler = """window.__bridgeMode = m.id;
                        if (m.id === 'livechat') { setBridgeChatOpen(true); setBridgeChatMessages([]); } else { setBridgeChatOpen(false); }"""

if old_mode_handler in content:
    content = content.replace(old_mode_handler, new_mode_handler, 1)
    changes += 1
    print("4: Updated mode click handler to clear messages on open")
else:
    print("4: SKIP - mode handler not found")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied for Face-to-Face Translation Mode.")
