"""Fix panel spacing + enhance label visuals
1. Fix spacing: set figure height constraints, remove caption padding
2. Make labels more visually prominent with enhanced CSS
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
fixed = 0

# ============================================================
# FIX 1: Replace entire visual panel CSS block with optimized version
# ============================================================

old_css = """.visual-panel-grid { display: grid; gap: 12px; margin: 12px 0; list-style: none; padding: 0; }
.visual-panel-grid.layout-before-after,
.visual-panel-grid.layout-comparison { grid-template-columns: 1fr 1fr; }
.visual-panel-grid.layout-sequence { grid-template-columns: 1fr; gap: 8px; }
.visual-panel-grid.layout-labeled-diagram,
.visual-panel-grid.layout-single { grid-template-columns: 1fr; }
.visual-panel { position: relative; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: white; transition: box-shadow 0.2s; margin: 0; padding: 0; list-style: none; }
.visual-panel:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.visual-panel img { width: 100%; display: block; object-fit: contain; }
.visual-panel-role { position: absolute; top: 10px; left: 10px; background: rgba(30,41,59,0.75); color: white; font-size: 13px; font-weight: 700; padding: 5px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; backdrop-filter: blur(6px); z-index: 2; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; }
.visual-label { position: absolute; background: rgba(255,255,255,0.92); backdrop-filter: blur(8px); padding: 6px 16px; border-radius: 10px; font-size: 15px; font-weight: 700; color: #1e293b; border: 1.5px solid rgba(99,102,241,0.25); box-shadow: 0 3px 10px rgba(0,0,0,0.12); pointer-events: auto; cursor: pointer; transition: opacity 0.3s, transform 0.2s; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; letter-spacing: 0.01em; white-space: nowrap; }
.visual-label:hover { transform: scale(1.05); border-color: #6366f1; }
.visual-label.hidden-label { opacity: 0; pointer-events: none; }
.visual-label input { border: none; background: transparent; font-size: 15px; font-weight: 700; color: #1e293b; outline: none; width: 100%; min-width: 60px; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; }
.visual-caption { padding: 12px 16px; font-size: 15px; color: #334155; text-align: center; background: linear-gradient(to bottom, #f8fafc, #f1f5f9); border-top: 1px solid #e2e8f0; font-weight: 600; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; letter-spacing: 0.01em; }"""

new_css = """.visual-panel-grid { display: grid; gap: 8px; margin: 8px 0; list-style: none; padding: 0; }
.visual-panel-grid.layout-before-after,
.visual-panel-grid.layout-comparison { grid-template-columns: 1fr 1fr; }
.visual-panel-grid.layout-sequence { grid-template-columns: 1fr; gap: 4px; }
.visual-panel-grid.layout-labeled-diagram,
.visual-panel-grid.layout-single { grid-template-columns: 1fr; }
.visual-panel { position: relative; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: white; transition: box-shadow 0.2s; margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; }
.visual-panel:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.visual-panel img { width: 100%; display: block; object-fit: contain; }
.visual-panel-role { position: absolute; top: 8px; left: 8px; background: rgba(30,41,59,0.8); color: white; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; backdrop-filter: blur(6px); z-index: 2; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; }
.visual-label { position: absolute; background: linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.12) 100%); backdrop-filter: blur(12px); padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 800; color: #1e1b4b; border: 2px solid rgba(99,102,241,0.4); box-shadow: 0 4px 16px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.5); pointer-events: auto; cursor: pointer; transition: opacity 0.3s, transform 0.2s, box-shadow 0.2s; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; letter-spacing: 0.02em; z-index: 4; }
.visual-label::before { content: ''; position: absolute; left: -6px; top: 50%; transform: translateY(-50%); width: 8px; height: 8px; background: #6366f1; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 6px rgba(99,102,241,0.5); }
.visual-label:hover { transform: scale(1.08) translateY(-1px); border-color: #6366f1; box-shadow: 0 6px 20px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.5); }
.visual-label.hidden-label { opacity: 0; pointer-events: none; }
.visual-label input { border: none; background: transparent; font-size: 14px; font-weight: 800; color: #1e1b4b; outline: none; width: 100%; min-width: 60px; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; }
.visual-caption { padding: 6px 12px; font-size: 13px; color: #475569; text-align: center; background: #f8fafc; border-top: 1px solid #e2e8f0; font-weight: 600; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; letter-spacing: 0.01em; line-height: 1.3; }"""

if old_css in content:
    content = content.replace(old_css, new_css)
    fixed += 1
    print("[OK] Replaced entire visual panel CSS block with enhanced version")
else:
    print("[WARN] Could not find exact CSS block")

# ============================================================
# FIX 2: Compact the sequence arrow
# ============================================================
old_arrow_css = ".visual-sequence-arrow { display: flex; align-items: center; justify-content: center; font-size: 18px; color: #94a3b8; align-self: center; padding: 0; margin: -4px 0; line-height: 1; }"
new_arrow_css = ".visual-sequence-arrow { display: flex; align-items: center; justify-content: center; font-size: 14px; color: #cbd5e1; align-self: center; padding: 0; margin: -2px 0; line-height: 1; height: 16px; }"
if old_arrow_css in content:
    content = content.replace(old_arrow_css, new_arrow_css)
    fixed += 1
    print("[OK] Further compacted sequence arrow (14px font, 16px height)")

# ============================================================
# FIX 3: The loading placeholder has height:200 which wastes space
# Panel loading state should be more compact
# ============================================================
old_loading = """<div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#94a3b8' }}>"""
new_loading = """<div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#94a3b8' }}>"""
if old_loading in content:
    content = content.replace(old_loading, new_loading)
    fixed += 1
    print("[OK] Reduced loading placeholder height from 200px to 120px")

# ============================================================
# FIX 4: Ensure the sequence arrow shows as a small connector, not a big →
# Replace the full-width arrow with a small indicator  
# ============================================================
old_arrow_jsx = """<div className="visual-sequence-arrow">\u2192</div>"""
new_arrow_jsx = """<div className="visual-sequence-arrow">\u2022 \u2022 \u2022</div>"""
if old_arrow_jsx in content:
    content = content.replace(old_arrow_jsx, new_arrow_jsx)
    fixed += 1
    print("[OK] Replaced → with ••• connector between sequence panels")

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! {fixed} fixes applied.")
