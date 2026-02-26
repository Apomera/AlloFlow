#!/usr/bin/env python3
"""
Bridge Panel Enhancement V2:
- Add manual language dropdown (12 languages from LANG_OPTIONS, with flags)
- Add manual grade level dropdown
- Fix Settings Preview to show selected values dynamically
- Use text adaptation's leveledTextLanguage as the default
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# ===================================================================
# Replace the Target + Settings Row section of the bridge panel
# ===================================================================

# Find and replace the target/settings section
old_section = """              {/* Target + Settings Row */}
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
                    <option value="all">\U0001f3af All Groups</option>
                    {rosterKey?.groups && Object.entries(rosterKey.groups).map(([gId, g]) => (
                      <option key={gId} value={gId}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{flex:'1',minWidth:'200px'}}>
                  <div style={{fontSize:'12px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'8px'}}>Settings Preview</div>
                  <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',padding:'10px 14px',fontSize:'12px',color:'#64748b',lineHeight:1.6}}>
                    <div>\U0001f5e3\ufe0f Language: <span style={{color:'#94a3b8',fontWeight:600}}>{(() => { const g = rosterKey?.groups && Object.values(rosterKey.groups)[0]; return g?.profile?.leveledTextLanguage || 'English (default)'; })()}</span></div>
                    <div>\U0001f4da Level: <span style={{color:'#94a3b8',fontWeight:600}}>{(() => { const g = rosterKey?.groups && Object.values(rosterKey.groups)[0]; return g?.profile?.gradeLevel || '5th Grade (default)'; })()}</span></div>
                  </div>
                </div>
              </div>"""

new_section = """              {/* Target Group, Language & Grade Selectors */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:'12px',marginBottom:'20px'}}>

                {/* Target Group */}
                <div>
                  <div style={{fontSize:'12px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'8px'}}>Target Group</div>
                  <select
                    id="bridge-target-selector"
                    defaultValue="all"
                    onChange={(e) => { window.__bridgeTarget = e.target.value; }}
                    style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'12px 14px',color:'#e2e8f0',fontSize:'13px',fontWeight:600,outline:'none',cursor:'pointer',appearance:'auto'}}
                  >
                    <option value="all">\U0001f3af All Groups</option>
                    {rosterKey?.groups && Object.entries(rosterKey.groups).map(([gId, g]) => (
                      <option key={gId} value={gId}>{g.name}</option>
                    ))}
                  </select>
                </div>

                {/* Language Selector */}
                <div>
                  <div style={{fontSize:'12px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'8px'}}>Target Language</div>
                  <select
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
                  </select>
                </div>

                {/* Grade Level Selector */}
                <div>
                  <div style={{fontSize:'12px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'8px'}}>Reading Level</div>
                  <select
                    id="bridge-grade-selector"
                    defaultValue={gradeLevel || '5th Grade'}
                    onChange={(e) => { window.__bridgeGrade = e.target.value; const prev = document.getElementById('bridge-settings-preview-grade'); if (prev) prev.textContent = e.target.value; }}
                    style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'12px 14px',color:'#e2e8f0',fontSize:'13px',fontWeight:600,outline:'none',cursor:'pointer',appearance:'auto'}}
                  >
                    {['PreK','Kindergarten','1st Grade','2nd Grade','3rd Grade','4th Grade','5th Grade','6th Grade','7th Grade','8th Grade','9th Grade','10th Grade','11th Grade','12th Grade'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Live Settings Preview */}
              <div style={{display:'flex',gap:'16px',marginBottom:'20px',background:'rgba(20,184,166,0.06)',border:'1px solid rgba(20,184,166,0.12)',borderRadius:'14px',padding:'14px 18px'}}>
                <div style={{flex:1,display:'flex',alignItems:'center',gap:'8px',fontSize:'13px'}}>
                  <span style={{fontSize:'16px'}}>\U0001f5e3\ufe0f</span>
                  <span style={{color:'#64748b'}}>Language:</span>
                  <span id="bridge-settings-preview-lang" style={{color:'#5eead4',fontWeight:700}}>{leveledTextLanguage || 'English'}</span>
                </div>
                <div style={{width:'1px',background:'rgba(255,255,255,0.08)'}} />
                <div style={{flex:1,display:'flex',alignItems:'center',gap:'8px',fontSize:'13px'}}>
                  <span style={{fontSize:'16px'}}>\U0001f4da</span>
                  <span style={{color:'#64748b'}}>Grade:</span>
                  <span id="bridge-settings-preview-grade" style={{color:'#5eead4',fontWeight:700}}>{gradeLevel || '5th Grade'}</span>
                </div>
                <div style={{width:'1px',background:'rgba(255,255,255,0.08)'}} />
                <div style={{flex:1,display:'flex',alignItems:'center',gap:'8px',fontSize:'13px'}}>
                  <span style={{fontSize:'16px'}}>\U0001f4e1</span>
                  <span style={{color:'#64748b'}}>Session:</span>
                  <span style={{color: activeSessionCode ? '#34d399' : '#f59e0b',fontWeight:700}}>{activeSessionCode ? 'Live' : 'Preview only'}</span>
                </div>
              </div>"""

if old_section in content:
    content = content.replace(old_section, new_section, 1)
    changes += 1
    print("1: Replaced target/settings with language/grade selectors + live preview")
else:
    print("1: ERROR - could not find target/settings section")
    # Debug: try to find partial match
    if "Target + Settings Row" in content:
        print("   Found 'Target + Settings Row' comment but full block didn't match")
    elif "bridge-target-selector" in content:
        print("   Found bridge-target-selector but surrounding block didn't match")
    else:
        print("   No bridge-target-selector found at all")

# ===================================================================
# Update the send handler to use the language/grade selectors
# ===================================================================

old_handler = """                    const targetLang = firstGroup?.profile?.leveledTextLanguage || 'English';
                    const gradeLevel = firstGroup?.profile?.gradeLevel || '5th Grade';"""

new_handler = """                    const targetLang = window.__bridgeLang || (document.getElementById('bridge-language-selector') || {}).value || firstGroup?.profile?.leveledTextLanguage || 'English';
                    const gradeLevel = window.__bridgeGrade || (document.getElementById('bridge-grade-selector') || {}).value || firstGroup?.profile?.gradeLevel || '5th Grade';"""

if old_handler in content:
    content = content.replace(old_handler, new_handler, 1)
    changes += 1
    print("2: Updated send handler to read from language/grade selectors")
else:
    print("2: SKIP - handler pattern not found")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied.")
