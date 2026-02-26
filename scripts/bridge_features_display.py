#!/usr/bin/env python3
"""
Bridge Mode Feature Expansion — Display Panel Enhancements:
1. Copy & Print buttons in the action bar
2. Student Acknowledgment reactions (thumbs up, confused, question)
3. Audio-First auto-play on message open
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# ===================================================================
# 1. Add Copy & Print buttons to action bar (in display panel)
# ===================================================================

# Find the Close button in the display panel action bar and add Copy + Print before it
old_close_btn = """                <button
                  onClick={() => { setBridgeMessage(null); setBridgeKaraokeIndex(-1); setBridgeTtsPlaying(false); }}
                  style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#94a3b8',padding:'10px 18px',borderRadius:'12px',fontSize:'13px',fontWeight:700,cursor:'pointer',transition:'all 0.2s',flex:1}}
                >{t('roster.bridge_close') || 'Close'}</button>"""

new_close_with_copy_print = """                <button
                  onClick={() => {
                    const text = [
                      '\U0001f1fa\U0001f1f8 English:',
                      bridgeMessage.english,
                      '',
                      '\U0001f310 ' + (bridgeMessage.languageName || bridgeMessage.language) + ':',
                      bridgeMessage.translated,
                      '',
                      bridgeMessage.terms?.length ? '\U0001f4d6 Key Terms: ' + bridgeMessage.terms.join(', ') : ''
                    ].filter(Boolean).join('\\n');
                    navigator.clipboard.writeText(text).then(() => addToast('Copied to clipboard!', 'success')).catch(() => addToast('Copy failed', 'error'));
                  }}
                  style={{background:'rgba(99,102,241,0.15)',border:'1px solid rgba(99,102,241,0.25)',color:'#a5b4fc',padding:'10px 18px',borderRadius:'12px',fontSize:'13px',fontWeight:700,cursor:'pointer',transition:'all 0.2s',flex:1}}
                >\U0001f4cb Copy</button>

                <button
                  onClick={() => {
                    const printContent = `
                      <html><head><title>Bridge Message</title>
                      <style>
                        body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; }
                        .lang-label { font-size: 14px; font-weight: bold; color: #666; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; }
                        .text-block { font-size: 18px; line-height: 1.8; margin-bottom: 24px; padding: 16px; border-left: 4px solid #14b8a6; background: #f8fffe; border-radius: 0 8px 8px 0; }
                        .terms { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
                        .term { background: #e8f5e9; padding: 4px 12px; border-radius: 16px; font-size: 14px; font-weight: 600; }
                        .header { text-align: center; margin-bottom: 32px; border-bottom: 2px solid #14b8a6; padding-bottom: 16px; }
                        .header h1 { color: #14b8a6; font-size: 24px; margin: 0; }
                        .header p { color: #999; font-size: 12px; margin: 4px 0 0; }
                        ${bridgeMessage.imageUrl ? 'img { max-width: 100%; border-radius: 8px; margin-bottom: 24px; }' : ''}
                      </style></head><body>
                      <div class="header"><h1>\U0001f310 Bridge Message</h1><p>${new Date(bridgeMessage.timestamp).toLocaleString()}</p></div>
                      ${bridgeMessage.imageUrl ? '<img src="' + bridgeMessage.imageUrl + '" />' : ''}
                      <div class="lang-label">\U0001f1fa\U0001f1f8 English</div>
                      <div class="text-block">${bridgeMessage.english}</div>
                      ${bridgeMessage.translated ? '<div class="lang-label">' + (bridgeMessage.languageName || bridgeMessage.language) + '</div><div class="text-block">' + bridgeMessage.translated + '</div>' : ''}
                      ${bridgeMessage.terms?.length ? '<div class="lang-label">\U0001f4d6 Key Terms</div><div class="terms">' + bridgeMessage.terms.map(t2 => '<span class="term">' + t2 + '</span>').join('') + '</div>' : ''}
                      </body></html>`;
                    const printWin = window.open('', '_blank', 'width=800,height=600');
                    if (printWin) { printWin.document.write(printContent); printWin.document.close(); printWin.print(); }
                  }}
                  style={{background:'rgba(168,85,247,0.15)',border:'1px solid rgba(168,85,247,0.25)',color:'#c084fc',padding:'10px 18px',borderRadius:'12px',fontSize:'13px',fontWeight:700,cursor:'pointer',transition:'all 0.2s',flex:1}}
                >\U0001f5a8\ufe0f Print</button>

                <button
                  onClick={() => { setBridgeMessage(null); setBridgeKaraokeIndex(-1); setBridgeTtsPlaying(false); }}
                  style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#94a3b8',padding:'10px 18px',borderRadius:'12px',fontSize:'13px',fontWeight:700,cursor:'pointer',transition:'all 0.2s',flex:1}}
                >{t('roster.bridge_close') || 'Close'}</button>"""

if old_close_btn in content:
    content = content.replace(old_close_btn, new_close_with_copy_print, 1)
    changes += 1
    print("1: Added Copy & Print buttons to display panel")
else:
    print("1: SKIP - close button pattern not found")

# ===================================================================
# 2. Add Student Acknowledgment section (below action buttons)
# ===================================================================

# Find the end of the action buttons div and add acknowledgment after it
old_actions_close = """              </div>

            </div>

          </div>

        </div>

      )}
