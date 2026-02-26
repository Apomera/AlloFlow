#!/usr/bin/env python3
"""
Bridge Mode Panel Redesign
- Larger panel (720px), bigger textarea (6 rows, min-height 160px)
- DOM-based mode buttons (no React state re-renders)
- Glass-morphism aesthetics with teal accents (all inline styles)
- UX: settings summary, char count, mode descriptions, loading state
- Cleanup: remove debug artifacts (red border, alert, gate log)
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# ===================================================================
# STEP 1: Find and replace the ENTIRE bridge send panel block
# ===================================================================
# The block starts at: {bridgeSendOpen && isTeacherMode && (
# and ends at the closing: )}
# We'll find the start marker and the corresponding end

start_marker = "      {bridgeSendOpen && isTeacherMode && ("
# Find the position of the start marker near line 76280
start_idx = content.find(start_marker, 300000)  # after line ~45000+
if start_idx == -1:
    print("ERROR: Could not find bridge send panel start marker")
    sys.exit(1)

# Find the closing of this block - it's the "      )}" on its own line
# after the </div></div> close
# We know the block ends around line 76510 original
close_marker = "\n      )}\n"
# Search for the close marker after the bridge-send-btn button
send_btn_text = "bridge_send_btn"
btn_idx = content.find(send_btn_text, start_idx)
if btn_idx == -1:
    print("ERROR: Could not find send button text")
    sys.exit(1)

# Find the close marker after the send button area
close_idx = content.find(close_marker, btn_idx)
if close_idx == -1:
    print("ERROR: Could not find closing marker")
    sys.exit(1)
close_idx += len(close_marker)

print(f"Found bridge panel block: chars {start_idx} to {close_idx}")
print(f"Block length: {close_idx - start_idx} chars")

# ===================================================================
# STEP 2: Build the new panel JSX
# ===================================================================

new_panel = r"""      {bridgeSendOpen && isTeacherMode && (

        <div
          style={{position:'fixed',inset:0,zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(2,6,23,0.75)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)'}}
          onClick={(e) => { if (e.target === e.currentTarget) setBridgeSendOpen(false); }}
        >

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background:'linear-gradient(145deg, rgba(15,23,42,0.97) 0%, rgba(30,41,59,0.95) 50%, rgba(15,23,42,0.97) 100%)',
              borderRadius:'24px',padding:'0',maxWidth:'720px',width:'94vw',
              maxHeight:'90vh',overflowY:'auto',
              color:'#e2e8f0',
              boxShadow:'0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(20,184,166,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
              border:'1px solid rgba(20,184,166,0.2)',
              pointerEvents:'all',position:'relative',zIndex:100000
            }}
          >
            {/* Header */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'24px 28px 20px',borderBottom:'1px solid rgba(20,184,166,0.15)'}}>
              <div>
                <h2 style={{fontSize:'20px',fontWeight:800,margin:0,color:'#5eead4',display:'flex',alignItems:'center',gap:'10px',letterSpacing:'-0.02em'}}>
                  <span style={{fontSize:'24px'}}>🌐</span> Bridge Mode
                </h2>
                <p style={{margin:'4px 0 0',fontSize:'13px',color:'#64748b',fontWeight:400}}>
                  Send bilingual content to student devices
                </p>
              </div>
              <button
                onClick={() => setBridgeSendOpen(false)}
                style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#94a3b8',width:'36px',height:'36px',borderRadius:'12px',cursor:'pointer',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s'}}
              >✕</button>
            </div>

            {/* Body */}
            <div style={{padding:'24px 28px'}}>

              {/* Textarea */}
              <div style={{position:'relative',marginBottom:'20px'}}>
                <textarea
                  id="bridge-send-textarea"
                  defaultValue=""
                  placeholder={t('roster.bridge_send_placeholder') || 'Type a concept, sentence, or instructions to send to students...'}
                  rows={6}
                  onInput={(e) => {
                    const counter = document.getElementById('bridge-char-count');
                    if (counter) counter.textContent = e.target.value.length + ' chars';
                  }}
                  style={{
                    width:'100%',boxSizing:'border-box',
                    background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',
                    borderRadius:'16px',padding:'16px 18px',paddingBottom:'32px',
                    color:'#e2e8f0',fontSize:'15px',lineHeight:1.7,
                    resize:'vertical',minHeight:'160px',
                    outline:'none',fontFamily:'inherit',
                    transition:'border-color 0.2s, box-shadow 0.2s'
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(20,184,166,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(20,184,166,0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                />
                <span id="bridge-char-count" style={{position:'absolute',bottom:'10px',right:'16px',fontSize:'11px',color:'#475569',pointerEvents:'none'}}>0 chars</span>
              </div>

              {/* Mode Selector */}
              <div style={{marginBottom:'20px'}}>
                <div style={{fontSize:'12px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'10px'}}>Generation Mode</div>
                <div id="bridge-mode-selector" style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:'10px'}}>
                  {[
                    {id:'explain', icon:'📝', title:'Explain', desc:'AI explains the concept bilingually'},
                    {id:'translate', icon:'🌐', title:'Translate', desc:'Direct translation to target language'},
                    {id:'visual', icon:'🖼️', title:'Visual + Explain', desc:'Explanation with AI-generated visual'}
                  ].map((m, mi) => (
                    <button
                      key={m.id}
                      data-bridge-mode={m.id}
                      onClick={(e) => {
                        document.querySelectorAll('[data-bridge-mode]').forEach(b => {
                          b.style.background = 'rgba(255,255,255,0.04)';
                          b.style.borderColor = 'rgba(255,255,255,0.08)';
                          b.style.color = '#94a3b8';
                          b.querySelector('[data-mode-dot]').style.background = 'rgba(255,255,255,0.1)';
                        });
                        e.currentTarget.style.background = 'rgba(20,184,166,0.12)';
                        e.currentTarget.style.borderColor = 'rgba(20,184,166,0.35)';
                        e.currentTarget.style.color = '#5eead4';
                        e.currentTarget.querySelector('[data-mode-dot]').style.background = '#14b8a6';
                        window.__bridgeMode = m.id;
                      }}
                      style={{
                        background: mi === 0 ? 'rgba(20,184,166,0.12)' : 'rgba(255,255,255,0.04)',
                        border: '1px solid ' + (mi === 0 ? 'rgba(20,184,166,0.35)' : 'rgba(255,255,255,0.08)'),
                        borderRadius:'14px',padding:'14px 12px',cursor:'pointer',
                        textAlign:'left',transition:'all 0.2s',
                        color: mi === 0 ? '#5eead4' : '#94a3b8',
                        display:'flex',flexDirection:'column',gap:'6px',
                        position:'relative'
                      }}
                    >
                      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        <span data-mode-dot="" style={{width:'8px',height:'8px',borderRadius:'50%',background: mi === 0 ? '#14b8a6' : 'rgba(255,255,255,0.1)',transition:'background 0.2s',flexShrink:0}} />
                        <span style={{fontSize:'16px'}}>{m.icon}</span>
                        <span style={{fontSize:'13px',fontWeight:700}}>{m.title}</span>
                      </div>
                      <span style={{fontSize:'11px',color:'#64748b',lineHeight:1.4}}>{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target + Settings Row */}
              <div style={{display:'flex',gap:'12px',marginBottom:'20px',flexWrap:'wrap'}}>
                <div style={{flex:'1',minWidth:'200px'}}>
                  <div style={{fontSize:'12px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'8px'}}>Target Group</div>
                  <select
                    id="bridge-target-selector"
                    defaultValue="all"
                    onChange={(e) => { window.__bridgeTarget = e.target.value; }}
                    style={{
                      width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',
                      borderRadius:'12px',padding:'10px 14px',color:'#e2e8f0',fontSize:'13px',
                      fontWeight:600,outline:'none',cursor:'pointer',appearance:'auto'
                    }}
                  >
                    <option value="all">🎯 All Groups</option>
                    {rosterKey?.groups && Object.entries(rosterKey.groups).map(([gId, g]) => (
                      <option key={gId} value={gId}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{flex:'1',minWidth:'200px'}}>
                  <div style={{fontSize:'12px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'8px'}}>Settings Preview</div>
                  <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',padding:'10px 14px',fontSize:'12px',color:'#64748b',lineHeight:1.6}}>
                    <div>🗣️ Language: <span style={{color:'#94a3b8',fontWeight:600}}>{(() => { const g = rosterKey?.groups && Object.values(rosterKey.groups)[0]; return g?.profile?.leveledTextLanguage || 'English (default)'; })()}</span></div>
                    <div>📚 Level: <span style={{color:'#94a3b8',fontWeight:600}}>{(() => { const g = rosterKey?.groups && Object.values(rosterKey.groups)[0]; return g?.profile?.gradeLevel || '5th Grade (default)'; })()}</span></div>
                  </div>
                </div>
              </div>

              {/* Offline Notice */}
              {!activeSessionCode && (
                <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 16px',marginBottom:'20px',background:'rgba(234,179,8,0.08)',border:'1px solid rgba(234,179,8,0.2)',borderRadius:'12px',fontSize:'13px',color:'#ca8a04'}}>
                  <span style={{fontSize:'18px'}}>📡</span>
                  <span>{t('roster.bridge_offline_info') || 'No live session — content will preview on this device only'}</span>
                </div>
              )}

              {/* Send Button */}
              <button
                id="bridge-send-button"
                disabled={bridgeSending}
                onClick={async () => {
                  const bridgeSendText = (document.getElementById('bridge-send-textarea') || {}).value || '';
                  if (!bridgeSendText.trim()) {
                    addToast('Please enter some text to send', 'warning');
                    return;
                  }

                  const selectedMode = window.__bridgeMode || 'explain';
                  const selectedTarget = window.__bridgeTarget || (document.getElementById('bridge-target-selector') || {}).value || 'all';

                  setBridgeSending(true);

                  try {
                    const targetGroups = selectedTarget === 'all'
                      ? Object.keys(rosterKey?.groups || {})
                      : [selectedTarget];
                    const firstGroup = rosterKey?.groups?.[targetGroups[0]];
                    const targetLang = firstGroup?.profile?.leveledTextLanguage || 'English';
                    const gradeLevel = firstGroup?.profile?.gradeLevel || '5th Grade';

                    const prompt = selectedMode === 'translate'
                      ? `Translate the following text to ${targetLang}. Keep it at ${gradeLevel} reading level. Return ONLY the translation, nothing else:\n\n${bridgeSendText}`
                      : `Explain the following concept at ${gradeLevel} reading level. Also provide a translation in ${targetLang}. Format your response as JSON: {"english": "explanation in English", "translated": "explanation in ${targetLang}", "terms": ["key", "vocabulary", "terms"]}\n\nConcept: ${bridgeSendText}`;

                    const response = await callGemini(prompt, false, false, 0.3);
                    let parsed;
                    try {
                      const jsonMatch = response.match(/\{[\s\S]*\}/);
                      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
                    } catch(e) { parsed = null; }

                    if (selectedMode === 'translate' && !parsed) {
                      parsed = { english: bridgeSendText, translated: response.trim(), terms: [] };
                    }
                    if (!parsed) {
                      parsed = { english: response.trim(), translated: '', terms: [] };
                    }

                    let imageUrl = null;
                    if (selectedMode === 'visual') {
                      try {
                        imageUrl = await callGeminiImageEdit(`Educational illustration: ${bridgeSendText}. Clear, simple, child-friendly diagram suitable for ${gradeLevel} students.`);
                      } catch(e) { warnLog('Bridge visual generation failed', e); }
                    }

                    const langNames = { 'English':'🇺🇸 English','Spanish':'🇪🇸 Español','French':'🇫🇷 Français','Arabic':'🇸🇦 العربية','Somali':'🇸🇴 Soomaali','Vietnamese':'🇻🇳 Tiếng Việt','Portuguese':'🇧🇷 Português','Mandarin':'🇨🇳 中文','Korean':'🇰🇷 한국어','Tagalog':'🇵🇭 Tagalog','Russian':'🇷🇺 Русский','Japanese':'🇯🇵 日本語' };

                    setBridgeMessage({
                      english: parsed.english || bridgeSendText,
                      translated: parsed.translated || '',
                      language: targetLang,
                      languageName: langNames[targetLang] || ('🌐 ' + targetLang),
                      imageUrl: imageUrl,
                      terms: parsed.terms || [],
                      timestamp: Date.now()
                    });

                    setBridgeSendOpen(false);
                    const _ta = document.getElementById('bridge-send-textarea');
                    if (_ta) _ta.value = '';
                    addToast(t('roster.bridge_send_success') || '✅ Bridge message generated!', 'success');

                    if (activeSessionCode) {
                      try {
                        const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
                        await updateDoc(sessionRef, {
                          bridgePayload: {
                            text: bridgeSendText,
                            mode: selectedMode,
                            targetGroup: selectedTarget,
                            timestamp: Date.now(),
                            senderName: user?.displayName || 'Teacher'
                          }
                        });
                      } catch(fbErr) { warnLog('Bridge Firebase write failed:', fbErr); }
                    }

                  } catch(err) {
                    warnLog('Bridge send failed', err);
                    addToast('Bridge send failed: ' + err.message, 'error');
                  } finally {
                    setBridgeSending(false);
                  }
                }}
                style={{
                  width:'100%',
                  background: bridgeSending ? 'rgba(20,184,166,0.3)' : 'linear-gradient(135deg, #0d9488, #14b8a6, #2dd4bf)',
                  border:'none',color:'white',padding:'16px 24px',borderRadius:'16px',
                  fontSize:'16px',fontWeight:800,cursor: bridgeSending ? 'not-allowed' : 'pointer',
                  transition:'all 0.3s',
                  boxShadow: bridgeSending ? 'none' : '0 4px 20px rgba(20,184,166,0.3), 0 0 40px rgba(20,184,166,0.1)',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',
                  letterSpacing:'0.01em',
                  opacity: bridgeSending ? 0.7 : 1,
                  transform: bridgeSending ? 'none' : 'translateY(0)',
                }}
              >
                {bridgeSending ? (
                  <><span style={{display:'inline-block',animation:'spin 1s linear infinite',fontSize:'18px'}}>⏳</span> Generating bilingual content...</>
                ) : (
                  <><span style={{fontSize:'18px'}}>📡</span> Generate & Send to Class</>
                )}
              </button>

            </div>
          </div>

        </div>

      )}
"""

# ===================================================================
# STEP 3: Replace the old panel with the new one
# ===================================================================
old_block = content[start_idx:close_idx]
content = content[:start_idx] + new_panel + content[close_idx:]
print(f"Replaced bridge panel block ({len(old_block)} chars -> {len(new_panel)} chars)")

# ===================================================================
# STEP 4: Remove the debug alert from the bridge button
# ===================================================================
old_btn = "() => { console.error('[BRIDGE] Button clicked!'); alert('Bridge button clicked! Setting bridgeSendOpen=true. isTeacherMode should be true for panel to show.'); setBridgeSendOpen(true); }"
new_btn = "() => setBridgeSendOpen(true)"
if old_btn in content:
    content = content.replace(old_btn, new_btn, 1)
    print("Removed debug alert from bridge button")
else:
    print("SKIP - debug alert not found (may already be clean)")

# ===================================================================
# STEP 5: Initialize window.__bridgeMode
# ===================================================================
# Add initialization near the bridgeSendOpen state
init_marker = "const [bridgeSendOpen, setBridgeSendOpen] = useState(false);"
if init_marker in content and "window.__bridgeMode" not in content.split(init_marker)[0]:
    # We'll set the default in the JSX instead (already done via mi === 0 check)
    pass

# ===================================================================
# SAVE
# ===================================================================
with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("\nDone! Bridge panel redesigned successfully.")
