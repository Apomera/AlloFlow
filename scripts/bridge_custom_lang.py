#!/usr/bin/env python3
"""Add custom language input to bridge panel language selector."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# 1. Add "Custom..." option to the language dropdown and show text input when selected
old_lang_select = """                  <select
                    id="bridge-language-selector"
                    defaultValue={leveledTextLanguage || 'English'}
                    onChange={(e) => { window.__bridgeLang = e.target.value; const prev = document.getElementById('bridge-settings-preview-lang'); if (prev) prev.textContent = e.target.value; }}
                    style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'12px 14px',color:'#e2e8f0',fontSize:'13px',fontWeight:600,outline:'none',cursor:'pointer',appearance:'auto'}}
                  >
                    {[
                      {v:'English',f:'\U0001f1fa\U0001f1f8'},{v:'Spanish',f:'\U0001f1ea\U0001f1f8'},{v:'French',f:'\U0001f1eb\U0001f1f7'},{v:'Arabic',f:'\U0001f1f8\U0001f1e6'},
                      {v:'Somali',f:'\U0001f1f8\U0001f1f4'},{v:'Vietnamese',f:'\U0001f1fb\U0001f1f3'},{v:'Portuguese',f:'\U0001f1e7\U0001f1f7'},{v:'Mandarin',f:'\U0001f1e8\U0001f1f3'},
                      {v:'Korean',f:'\U0001f1f0\U0001f1f7'},{v:'Tagalog',f:'\U0001f1f5\U0001f1ed'},{v:'Russian',f:'\U0001f1f7\U0001f1fa'},{v:'Japanese',f:'\U0001f1ef\U0001f1f5'}
                    ].map(l => (
                      <option key={l.v} value={l.v}>{l.f} {l.v}</option>
                    ))}
                  </select>"""

new_lang_select = """                  <select
                    id="bridge-language-selector"
                    defaultValue={leveledTextLanguage || 'English'}
                    onChange={(e) => {
                      const customInput = document.getElementById('bridge-custom-lang-input');
                      const prev = document.getElementById('bridge-settings-preview-lang');
                      if (e.target.value === '__custom__') {
                        if (customInput) { customInput.style.display = 'block'; customInput.focus(); }
                        window.__bridgeLang = customInput?.value || 'English';
                      } else {
                        if (customInput) customInput.style.display = 'none';
                        window.__bridgeLang = e.target.value;
                        if (prev) prev.textContent = e.target.value;
                      }
                    }}
                    style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'12px 14px',color:'#e2e8f0',fontSize:'13px',fontWeight:600,outline:'none',cursor:'pointer',appearance:'auto'}}
                  >
                    {[
                      {v:'English',f:'\U0001f1fa\U0001f1f8'},{v:'Spanish',f:'\U0001f1ea\U0001f1f8'},{v:'French',f:'\U0001f1eb\U0001f1f7'},{v:'Arabic',f:'\U0001f1f8\U0001f1e6'},
                      {v:'Somali',f:'\U0001f1f8\U0001f1f4'},{v:'Vietnamese',f:'\U0001f1fb\U0001f1f3'},{v:'Portuguese',f:'\U0001f1e7\U0001f1f7'},{v:'Mandarin',f:'\U0001f1e8\U0001f1f3'},
                      {v:'Korean',f:'\U0001f1f0\U0001f1f7'},{v:'Tagalog',f:'\U0001f1f5\U0001f1ed'},{v:'Russian',f:'\U0001f1f7\U0001f1fa'},{v:'Japanese',f:'\U0001f1ef\U0001f1f5'}
                    ].map(l => (
                      <option key={l.v} value={l.v}>{l.f} {l.v}</option>
                    ))}
                    <option value="__custom__">\u270f\ufe0f Custom language...</option>
                  </select>
                  <input
                    id="bridge-custom-lang-input"
                    type="text"
                    placeholder="Type a language name (e.g. Hindi, Swahili, Haitian Creole...)"
                    onInput={(e) => {
                      window.__bridgeLang = e.target.value || 'English';
                      const prev = document.getElementById('bridge-settings-preview-lang');
                      if (prev) prev.textContent = e.target.value || 'Custom';
                    }}
                    style={{display:'none',width:'100%',boxSizing:'border-box',marginTop:'8px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(168,85,247,0.3)',borderRadius:'10px',padding:'10px 14px',color:'#e2e8f0',fontSize:'13px',fontWeight:600,outline:'none'}}
                  />"""

if old_lang_select in content:
    content = content.replace(old_lang_select, new_lang_select, 1)
    changes += 1
    print("1: Added custom language option with text input")
else:
    print("1: SKIP - language select pattern not found")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied.")