"""

# Search specifically in the display panel area
display_panel_start = content.find("{/* === BRIDGE MESSAGE PANEL (Phase E1) === */}")
if display_panel_start == -1:
    print("2: SKIP - display panel start not found")
else:
    actions_close_pos = content.find(old_actions_close, display_panel_start)
    if actions_close_pos == -1:
        print("2: SKIP - actions close pattern not found in display panel")
    else:
        new_actions_close = """              </div>

              {/* Student Acknowledgment */}
              {activeSessionCode && (
                <div style={{marginTop:'20px',padding:'16px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.04)',borderRadius:'14px'}}>
                  <div style={{fontSize:'12px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'10px'}}>Student Reactions</div>
                  <div style={{display:'flex',gap:'10px',justifyContent:'center'}}>
                    {[
                      {emoji:'\U0001f44d',label:'Got it!',color:'rgba(34,197,94,0.15)',border:'rgba(34,197,94,0.25)',text:'#86efac'},
                      {emoji:'\U0001f914',label:'Confused',color:'rgba(251,191,36,0.15)',border:'rgba(251,191,36,0.25)',text:'#fcd34d'},
                      {emoji:'\u2753',label:'Question',color:'rgba(99,102,241,0.15)',border:'rgba(99,102,241,0.25)',text:'#a5b4fc'}
                    ].map((r, ri) => (
                      <div key={ri} style={{textAlign:'center',flex:1}}>
                        <div style={{fontSize:'32px',marginBottom:'4px',filter:'grayscale(0.3)',opacity:0.7}}>{r.emoji}</div>
                        <div style={{fontSize:'11px',color:r.text,fontWeight:600}}>{r.label}</div>
                        <div style={{fontSize:'20px',fontWeight:800,color:r.text,marginTop:'4px'}}>—</div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:'11px',color:'#475569',textAlign:'center',marginTop:'8px'}}>Students can react when they receive this message</div>
                </div>
              )}

            </div>

          </div>

        </div>

      )}
"""
        content = content[:actions_close_pos] + new_actions_close + content[actions_close_pos + len(old_actions_close):]
        changes += 1
        print("2: Added Student Acknowledgment section to display panel")

# ===================================================================
# 3. Add Audio-First auto-play effect when message opens
# ===================================================================

# After setBridgeMessage is set and sends a toast, add auto-play logic
old_toast = "addToast(t('roster.bridge_send_success') || '\u2705 Bridge message generated!', 'success');"

new_toast_with_autoplay = """addToast(t('roster.bridge_send_success') || '\u2705 Bridge message generated!', 'success');

                    // Audio-First: auto-play after brief delay if enabled
                    if (window.__bridgeAutoplay) {
                      setTimeout(async () => {
                        try {
                          await handleAudio(parsed.english || bridgeSendText);
                          if (parsed.translated) {
                            await new Promise(r => setTimeout(r, 500));
                            await handleAudio(parsed.translated);
                          }
                        } catch(e) { warnLog('Bridge autoplay TTS error', e); }
                      }, 800);
                    }"""

if old_toast in content:
    content = content.replace(old_toast, new_toast_with_autoplay, 1)
    changes += 1
    print("3: Added Audio-First auto-play after send")
else:
    print("3: SKIP - toast pattern not found")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied to display panel.")
