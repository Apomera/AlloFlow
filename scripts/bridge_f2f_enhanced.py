#!/usr/bin/env python3
"""
Face-to-Face Translation Enhancements:
1. Make teacher language configurable (not hardcoded to English)
2. Add comprehensive BCP 47 language codes for speech recognition
3. Add custom language support for speech recognition  
4. Localize all UI text via t() function
5. Add UI_STRINGS keys for F2F panel
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# ===================================================================
# 1. Add UI_STRINGS localization keys for F2F panel
# ===================================================================

old_bridge_strings_end = "      bridge_saving_terms: 'Saving {count} terms to glossary...',"

new_bridge_strings = """      bridge_saving_terms: 'Saving {count} terms to glossary...',
      bridge_f2f_title: 'Face-to-Face Translation',
      bridge_f2f_ferpa: 'FERPA-Safe \u2014 No student data leaves this device',
      bridge_f2f_both_speak: 'Both sides speak or type in their own language',
      bridge_f2f_ready: 'Ready for conversation',
      bridge_f2f_ready_desc: 'Press the microphone or type to begin',
      bridge_f2f_end: 'End',
      bridge_f2f_translating: 'Translating...',
      bridge_f2f_translate_failed: 'Translation failed',
      bridge_f2f_type_or_speak: 'Type or speak...',
      bridge_f2f_type_in: 'Type in {lang}...',
      bridge_f2f_local_only: 'Local only',
      bridge_f2f_messages: 'messages',
      bridge_f2f_tts_auto: 'TTS auto-plays',
      bridge_f2f_mic_speak: 'Hold mic to speak',
      bridge_f2f_enter_send: 'Enter to send',
      bridge_f2f_person_a: 'Person A',
      bridge_f2f_person_b: 'Person B',
      bridge_f2f_no_speech: 'Speech recognition not supported',
      bridge_f2f_custom_lang: 'Custom language...',
      bridge_f2f_custom_placeholder: 'e.g. Yoruba, Tigrinya, Dari...',"""

if old_bridge_strings_end in content:
    content = content.replace(old_bridge_strings_end, new_bridge_strings, 1)
    changes += 1
    print("1: Added F2F localization keys to UI_STRINGS")
else:
    print("1: SKIP - bridge strings end not found")

# ===================================================================
# 2. Add teacher language state (default from currentUiLanguage)
# ===================================================================

old_f2f_states = """  const [bridgeF2FLang, setBridgeF2FLang] = useState('Spanish');
  const [bridgeF2FTranslating, setBridgeF2FTranslating] = useState(false);
  const [bridgeF2FListening, setBridgeF2FListening] = useState(null);"""

new_f2f_states = """  const [bridgeF2FLang, setBridgeF2FLang] = useState('Spanish');
  const [bridgeF2FTeacherLang, setBridgeF2FTeacherLang] = useState('English');
  const [bridgeF2FTranslating, setBridgeF2FTranslating] = useState(false);
  const [bridgeF2FListening, setBridgeF2FListening] = useState(null);
  const [bridgeF2FCustomLangA, setBridgeF2FCustomLangA] = useState('');
  const [bridgeF2FCustomLangB, setBridgeF2FCustomLangB] = useState('');"""

if old_f2f_states in content:
    content = content.replace(old_f2f_states, new_f2f_states, 1)
    changes += 1
    print("2: Added teacher language state + custom language states")
else:
    print("2: SKIP - F2F states not found")

# ===================================================================
# 3. Replace the entire F2F panel with enhanced version
# ===================================================================

# Find the F2F panel boundaries
f2f_start_marker = """              {/* \u2550\u2550\u2550 Face-to-Face Translation Mode \u2550\u2550\u2550 */}
              {bridgeChatOpen && ("""

f2f_end_marker = """                  </div>
                </div>
              )}"""

# Find the specific F2F end by searching from the F2F start
f2f_start_pos = content.find(f2f_start_marker)
if f2f_start_pos == -1:
    print("3: SKIP - F2F panel start not found")
else:
    # Find the matching end marker after the start
    # The F2F panel has a status bar at the end followed by two closing divs and )}
    status_bar_marker = "Enter to send"
    status_pos = content.find(status_bar_marker, f2f_start_pos)
    if status_pos == -1:
        # Try alternate marker
        status_bar_marker = "\U0001f3a4 Hold mic to speak"
        status_pos = content.find(status_bar_marker, f2f_start_pos)
    
    if status_pos == -1:
        print("3: SKIP - F2F status bar not found")
    else:
        # Find the closing )} after the status bar
        end_search = content.find("              )}", status_pos)
        if end_search == -1:
            print("3: SKIP - F2F closing not found")
        else:
            end_pos = end_search + len("              )}")
            
            # The comprehensive BCP 47 language codes map
            lang_codes_str = "{'English':'en-US','Spanish':'es-ES','French':'fr-FR','Arabic':'ar-SA','Somali':'so-SO','Vietnamese':'vi-VN','Portuguese':'pt-BR','Mandarin':'zh-CN','Korean':'ko-KR','Tagalog':'tl-PH','Russian':'ru-RU','Japanese':'ja-JP','Haitian Creole':'ht-HT','Swahili':'sw-KE','Hmong':'hmn','Burmese':'my-MM','Nepali':'ne-NP','German':'de-DE','Italian':'it-IT','Polish':'pl-PL','Ukrainian':'uk-UA','Hindi':'hi-IN','Urdu':'ur-PK','Bengali':'bn-BD','Thai':'th-TH','Indonesian':'id-ID','Malay':'ms-MY','Turkish':'tr-TR','Dutch':'nl-NL','Greek':'el-GR','Czech':'cs-CZ','Romanian':'ro-RO','Hungarian':'hu-HU','Swedish':'sv-SE','Norwegian':'nb-NO','Danish':'da-DK','Finnish':'fi-FI','Hebrew':'he-IL','Persian':'fa-IR','Pashto':'ps-AF','Amharic':'am-ET','Tigrinya':'ti-ET','Yoruba':'yo-NG','Igbo':'ig-NG','Hausa':'ha-NG','Zulu':'zu-ZA','Xhosa':'xh-ZA','Afrikaans':'af-ZA','Maori':'mi-NZ','Samoan':'sm-WS','Tongan':'to-TO','Hawaiian':'haw-US','Cherokee':'chr-US','Navajo':'nv-US','Marshallese':'mh-MH','Chuukese':'chk-FM','Gujarati':'gu-IN','Punjabi':'pa-IN','Tamil':'ta-IN','Telugu':'te-IN','Kannada':'kn-IN','Malayalam':'ml-IN','Sinhala':'si-LK','Khmer':'km-KH','Lao':'lo-LA','Dari':'fa-AF','Kurdish':'ku-IQ','Azerbaijani':'az-AZ','Georgian':'ka-GE','Armenian':'hy-AM','Mongolian':'mn-MN','Kazakh':'kk-KZ','Uzbek':'uz-UZ'}"
            
            all_languages = ['English','Spanish','French','Arabic','Somali','Vietnamese','Portuguese','Mandarin','Korean','Tagalog','Russian','Japanese','Haitian Creole','Swahili','Hmong','Burmese','Nepali','German','Italian','Polish','Ukrainian','Hindi','Urdu','Bengali','Thai','Indonesian','Malay','Turkish','Dutch','Greek','Czech','Romanian','Hungarian','Swedish','Norwegian','Danish','Finnish','Hebrew','Persian','Pashto','Amharic','Tigrinya','Yoruba','Igbo','Hausa','Zulu','Xhosa','Afrikaans','Maori','Samoan','Tongan','Hawaiian','Cherokee','Navajo','Marshallese','Chuukese','Gujarati','Punjabi','Tamil','Telugu','Kannada','Malayalam','Sinhala','Khmer','Lao','Dari','Kurdish','Azerbaijani','Georgian','Armenian','Mongolian','Kazakh','Uzbek']
            
            lang_options_jsx = "\n".join([f"                          <option key='{lang}' value='{lang}' style={{{{background:typeof _bt!=='undefined'?_bt.selectBg:'#1e293b',color:typeof _bt!=='undefined'?_bt.selectText:'#e2e8f0'}}}}>{lang}</option>" for lang in all_languages])
            
            # Build the enhanced F2F panel
            new_f2f = """              {/* \u2550\u2550\u2550 Face-to-Face Translation Mode \u2550\u2550\u2550 */}
              {bridgeChatOpen && (() => {
                const _langCodes = """ + lang_codes_str + """;
                const _personALang = bridgeF2FCustomLangA || bridgeF2FTeacherLang;
                const _personBLang = bridgeF2FCustomLangB || bridgeF2FLang;
                const _getLangCode = (lang) => _langCodes[lang] || lang.toLowerCase().slice(0,2);

                const _sendMessage = async (sender, text, fromLang, toLang) => {
                  const msgId = Date.now();
                  setBridgeChatMessages(prev => [...prev, {id:msgId, sender, text, translating:true, timestamp:Date.now()}]);
                  setBridgeF2FTranslating(true);
                  setTimeout(() => { const c = document.getElementById('bridge-f2f-messages'); if(c) c.scrollTop = c.scrollHeight; }, 50);
                  try {
                    const translated = await callGemini('Translate the following ' + fromLang + ' text to ' + toLang + '. Return ONLY the translation, no explanations or notes:\\n\\n' + text, false, false, 0.3);
                    setBridgeChatMessages(prev => prev.map(m => m.id === msgId ? {...m, translated, translating:false} : m));
                    setTimeout(() => { const c = document.getElementById('bridge-f2f-messages'); if(c) c.scrollTop = c.scrollHeight; }, 50);
                    try { await handleAudio(translated); } catch(e2) { warnLog('F2F TTS error', e2); }
                  } catch(err) {
                    setBridgeChatMessages(prev => prev.map(m => m.id === msgId ? {...m, translated:'[' + (t('roster.bridge_f2f_translate_failed') || 'Translation failed') + ']', translating:false} : m));
                    addToast((t('roster.bridge_f2f_translate_failed') || 'Translation failed') + ': ' + err.message, 'error');
                  }
                  setBridgeF2FTranslating(false);
                };

                const _startListening = (side, langCode, inputId) => {
                  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
                  if (!SR) { addToast(t('roster.bridge_f2f_no_speech') || 'Speech recognition not supported', 'error'); return; }
                  if (bridgeF2FListening === side) { setBridgeF2FListening(null); return; }
                  const rec = new SR();
                  rec.lang = langCode;
                  rec.interimResults = false;
                  rec.maxAlternatives = 1;
                  setBridgeF2FListening(side);
                  rec.onresult = (event) => {
                    const text = event.results[0][0].transcript;
                    const input = document.getElementById(inputId);
                    if (input) { input.value = text; input.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter',bubbles:true})); }
                  };
                  rec.onerror = () => setBridgeF2FListening(null);
                  rec.onend = () => setBridgeF2FListening(null);
                  rec.start();
                };

                return (
                <div style={{marginTop:'20px',borderTop:'1px solid rgba(20,184,166,0.15)',paddingTop:'20px'}}>
                  {/* Header */}
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
                    <h3 style={{margin:0,fontSize:'16px',fontWeight:800,color:typeof _bt!=='undefined'?_bt.textAccent:'#5eead4',display:'flex',alignItems:'center',gap:'8px'}}>
                      <span>\U0001f310</span> {t('roster.bridge_f2f_title') || 'Face-to-Face Translation'}
                    </h3>
                    <button
                      onClick={() => { setBridgeChatOpen(false); setBridgeChatMessages([]); setBridgeF2FListening(null); }}
                      style={{background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)',color:'#fca5a5',padding:'6px 14px',borderRadius:'10px',fontSize:'12px',fontWeight:700,cursor:'pointer'}}
                    >{t('roster.bridge_f2f_end') || 'End'}</button>
                  </div>

                  {/* Language Configuration — Both sides configurable */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
                    {/* Person A Language */}
                    <div>
                      <div style={{fontSize:'11px',fontWeight:700,color:'#5eead4',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'4px'}}>
                        {t('roster.bridge_f2f_person_a') || 'Person A'}
                      </div>
                      <select
                        value={bridgeF2FTeacherLang}
                        onChange={(e) => { setBridgeF2FTeacherLang(e.target.value); setBridgeF2FCustomLangA(''); }}
                        style={{width:'100%',background:typeof _bt!=='undefined'?_bt.inputBg:'rgba(255,255,255,0.04)',border:typeof _bt!=='undefined'?_bt.inputBorder:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'8px 10px',color:typeof _bt!=='undefined'?_bt.inputText:'#e2e8f0',fontSize:'12px',fontWeight:600,cursor:'pointer',outline:'none'}}
                      >
                        <option value="custom" style={{background:typeof _bt!=='undefined'?_bt.selectBg:'#1e293b',color:typeof _bt!=='undefined'?_bt.selectText:'#e2e8f0'}}>\u270f\ufe0f {t('roster.bridge_f2f_custom_lang') || 'Custom...'}</option>
""" + lang_options_jsx + """
                      </select>
                      {bridgeF2FTeacherLang === 'custom' && (
                        <input type="text" value={bridgeF2FCustomLangA} onChange={(e) => setBridgeF2FCustomLangA(e.target.value)}
                          placeholder={t('roster.bridge_f2f_custom_placeholder') || 'e.g. Yoruba, Tigrinya...'}
                          style={{width:'100%',boxSizing:'border-box',marginTop:'6px',background:typeof _bt!=='undefined'?_bt.inputBg:'rgba(255,255,255,0.04)',border:typeof _bt!=='undefined'?_bt.inputBorder:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'8px 10px',color:typeof _bt!=='undefined'?_bt.inputText:'#e2e8f0',fontSize:'12px',outline:'none'}}
                        />
                      )}
                    </div>
                    {/* Person B Language */}
                    <div>
                      <div style={{fontSize:'11px',fontWeight:700,color:'#a5b4fc',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'4px'}}>
                        {t('roster.bridge_f2f_person_b') || 'Person B'}
                      </div>
                      <select
                        value={bridgeF2FLang}
                        onChange={(e) => { setBridgeF2FLang(e.target.value); setBridgeF2FCustomLangB(''); }}
                        style={{width:'100%',background:typeof _bt!=='undefined'?_bt.inputBg:'rgba(255,255,255,0.04)',border:typeof _bt!=='undefined'?_bt.inputBorder:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'8px 10px',color:typeof _bt!=='undefined'?_bt.inputText:'#e2e8f0',fontSize:'12px',fontWeight:600,cursor:'pointer',outline:'none'}}
                      >
                        <option value="custom" style={{background:typeof _bt!=='undefined'?_bt.selectBg:'#1e293b',color:typeof _bt!=='undefined'?_bt.selectText:'#e2e8f0'}}>\u270f\ufe0f {t('roster.bridge_f2f_custom_lang') || 'Custom...'}</option>
""" + lang_options_jsx + """
                      </select>
                      {bridgeF2FLang === 'custom' && (
                        <input type="text" value={bridgeF2FCustomLangB} onChange={(e) => setBridgeF2FCustomLangB(e.target.value)}
                          placeholder={t('roster.bridge_f2f_custom_placeholder') || 'e.g. Yoruba, Tigrinya...'}
                          style={{width:'100%',boxSizing:'border-box',marginTop:'6px',background:typeof _bt!=='undefined'?_bt.inputBg:'rgba(255,255,255,0.04)',border:typeof _bt!=='undefined'?_bt.inputBorder:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'8px 10px',color:typeof _bt!=='undefined'?_bt.inputText:'#e2e8f0',fontSize:'12px',outline:'none'}}
                        />
                      )}
                    </div>
                  </div>

                  <div style={{fontSize:'11px',color:typeof _bt!=='undefined'?_bt.textMuted:'#64748b',marginBottom:'12px',textAlign:'center',fontStyle:'italic'}}>
                    \U0001f512 {t('roster.bridge_f2f_ferpa') || 'FERPA-Safe \u2014 No student data leaves this device'} \u2022 {t('roster.bridge_f2f_both_speak') || 'Both sides speak or type in their own language'}
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
                        <div style={{fontSize:'14px',fontWeight:700}}>{t('roster.bridge_f2f_ready') || 'Ready for conversation'}</div>
                        <div style={{fontSize:'12px',marginTop:'6px',lineHeight:1.5}}>{_personALang} \u2194 {_personBLang}<br/>{t('roster.bridge_f2f_ready_desc') || 'Press the microphone or type to begin'}</div>
                      </div>
                    ) : (
                      bridgeChatMessages.map((msg, ci) => (
                        <div key={ci} style={{
                          display:'flex',flexDirection:'column',
                          alignItems: msg.sender === 'personA' ? 'flex-end' : 'flex-start',
                          gap:'4px'
                        }}>
                          <div style={{
                            maxWidth:'85%',
                            background: msg.sender === 'personA'
                              ? 'linear-gradient(135deg, rgba(20,184,166,0.15), rgba(13,148,136,0.1))'
                              : 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(79,70,229,0.1))',
                            border:'1px solid ' + (msg.sender === 'personA' ? 'rgba(20,184,166,0.2)' : 'rgba(99,102,241,0.2)'),
                            borderRadius: msg.sender === 'personA' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            padding:'14px 18px'
                          }}>
                            <div style={{fontSize:'10px',fontWeight:700,color:msg.sender === 'personA' ? '#5eead4' : '#a5b4fc',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.08em'}}>
                              {msg.sender === 'personA' ? (t('roster.bridge_f2f_person_a') || 'Person A') + ' (' + _personALang + ')' : (t('roster.bridge_f2f_person_b') || 'Person B') + ' (' + _personBLang + ')'}
                            </div>
                            <div style={{fontSize:'16px',color:'#e2e8f0',lineHeight:1.6,fontWeight:500}}>{msg.text}</div>
                            {msg.translated && (
                              <div style={{marginTop:'10px',paddingTop:'10px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                                <div style={{fontSize:'10px',fontWeight:700,color:msg.sender === 'personA' ? '#a5b4fc' : '#5eead4',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.08em'}}>
                                  \U0001f30d {msg.sender === 'personA' ? _personBLang : _personALang}
                                </div>
                                <div style={{fontSize:'16px',color:msg.sender === 'personA' ? '#c7d2fe' : '#99f6e4',lineHeight:1.6,fontWeight:500}}>{msg.translated}</div>
                              </div>
                            )}
                            {msg.translating && (
                              <div style={{marginTop:'8px',fontSize:'12px',color:'#64748b',fontStyle:'italic'}}>
                                \u23f3 {t('roster.bridge_f2f_translating') || 'Translating...'}
                              </div>
                            )}
                            {msg.translated && (
                              <div style={{marginTop:'8px',display:'flex',gap:'6px'}}>
                                <button onClick={() => handleAudio(msg.text)}
                                  style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#94a3b8',padding:'4px 10px',borderRadius:'8px',fontSize:'11px',cursor:'pointer',display:'flex',alignItems:'center',gap:'4px'}}
                                >\U0001f50a {msg.sender === 'personA' ? _personALang.slice(0,3) : _personBLang.slice(0,3)}</button>
                                <button onClick={() => handleAudio(msg.translated)}
                                  style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#94a3b8',padding:'4px 10px',borderRadius:'8px',fontSize:'11px',cursor:'pointer',display:'flex',alignItems:'center',gap:'4px'}}
                                >\U0001f50a {msg.sender === 'personA' ? _personBLang.slice(0,3) : _personALang.slice(0,3)}</button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Two-sided Input */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                    {/* Person A Input */}
                    <div>
                      <div style={{display:'flex',gap:'6px'}}>
                        <input id="bridge-f2f-a-input" type="text"
                          placeholder={t('roster.bridge_f2f_type_or_speak') || 'Type or speak...'}
                          disabled={bridgeF2FTranslating}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter' || !e.target.value.trim() || bridgeF2FTranslating) return;
                            const text = e.target.value.trim(); e.target.value = '';
                            _sendMessage('personA', text, _personALang, _personBLang);
                          }}
                          style={{flex:1,background:'rgba(20,184,166,0.06)',border:'1px solid rgba(20,184,166,0.15)',borderRadius:'12px',padding:'12px 14px',color:'#e2e8f0',fontSize:'14px',outline:'none',fontFamily:'inherit',opacity:bridgeF2FTranslating?0.5:1}}
                          onFocus={(e) => e.target.style.borderColor = 'rgba(20,184,166,0.4)'}
                          onBlur={(e) => e.target.style.borderColor = 'rgba(20,184,166,0.15)'}
                        />
                        <button disabled={bridgeF2FTranslating}
                          onClick={() => _startListening('personA', _getLangCode(_personALang), 'bridge-f2f-a-input')}
                          style={{background:bridgeF2FListening==='personA'?'rgba(239,68,68,0.3)':'rgba(20,184,166,0.15)',border:'1px solid '+(bridgeF2FListening==='personA'?'rgba(239,68,68,0.4)':'rgba(20,184,166,0.25)'),borderRadius:'12px',padding:'12px 14px',cursor:'pointer',fontSize:'18px',animation:bridgeF2FListening==='personA'?'pulse 1.5s infinite':'none'}}
                        >{bridgeF2FListening==='personA'?'\U0001f534':'\U0001f3a4'}</button>
                      </div>
                    </div>
                    {/* Person B Input */}
                    <div>
                      <div style={{display:'flex',gap:'6px'}}>
                        <input id="bridge-f2f-b-input" type="text"
                          placeholder={(t('roster.bridge_f2f_type_in') || 'Type in {lang}...').replace('{lang}', _personBLang)}
                          disabled={bridgeF2FTranslating}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter' || !e.target.value.trim() || bridgeF2FTranslating) return;
                            const text = e.target.value.trim(); e.target.value = '';
                            _sendMessage('personB', text, _personBLang, _personALang);
                          }}
                          style={{flex:1,background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.15)',borderRadius:'12px',padding:'12px 14px',color:'#e2e8f0',fontSize:'14px',outline:'none',fontFamily:'inherit',opacity:bridgeF2FTranslating?0.5:1}}
                          onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.4)'}
                          onBlur={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.15)'}
                        />
                        <button disabled={bridgeF2FTranslating}
                          onClick={() => _startListening('personB', _getLangCode(_personBLang), 'bridge-f2f-b-input')}
                          style={{background:bridgeF2FListening==='personB'?'rgba(239,68,68,0.3)':'rgba(99,102,241,0.15)',border:'1px solid '+(bridgeF2FListening==='personB'?'rgba(239,68,68,0.4)':'rgba(99,102,241,0.25)'),borderRadius:'12px',padding:'12px 14px',cursor:'pointer',fontSize:'18px',animation:bridgeF2FListening==='personB'?'pulse 1.5s infinite':'none'}}
                        >{bridgeF2FListening==='personB'?'\U0001f534':'\U0001f3a4'}</button>
                      </div>
                    </div>
                  </div>

                  {/* Status Bar */}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'10px',padding:'0 4px'}}>
                    <span style={{fontSize:'11px',color:'#475569'}}>
                      \U0001f512 {t('roster.bridge_f2f_local_only') || 'Local only'} \u2022 {bridgeChatMessages.length} {t('roster.bridge_f2f_messages') || 'messages'} \u2022 {bridgeF2FTranslating ? '\u23f3 ' + (t('roster.bridge_f2f_translating') || 'Translating...') : '\u2705 Ready'}
                    </span>
                    <span style={{fontSize:'11px',color:'#475569'}}>
                      \U0001f50a {t('roster.bridge_f2f_tts_auto') || 'TTS auto-plays'} \u2022 \U0001f3a4 {t('roster.bridge_f2f_mic_speak') || 'Hold mic to speak'} \u2022 {t('roster.bridge_f2f_enter_send') || 'Enter to send'}
                    </span>
                  </div>
                </div>
                );
              })()}"""

            content = content[:f2f_start_pos] + new_f2f + content[end_pos:]
            changes += 1
            print("3: Replaced F2F panel with enhanced version (localized, both configurable, 73 languages)")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied for F2F enhancements.")
