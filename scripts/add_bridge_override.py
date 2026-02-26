"""
Add a 'Override group settings' toggle to Bridge mode.
When ON: teacher's selected language/grade is sent in bridgePayload and client-side uses it.
When OFF (default): selectors are preview-only, client-side uses group profiles.
"""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    changes = 0

    # 1. Add bridgeOverrideGroups state variable (after bridgeSending state)
    anchor1 = "const [bridgeSending, setBridgeSending] = useState(false);"
    new1 = "const [bridgeSending, setBridgeSending] = useState(false);\n  const [bridgeOverrideGroups, setBridgeOverrideGroups] = useState(false);"
    if anchor1 in content and 'bridgeOverrideGroups' not in content:
        content = content.replace(anchor1, new1)
        changes += 1
        print("✅ 1. Added bridgeOverrideGroups state")
    else:
        print("⚠️ 1. State already exists or anchor not found")

    # 2. Update the "(your preview)" labels to be dynamic based on override toggle
    old_lang_label = ">Target Language <span style={{fontSize:'9px',fontWeight:400,color:'#64748b',textTransform:'none'}}>(your preview)</span></div>"
    new_lang_label = ">Target Language <span style={{fontSize:'9px',fontWeight:400,color: bridgeOverrideGroups ? '#f59e0b' : '#64748b',textTransform:'none'}}>{bridgeOverrideGroups ? '(all students)' : '(your preview)'}</span></div>"
    if old_lang_label in content:
        content = content.replace(old_lang_label, new_lang_label)
        changes += 1
        print("✅ 2. Updated Target Language label to be dynamic")
    else:
        print("⚠️ 2. Target Language label not found")

    old_grade_label = ">Reading Level <span style={{fontSize:'9px',fontWeight:400,color:'#64748b',textTransform:'none'}}>(your preview)</span></div>"
    new_grade_label = ">Reading Level <span style={{fontSize:'9px',fontWeight:400,color: bridgeOverrideGroups ? '#f59e0b' : '#64748b',textTransform:'none'}}>{bridgeOverrideGroups ? '(all students)' : '(your preview)'}</span></div>"
    if old_grade_label in content:
        content = content.replace(old_grade_label, new_grade_label)
        changes += 1
        print("✅ 3. Updated Reading Level label to be dynamic")
    else:
        print("⚠️ 3. Reading Level label not found")

    # 3. Add the override toggle above the selectors row
    # Find the selectors row: "Target Group, Language & Grade Selectors"
    old_selector_header = "{/* Target Group, Language & Grade Selectors */}"
    new_selector_header = """{/* Override Toggle */}
               <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px',background: bridgeOverrideGroups ? 'rgba(245,158,11,0.08)' : _bt.cardBg,border: bridgeOverrideGroups ? '1px solid rgba(245,158,11,0.25)' : _bt.cardBorder,borderRadius:'12px',padding:'10px 16px',transition:'all 0.3s'}}>
                 <label style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',flex:1}}>
                   <input
                     type="checkbox"
                     checked={bridgeOverrideGroups}
                     onChange={(e) => setBridgeOverrideGroups(e.target.checked)}
                     style={{width:'16px',height:'16px',accentColor:'#f59e0b',cursor:'pointer'}}
                   />
                   <span style={{fontSize:'13px',fontWeight:700,color: bridgeOverrideGroups ? '#fbbf24' : _bt.textSecondary}}>
                     {bridgeOverrideGroups ? '🔒 Override group settings' : '🔓 Use group settings (default)'}
                   </span>
                 </label>
                 <span style={{fontSize:'11px',color:_bt.textMuted,maxWidth:'280px'}}>
                   {bridgeOverrideGroups
                     ? 'All students will receive this exact language & reading level'
                     : 'Each group auto-translates to its own language & level'}
                 </span>
               </div>

               {/* Target Group, Language & Grade Selectors */}"""

    if old_selector_header in content:
        content = content.replace(old_selector_header, new_selector_header, 1)
        changes += 1
        print("✅ 4. Added override toggle above selectors")
    else:
        print("⚠️ 4. Selector header not found")

    # 4. Update the Firebase payload to include override info
    old_payload = """bridgePayload: {
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
    
    new_payload = """bridgePayload: {
                             text: bridgeSendText,
                             mode: selectedMode,
                             targetGroup: selectedTarget,
                             timestamp: Date.now(),
                             senderName: user?.displayName || 'Teacher',
                             isBlast: selectedTarget === 'all',
                             overrideLang: bridgeOverrideGroups ? targetLang : null,
                             overrideGrade: bridgeOverrideGroups ? gradeLevel : null,
                             languageMap: selectedTarget === 'all' && rosterKey?.groups
                               ? Object.fromEntries(Object.entries(rosterKey.groups).map(([gId, g]) => [gId, g.profile?.leveledTextLanguage || 'English']))
                               : null
                           }"""

    if old_payload in content:
        content = content.replace(old_payload, new_payload)
        changes += 1
        print("✅ 5. Updated Firebase payload with overrideLang/overrideGrade")
    else:
        print("⚠️ 5. Firebase payload anchor not found")

    # 5. Update client-side receiving logic to honor overrides
    old_client = """const targetLang = myProfile.leveledTextLanguage || 'English';

                         const gradeLevel = myProfile.gradeLevel || '5th Grade';"""
    
    new_client = """const targetLang = bp.overrideLang || myProfile.leveledTextLanguage || 'English';

                         const gradeLevel = bp.overrideGrade || myProfile.gradeLevel || '5th Grade';"""

    if old_client in content:
        content = content.replace(old_client, new_client)
        changes += 1
        print("✅ 6. Updated client-side to honor override fields")
    else:
        print("⚠️ 6. Client-side receiving anchor not found")

    # 6. Update the tooltip in Language Blast Preview to mention override
    old_tooltip = "The language/grade selectors above only affect your teacher preview."
    new_tooltip = "The language/grade selectors above only affect your teacher preview unless you enable 'Override group settings'."
    if old_tooltip in content:
        content = content.replace(old_tooltip, new_tooltip)
        changes += 1
        print("✅ 7. Updated tooltip to mention override option")
    else:
        print("⚠️ 7. Tooltip not found")

    SRC.write_text(content, encoding='utf-8')
    print(f"\n✅ Done! {changes} changes applied.")

if __name__ == "__main__":
    main()
