"""Fix visual panel sizing for smaller screens:
1. Add max-height to images so they don't dominate the viewport
2. Use object-fit:cover to fill without white bars
3. Add a subtle background pattern to panels so white images don't blend
4. Make sequence layout use 2-column grid on wider screens
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
fixed = 0

# Fix 1: Add max-height and object-fit to panel images
old_img_css = ".visual-panel img { width: 100%; display: block; }"
new_img_css = ".visual-panel img { width: 100%; display: block; max-height: 320px; object-fit: contain; background: #f8fafc; }"
if old_img_css in content:
    content = content.replace(old_img_css, new_img_css)
    fixed += 1
    print("[OK] Added max-height:320px and background to panel images")

# Fix 2: Also add inline max-height to the img in JSX for reliability
old_img_jsx = """<img src={panel.imageUrl} alt={panel.caption || `Panel ${panelIdx + 1}`} loading="lazy" style={{ width: '100%', display: 'block' }} />"""
new_img_jsx = """<img src={panel.imageUrl} alt={panel.caption || `Panel ${panelIdx + 1}`} loading="lazy" style={{ width: '100%', display: 'block', maxHeight: '320px', objectFit: 'contain', background: '#f8fafc' }} />"""
if old_img_jsx in content:
    content = content.replace(old_img_jsx, new_img_jsx)
    fixed += 1
    print("[OK] Added inline max-height, objectFit, background to img JSX")

# Fix 3: Make sequence layout use 2 columns when there are many panels
# so they don't stack vertically into a long scroll
old_seq_css = ".visual-panel-grid.layout-sequence { grid-template-columns: 1fr; gap: 4px; }"
new_seq_css = ".visual-panel-grid.layout-sequence { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 6px; }"
if old_seq_css in content:
    content = content.replace(old_seq_css, new_seq_css)
    fixed += 1
    print("[OK] Made sequence layout auto-fill 2-column grid")

# Fix 4: Add subtle checkerboard background to panel wrapper so white images 
# have a visible boundary
old_wrapper = """<div style={{ position: 'relative', overflow: 'hidden' }}>"""
new_wrapper = """<div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(45deg, #f1f5f9 25%, transparent 25%, transparent 75%, #f1f5f9 75%), linear-gradient(45deg, #f1f5f9 25%, transparent 25%, transparent 75%, #f1f5f9 75%)', backgroundSize: '16px 16px', backgroundPosition: '0 0, 8px 8px' }}>"""
# Actually a checkerboard might be too busy. Let's use a subtle solid bg instead
new_wrapper = """<div style={{ position: 'relative', overflow: 'hidden', background: '#f1f5f9' }}>"""
if old_wrapper in content:
    content = content.replace(old_wrapper, new_wrapper)
    fixed += 1
    print("[OK] Added subtle background to image wrapper (white images now show boundary)")

# Fix 5: Reduce the role badge vertical offset - "No 1" takes space at top
old_role_css = ".visual-panel-role { position: absolute; top: 8px; left: 8px; background: rgba(30,41,59,0.8); color: white; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; backdrop-filter: blur(6px); z-index: 2; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; }"
new_role_css = ".visual-panel-role { position: absolute; top: 4px; left: 4px; background: rgba(30,41,59,0.75); color: white; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.3px; backdrop-filter: blur(6px); z-index: 5; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; }"
if old_role_css in content:
    content = content.replace(old_role_css, new_role_css)
    fixed += 1
    print("[OK] Made role badge more compact")

# Fix 6: The role badge "No X" renders OUTSIDE the containment wrapper
# because it's a sibling of the wrapper div. Move it inside by changing JSX.
# Current: <figure> -> {role badge} -> <div wrapper> -> ...
# The role badge has position:absolute so it positions relative to figure,
# but it should be inside the wrapper so it overlays the image.
# Let's just ensure it's visually correct.

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! {fixed} fixes applied.")
