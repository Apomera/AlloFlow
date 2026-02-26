#!/usr/bin/env python3
"""
Make Bridge Mode panels theme-aware (light/dark/high-contrast).
Strategy: Add a theme color map computed at the top of each panel's JSX, 
then reference those variables in all inline styles.

The app uses: theme === 'light' | 'dark' | 'contrast'
Pattern: isContrast ? contrastVal : (isDark ? darkVal : lightVal)
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# ===================================================================
# 1. Add theme color map at the top of the SEND PANEL
# ===================================================================

old_send_panel_start = """      {bridgeSendOpen && isTeacherMode && (

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
          >"""

# Build theme-aware version
new_send_panel_start = """      {bridgeSendOpen && isTeacherMode && (() => {
        const _isDark = theme === 'dark';
        const _isContrast = theme === 'contrast';
        const _bt = {
          overlay: _isContrast ? 'rgba(0,0,0,0.9)' : (_isDark ? 'rgba(2,6,23,0.75)' : 'rgba(0,0,0,0.4)'),
          panelBg: _isContrast ? '#000000' : (_isDark ? 'linear-gradient(145deg, rgba(15,23,42,0.97) 0%, rgba(30,41,59,0.95) 50%, rgba(15,23,42,0.97) 100%)' : 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.97) 100%)'),
          panelBorder: _isContrast ? '3px solid #FFFF00' : (_isDark ? '1px solid rgba(20,184,166,0.2)' : '1px solid rgba(0,0,0,0.1)'),
          panelShadow: _isContrast ? 'none' : (_isDark ? '0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(20,184,166,0.08)' : '0 25px 60px rgba(0,0,0,0.15), 0 0 40px rgba(20,184,166,0.05)'),
          textPrimary: _isContrast ? '#FFFF00' : (_isDark ? '#e2e8f0' : '#1e293b'),
          textSecondary: _isContrast ? '#FFFFFF' : (_isDark ? '#94a3b8' : '#64748b'),
          textMuted: _isContrast ? '#FFFF00' : (_isDark ? '#64748b' : '#94a3b8'),
          textAccent: _isContrast ? '#FFFF00' : (_isDark ? '#5eead4' : '#0d9488'),
          inputBg: _isContrast ? '#000000' : (_isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
          inputBorder: _isContrast ? '2px solid #FFFF00' : (_isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.12)'),
          inputText: _isContrast ? '#FFFFFF' : (_isDark ? '#e2e8f0' : '#1e293b'),
          cardBg: _isContrast ? '#000000' : (_isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
          cardBorder: _isContrast ? '2px solid #FFFF00' : (_isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)'),
          cardActiveBg: _isContrast ? '#1a1a00' : (_isDark ? 'rgba(20,184,166,0.12)' : 'rgba(20,184,166,0.08)'),
          cardActiveBorder: _isContrast ? '2px solid #FFFF00' : (_isDark ? '1px solid rgba(20,184,166,0.35)' : '1px solid rgba(20,184,166,0.3)'),
          headerBorder: _isContrast ? '3px solid #FFFF00' : (_isDark ? '1px solid rgba(20,184,166,0.15)' : '1px solid rgba(20,184,166,0.2)'),
          btnCloseBg: _isContrast ? '#000000' : (_isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
          btnCloseBorder: _isContrast ? '2px solid #FFFF00' : (_isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'),
          btnCloseColor: _isContrast ? '#FFFF00' : (_isDark ? '#94a3b8' : '#64748b'),
          selectBg: _isContrast ? '#000000' : (_isDark ? '#1e293b' : '#ffffff'),
          selectText: _isContrast ? '#FFFF00' : (_isDark ? '#e2e8f0' : '#1e293b'),
          dotActive: _isContrast ? '#FFFF00' : '#14b8a6',
          dotInactive: _isContrast ? '#666600' : (_isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
        };
        return (

        <div
          style={{position:'fixed',inset:0,zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',background:_bt.overlay,backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)'}}
          onClick={(e) => { if (e.target === e.currentTarget) setBridgeSendOpen(false); }}
        >

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background:_bt.panelBg,
              borderRadius:'24px',padding:'0',maxWidth:'720px',width:'94vw',
              maxHeight:'90vh',overflowY:'auto',
              color:_bt.textPrimary,
              boxShadow:_bt.panelShadow,
              border:_bt.panelBorder,
              pointerEvents:'all',position:'relative',zIndex:100000
            }}
          >"""

if old_send_panel_start in content:
    content = content.replace(old_send_panel_start, new_send_panel_start, 1)
    changes += 1
    print("1: Added theme color map and theme-aware panel wrapper")
else:
    print("1: SKIP - send panel start not found")

# ===================================================================
# 2. Theme-aware header
# ===================================================================

old_header = """            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'24px 28px 20px',borderBottom:'1px solid rgba(20,184,166,0.15)'}}>
              <div>
                <h2 style={{fontSize:'20px',fontWeight:800,margin:0,color:'#5eead4',display:'flex',alignItems:'center',gap:'10px',letterSpacing:'-0.02em'}}>"""

new_header = """            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'24px 28px 20px',borderBottom:_bt.headerBorder}}>
              <div>
                <h2 style={{fontSize:'20px',fontWeight:800,margin:0,color:_bt.textAccent,display:'flex',alignItems:'center',gap:'10px',letterSpacing:'-0.02em'}}>"""

if old_header in content:
    content = content.replace(old_header, new_header, 1)
    changes += 1
    print("2: Theme-aware header")
else:
    print("2: SKIP - header not found")

# ===================================================================
# 3. Theme-aware close button
# ===================================================================

old_close = """                style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#94a3b8',width:'36px',height:'36px',borderRadius:'12px',cursor:'pointer',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s'}}"""

new_close = """                style={{background:_bt.btnCloseBg,border:_bt.btnCloseBorder,color:_bt.btnCloseColor,width:'36px',height:'36px',borderRadius:'12px',cursor:'pointer',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s'}}"""

if old_close in content:
    content = content.replace(old_close, new_close, 1)
    changes += 1
    print("3: Theme-aware close button")
else:
    print("3: SKIP - close button not found")

# ===================================================================
# 4. Theme-aware subtitle
# ===================================================================

old_subtitle = """                <p style={{margin:'4px 0 0',fontSize:'13px',color:'#64748b',fontWeight:400}}>
                  Send bilingual content to student devices"""

new_subtitle = """                <p style={{margin:'4px 0 0',fontSize:'13px',color:_bt.textMuted,fontWeight:400}}>
                  Send bilingual content to student devices"""

if old_subtitle in content:
    content = content.replace(old_subtitle, new_subtitle, 1)
    changes += 1
    print("4: Theme-aware subtitle")
else:
    print("4: SKIP - subtitle not found")

# ===================================================================
# 5. Theme-aware textarea
# ===================================================================

old_textarea_style = """                  style={{
                    width:'100%',boxSizing:'border-box',
                    background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',
                    borderRadius:'16px',padding:'16px 18px',paddingBottom:'32px',
                    color:'#e2e8f0',fontSize:'15px',lineHeight:1.7,"""

new_textarea_style = """                  style={{
                    width:'100%',boxSizing:'border-box',
                    background:_bt.inputBg,border:_bt.inputBorder,
                    borderRadius:'16px',padding:'16px 18px',paddingBottom:'32px',
                    color:_bt.inputText,fontSize:'15px',lineHeight:1.7,"""

if old_textarea_style in content:
    content = content.replace(old_textarea_style, new_textarea_style, 1)
    changes += 1
    print("5: Theme-aware textarea")
else:
    print("5: SKIP - textarea style not found")

# ===================================================================
# 6. Theme-aware section labels
# ===================================================================

old_gen_label = """                <div style={{fontSize:'12px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'10px'}}>Generation Mode</div>"""

new_gen_label = """                <div style={{fontSize:'12px',fontWeight:700,color:_bt.textSecondary,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'10px'}}>Generation Mode</div>"""

if old_gen_label in content:
    content = content.replace(old_gen_label, new_gen_label, 1)
    changes += 1
    print("6: Theme-aware generation mode label")
else:
    print("6: SKIP - gen label not found")

# ===================================================================
# 7. Theme-aware target group, language, grade labels
# ===================================================================

old_target_label = """style={{fontSize:'12px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'8px'}}>Target Group</div>"""

new_target_label = """style={{fontSize:'12px',fontWeight:700,color:_bt.textSecondary,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'8px'}}>Target Group</div>"""

if old_target_label in content:
    content = content.replace(old_target_label, new_target_label, 1)
    changes += 1
    print("7a: Theme-aware target group label")
else:
    print("7a: SKIP")

old_lang_label = """style={{fontSize:'12px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'8px'}}>Target Language</div>"""

new_lang_label = """style={{fontSize:'12px',fontWeight:700,color:_bt.textSecondary,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'8px'}}>Target Language</div>"""

if old_lang_label in content:
    content = content.replace(old_lang_label, new_lang_label, 1)
    changes += 1
    print("7b: Theme-aware language label")
else:
    print("7b: SKIP")

old_grade_label = """style={{fontSize:'12px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'8px'}}>Grade Level</div>"""

new_grade_label = """style={{fontSize:'12px',fontWeight:700,color:_bt.textSecondary,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'8px'}}>Grade Level</div>"""

if old_grade_label in content:
    content = content.replace(old_grade_label, new_grade_label, 1)
    changes += 1
    print("7c: Theme-aware grade label")
else:
    print("7c: SKIP")

# ===================================================================
# 8. Theme-aware selectors (dropdowns)
# ===================================================================

old_target_select = """style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'12px 14px',color:'#e2e8f0',fontSize:'13px',fontWeight:600,outline:'none',cursor:'pointer',appearance:'auto'}}"""

new_target_select = """style={{width:'100%',background:_bt.inputBg,border:_bt.inputBorder,borderRadius:'12px',padding:'12px 14px',color:_bt.inputText,fontSize:'13px',fontWeight:600,outline:'none',cursor:'pointer',appearance:'auto'}}"""

content = content.replace(old_target_select, new_target_select)
replaced_count = content.count(new_target_select)
if replaced_count > 0:
    changes += 1
    print(f"8: Theme-aware dropdowns ({replaced_count} instances)")
else:
    print("8: SKIP - dropdown style not found")

# ===================================================================
# 9. Theme-aware select options  
# ===================================================================

old_option_style = 'style={{background:"#1e293b",color:"#e2e8f0"}}'
new_option_style = 'style={{background:_bt.selectBg,color:_bt.selectText}}'

count_before = content.count(old_option_style)
if count_before > 0:
    content = content.replace(old_option_style, new_option_style)
    changes += 1
    print(f"9: Theme-aware select options ({count_before} instances)")
else:
    print("9: SKIP - option style not found")

# ===================================================================
# 10. Fix the closing of the IIFE — need to close the arrow function
# ===================================================================

# The panel was wrapped in {bridgeSendOpen && isTeacherMode && (() => { ... return (...) })()}
# We need to close the IIFE at the end of the send panel
old_panel_close = """      )}

      {/* === BRIDGE MESSAGE PANEL (Phase E1) === */}"""

new_panel_close = """      )})()}

      {/* === BRIDGE MESSAGE PANEL (Phase E1) === */}"""

if old_panel_close in content:
    content = content.replace(old_panel_close, new_panel_close, 1)
    changes += 1
    print("10: Closed the IIFE wrapper for theme-aware send panel")
else:
    print("10: SKIP - panel close not found")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied for theme support.")
