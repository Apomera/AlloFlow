"""Polish visual panels:
1. Convert bottom-based label positions to top-based (more reliable)
2. Make caption more compact and visually connected to panel
3. Remove the image's object-fit:contain which can create white bars
4. Add label background directly in JSX for reliability
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
fixed = 0

# Fix 1: Convert bottom-based LABEL_POSITIONS to top-based
# bottom: 12% = top: 88%
old_positions = """const LABEL_POSITIONS = {
    'top-left': { position: 'absolute', top: '10%', left: '10%', zIndex: 4 },
    'top-center': { position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)', zIndex: 4 },
    'top-right': { position: 'absolute', top: '8%', right: '8%', zIndex: 4 },
    'center-left': { position: 'absolute', top: '50%', left: '8%', transform: 'translateY(-50%)', zIndex: 4 },
    'center': { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 4 },
    'center-right': { position: 'absolute', top: '50%', right: '8%', transform: 'translateY(-50%)', zIndex: 4 },
    'bottom-left': { position: 'absolute', bottom: '12%', left: '8%', zIndex: 4 },
    'bottom-center': { position: 'absolute', bottom: '12%', left: '50%', transform: 'translateX(-50%)', zIndex: 4 },
    'bottom-right': { position: 'absolute', bottom: '12%', right: '8%', zIndex: 4 },
};"""

new_positions = """const LABEL_POSITIONS = {
    'top-left': { position: 'absolute', top: '6%', left: '6%', zIndex: 4 },
    'top-center': { position: 'absolute', top: '6%', left: '50%', transform: 'translateX(-50%)', zIndex: 4 },
    'top-right': { position: 'absolute', top: '6%', right: '6%', zIndex: 4 },
    'center-left': { position: 'absolute', top: '50%', left: '6%', transform: 'translateY(-50%)', zIndex: 4 },
    'center': { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 4 },
    'center-right': { position: 'absolute', top: '50%', right: '6%', transform: 'translateY(-50%)', zIndex: 4 },
    'bottom-left': { position: 'absolute', top: '85%', left: '6%', zIndex: 4 },
    'bottom-center': { position: 'absolute', top: '85%', left: '50%', transform: 'translateX(-50%)', zIndex: 4 },
    'bottom-right': { position: 'absolute', top: '85%', right: '6%', zIndex: 4 },
};"""

if old_positions in content:
    content = content.replace(old_positions, new_positions)
    fixed += 1
    print("[OK] Converted bottom positions to top-based (bottom:12% -> top:85%)")

# Fix 2: Make caption more compact - inline with reduced padding
old_caption_css = ".visual-caption { padding: 6px 12px; font-size: 13px; color: #475569; text-align: center; background: #f8fafc; border-top: 1px solid #e2e8f0; font-weight: 600; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; letter-spacing: 0.01em; line-height: 1.3; }"
new_caption_css = ".visual-caption { padding: 4px 10px; font-size: 11px; color: #64748b; text-align: center; background: #f8fafc; border-top: 1px solid #f1f5f9; font-weight: 500; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; letter-spacing: 0.01em; line-height: 1.2; margin: 0; }"
if old_caption_css in content:
    content = content.replace(old_caption_css, new_caption_css)
    fixed += 1
    print("[OK] Made caption more compact (smaller font, tighter padding)")

# Fix 3: Make image fill container properly - no white bars
old_img_css = ".visual-panel img { width: 100%; display: block; object-fit: contain; }"
new_img_css = ".visual-panel img { width: 100%; display: block; }"
if old_img_css in content:
    content = content.replace(old_img_css, new_img_css)
    fixed += 1
    print("[OK] Removed object-fit:contain from images (prevents white bars)")

# Fix 4: Make sequence arrow even more minimal
old_arrow = '.visual-sequence-arrow { display: flex; align-items: center; justify-content: center; font-size: 14px; color: #cbd5e1; align-self: center; padding: 0; margin: -2px 0; line-height: 1; height: 16px; }'
new_arrow = '.visual-sequence-arrow { display: flex; align-items: center; justify-content: center; font-size: 10px; color: #e2e8f0; align-self: center; padding: 0; margin: 0; line-height: 1; height: 12px; letter-spacing: 2px; }'
if old_arrow in content:
    content = content.replace(old_arrow, new_arrow)
    fixed += 1
    print("[OK] Made sequence arrow more minimal")

# Fix 5: Add inline background style to label JSX for reliability
# The CSS gradient might not be applying in all cases, add a visible background inline
old_label_jsx = """                                    <div
                                        key={labelIdx}
                                        className={`visual-label ${labelsHidden ? 'hidden-label' : ''}`}
                                        style={pos}
                                        onClick={() => handleLabelClick(panelIdx, labelIdx)}
                                        title={'Click to edit label'}
                                    >"""
new_label_jsx = """                                    <div
                                        key={labelIdx}
                                        className={`visual-label ${labelsHidden ? 'hidden-label' : ''}`}
                                        style={{...pos, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', padding: '6px 14px', borderRadius: '8px', border: '2px solid rgba(99,102,241,0.5)', boxShadow: '0 2px 12px rgba(99,102,241,0.2)', fontWeight: 800, fontSize: '13px', color: '#1e1b4b', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif"}}
                                        onClick={() => handleLabelClick(panelIdx, labelIdx)}
                                        title={'Click to edit label'}
                                    >"""
if old_label_jsx in content:
    content = content.replace(old_label_jsx, new_label_jsx)
    fixed += 1
    print("[OK] Added inline background/styling to label JSX for visual reliability")

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! {fixed} fixes applied.")
