#!/usr/bin/env python3
"""
Make Bridge Mode DISPLAY panel theme-aware (light/dark/high-contrast).
Same approach: wrap in IIFE, add _dt color map, replace hardcoded colors.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# ===================================================================
# 1. Wrap display panel in IIFE with theme color map
# ===================================================================

old_display_start = """      {bridgeMessage && (

        <div
          style={{position:'fixed',inset:0,zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',background: bridgeProjectionMode ? 'rgba(0,0,0,0.95)' : 'rgba(2,6,23,0.75)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',transition:'background 0.3s'}}
          onClick={(e) => { if (e.target === e.currentTarget) setBridgeMessage(null); }}
        >

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background:'linear-gradient(145deg, rgba(15,23,42,0.97) 0%, rgba(30,41,59,0.95) 50%, rgba(15,23,42,0.97) 100%)',
              borderRadius: bridgeProjectionMode ? '0' : '24px',
              padding:'0',
              maxWidth: bridgeProjectionMode ? '100vw' : '720px',
              width: bridgeProjectionMode ? '100vw' : '94vw',
              maxHeight: bridgeProjectionMode ? '100vh' : '90vh',
              overflowY:'auto',
              color:'#e2e8f0',
              boxShadow: bridgeProjectionMode ? 'none' : '0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(99,102,241,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
              border: bridgeProjectionMode ? 'none' : '1px solid rgba(99,102,241,0.2)',
              pointerEvents:'all',position:'relative',zIndex:100000
            }}"""

new_display_start = """      {bridgeMessage && (() => {
        const _dDark = theme === 'dark';
        const _dContrast = theme === 'contrast';
        const _dt = {
          overlay: _dContrast ? 'rgba(0,0,0,0.95)' : (_dDark ? 'rgba(2,6,23,0.75)' : 'rgba(0,0,0,0.4)'),
          panelBg: _dContrast ? '#000000' : (_dDark ? 'linear-gradient(145deg, rgba(15,23,42,0.97) 0%, rgba(30,41,59,0.95) 50%, rgba(15,23,42,0.97) 100%)' : 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.97) 100%)'),
          panelBorder: _dContrast ? '3px solid #FFFF00' : (_dDark ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(0,0,0,0.1)'),
          panelShadow: _dContrast ? 'none' : (_dDark ? '0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(99,102,241,0.08)' : '0 25px 60px rgba(0,0,0,0.15)'),
          textPrimary: _dContrast ? '#FFFF00' : (_dDark ? '#e2e8f0' : '#1e293b'),
          textSecondary: _dContrast ? '#FFFFFF' : (_dDark ? '#94a3b8' : '#64748b'),
          textMuted: _dContrast ? '#FFFF00' : (_dDark ? '#64748b' : '#94a3b8'),
          textAccent: _dContrast ? '#FFFF00' : (_dDark ? '#a5b4fc' : '#4f46e5'),
          textEnglish: _dContrast ? '#FFFF00' : (_dDark ? '#e2e8f0' : '#1e293b'),
          textTranslated: _dContrast ? '#FFFF00' : (_dDark ? '#c7d2fe' : '#312e81'),
          headerBg: _dContrast ? '#000000' : (_dDark ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.04)'),
          headerBorder: _dContrast ? '3px solid #FFFF00' : (_dDark ? '1px solid rgba(99,102,241,0.15)' : '1px solid rgba(99,102,241,0.15)'),
          sectionBg: _dContrast ? '#000000' : (_dDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'),
          sectionBorder: _dContrast ? '2px solid #FFFF00' : (_dDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.06)'),
          btnBg: _dContrast ? '#000000' : (_dDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
          btnBorder: _dContrast ? '2px solid #FFFF00' : (_dDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'),
          btnColor: _dContrast ? '#FFFF00' : (_dDark ? '#94a3b8' : '#64748b'),
          progressBg: _dContrast ? '#333300' : (_dDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
          termBg: _dContrast ? '#000000' : (_dDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.1)'),
          termBorder: _dContrast ? '2px solid #FFFF00' : (_dDark ? '1px solid rgba(16,185,129,0.15)' : '1px solid rgba(16,185,129,0.2)'),
          termColor: _dContrast ? '#FFFF00' : (_dDark ? '#6ee7b7' : '#047857'),
        };
        return (

        <div
          style={{position:'fixed',inset:0,zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',background: bridgeProjectionMode ? 'rgba(0,0,0,0.95)' : _dt.overlay,backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',transition:'background 0.3s'}}
          onClick={(e) => { if (e.target === e.currentTarget) setBridgeMessage(null); }}
        >

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background:_dt.panelBg,
              borderRadius: bridgeProjectionMode ? '0' : '24px',
              padding:'0',
              maxWidth: bridgeProjectionMode ? '100vw' : '720px',
              width: bridgeProjectionMode ? '100vw' : '94vw',
              maxHeight: bridgeProjectionMode ? '100vh' : '90vh',
              overflowY:'auto',
              color:_dt.textPrimary,
              boxShadow: bridgeProjectionMode ? 'none' : _dt.panelShadow,
              border: bridgeProjectionMode ? 'none' : _dt.panelBorder,
              pointerEvents:'all',position:'relative',zIndex:100000
            }}"""

if old_display_start in content:
    content = content.replace(old_display_start, new_display_start, 1)
    changes += 1
    print("1: Added theme color map + theme-aware display panel wrapper")
else:
    print("1: SKIP - display panel start not found")

# ===================================================================
# 2. Theme-aware display header
# ===================================================================

old_disp_header = """style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'24px 28px 20px',borderBottom:'1px solid rgba(99,102,241,0.15)',background:'rgba(99,102,241,0.05)'}}"""

new_disp_header = """style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'24px 28px 20px',borderBottom:_dt.headerBorder,background:_dt.headerBg}}"""

if old_disp_header in content:
    content = content.replace(old_disp_header, new_disp_header, 1)
    changes += 1
    print("2: Theme-aware display header")
else:
    print("2: SKIP - display header not found")

# ===================================================================
# 3. Theme-aware header title color
# ===================================================================

old_disp_title = """style={{fontSize:'20px',fontWeight:800,margin:0,color:'#a5b4fc',display:'flex',alignItems:'center',gap:'10px'}}"""

new_disp_title = """style={{fontSize:'20px',fontWeight:800,margin:0,color:_dt.textAccent,display:'flex',alignItems:'center',gap:'10px'}}"""

if old_disp_title in content:
    content = content.replace(old_disp_title, new_disp_title, 1)
    changes += 1
    print("3: Theme-aware display title")
else:
    print("3: SKIP - display title not found")

# ===================================================================
# 4. Theme-aware language section headers (English / Translation labels)
# ===================================================================

old_eng_label = """style={{fontSize:'13px',fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'12px',display:'flex',alignItems:'center',gap:'8px'}}"""

new_eng_label = """style={{fontSize:'13px',fontWeight:800,color:_dt.textSecondary,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'12px',display:'flex',alignItems:'center',gap:'8px'}}"""

content_before = content.count(old_eng_label)
if content_before > 0:
    content = content.replace(old_eng_label, new_eng_label)
    changes += 1
    print(f"4: Theme-aware section labels ({content_before} instances)")
else:
    print("4: SKIP - section label not found")

# ===================================================================
# 5. Theme-aware text blocks
# ===================================================================

old_text_block = """style={{fontSize: bridgeProjectionMode ? '28px' : '18px',lineHeight:1.9,color:'#e2e8f0',letterSpacing:'0.01em',fontWeight:400}}"""

new_text_block = """style={{fontSize: bridgeProjectionMode ? '28px' : '18px',lineHeight:1.9,color:_dt.textEnglish,letterSpacing:'0.01em',fontWeight:400}}"""

if old_text_block in content:
    content = content.replace(old_text_block, new_text_block, 1)
    changes += 1
    print("5: Theme-aware English text block")
else:
    print("5: SKIP - English text block not found")

old_trans_block = """style={{fontSize: bridgeProjectionMode ? '28px' : '18px',lineHeight:1.9,color:'#c7d2fe',letterSpacing:'0.01em',fontWeight:400,fontStyle:'italic'}}"""

new_trans_block = """style={{fontSize: bridgeProjectionMode ? '28px' : '18px',lineHeight:1.9,color:_dt.textTranslated,letterSpacing:'0.01em',fontWeight:400,fontStyle:'italic'}}"""

if old_trans_block in content:
    content = content.replace(old_trans_block, new_trans_block, 1)
    changes += 1
    print("5b: Theme-aware translated text block")
else:
    print("5b: SKIP - translated text block not found")

# ===================================================================
# 6. Theme-aware progress bar backgrounds
# ===================================================================

old_progress_bg = "background:'rgba(255,255,255,0.08)'"
new_progress_bg = "background:_dt.progressBg"

progress_count = content.count(old_progress_bg)
# Only replace within display panel area (after the display panel marker)
display_start_idx = content.find("{/* === BRIDGE MESSAGE PANEL (Phase E1) === */}")
if display_start_idx > 0 and progress_count > 0:
    # Replace only in the display panel section
    before = content[:display_start_idx]
    after = content[display_start_idx:]
    after_count = after.count(old_progress_bg)
    if after_count > 0:
        after = after.replace(old_progress_bg, new_progress_bg)
        content = before + after
        changes += 1
        print(f"6: Theme-aware progress bars ({after_count} instances in display panel)")
    else:
        print("6: SKIP - no progress bars in display panel")
else:
    print("6: SKIP - progress bar bg not found")

# ===================================================================
# 7. Theme-aware action buttons (Close button in display)
# ===================================================================

old_action_close = """style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#94a3b8',padding:'10px 18px',borderRadius:'12px',fontSize:'13px',fontWeight:700,cursor:'pointer',transition:'all 0.2s',flex:1}}
                >{t('roster.bridge_close') || 'Close'}</button>"""

new_action_close = """style={{background:_dt.btnBg,border:_dt.btnBorder,color:_dt.btnColor,padding:'10px 18px',borderRadius:'12px',fontSize:'13px',fontWeight:700,cursor:'pointer',transition:'all 0.2s',flex:1}}
                >{t('roster.bridge_close') || 'Close'}</button>"""

if old_action_close in content:
    content = content.replace(old_action_close, new_action_close, 1)
    changes += 1
    print("7: Theme-aware close button in display")
else:
    print("7: SKIP - display close button not found")

# ===================================================================
# 8. Theme-aware vocabulary terms section
# ===================================================================

old_terms_bg = "style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.15)',borderRadius:'10px',padding:'6px 14px',display:'flex',alignItems:'center',gap:'8px'}}"

new_terms_bg = "style={{background:_dt.termBg,border:_dt.termBorder,borderRadius:'10px',padding:'6px 14px',display:'flex',alignItems:'center',gap:'8px'}}"

terms_count = content.count(old_terms_bg)
if terms_count > 0:
    content = content.replace(old_terms_bg, new_terms_bg)
    changes += 1
    print(f"8: Theme-aware vocabulary term chips ({terms_count})")
else:
    print("8: SKIP - term chip style not found")

# ===================================================================
# 9. Close the IIFE at the end of the display panel
# ===================================================================

# Find the closing of the display panel — it should end with a series of closing divs
# then the )}
# We need to find the specific closing that ends the bridgeMessage panel
# The display panel ends and then the rest of the JSX continues

# Find the next major section after the display panel
old_display_end_marker = content.find("      {/* === BRIDGE MESSAGE PANEL (Phase E1) === */}")
if old_display_end_marker > 0:
    # The display panel closing should be the `)}` that matches `{bridgeMessage && (() => {`
    # We changed it to start with (() => { ... return ( ... 
    # So the end of the display panel should change from `)}` to `)})()}`
    # Let's find the next section after the display panel
    next_section = content.find("\n\n      {/*", old_display_end_marker + 50)
    if next_section == -1:
        # Look for the end of JSX
        next_section = content.find("\n    </div>", old_display_end_marker + 50)
    
    if next_section > 0:
        # Search backwards from next_section for the closing `)}` 
        search_area = content[old_display_end_marker:next_section]
        # Find the last `)}` in the display panel section
        last_close = search_area.rfind("\n      )}\n")
        if last_close > -1:
            pos = old_display_end_marker + last_close
            old_close_str = "\n      )}\n"
            # Check if it's not already converted
            check_area = content[pos:pos+20]
            if ")})()}" not in check_area:
                content = content[:pos] + "\n      )})()}\n" + content[pos + len(old_close_str):]
                changes += 1
                print("9: Closed IIFE wrapper for display panel")
            else:
                print("9: SKIP - IIFE already closed")
        else:
            print("9: SKIP - could not find display panel closing")
    else:
        print("9: SKIP - could not find next section")
else:
    print("9: SKIP - display panel marker not found")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied for display panel theme support.")
