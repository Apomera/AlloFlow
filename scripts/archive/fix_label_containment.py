"""Restructure panel JSX: wrap image + labels in a containment div.
The figure's display:flex prevents overflow:hidden from clipping absolutely-positioned labels.
Solution: Add an inner div wrapper around image+labels with explicit containment styles.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
fixed = 0

# The current structure (L1735-1808):
# <figure className="visual-panel" style={{ position: "relative" }}>
#   {role badge}
#   {imageUrl ? (<><img/>{leaderLines}{drawingSVG}</>) : (spinner)}
#   {/* Labels */}
#   {panel.labels.map(...)}
#   {/* User labels */}
#   {userLabels.map(...)}
#   {/* Panel actions */}
#   <div className="visual-panel-actions">...</div>
#   {caption}
# </figure>
#
# Need to wrap image + labels + overlays in a tight container div.
# The caption stays OUTSIDE the wrapper.

# Step 1: Replace the image fragment start with a wrapper div
old_img_start = """                            {panel.imageUrl ? (
                                <>
                                <img src={panel.imageUrl} alt={panel.caption || `Panel ${panelIdx + 1}`} loading="lazy" />
                                {!labelsHidden && renderLeaderLines(panel, panelIdx)}
                                {renderDrawingSVG(panelIdx)}
                                </>
                            ) : (
                                <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#94a3b8' }}>
                                    <div className="animate-spin" style={{ width: 24, height: 24, border: '3px solid #cbd5e1', borderTopColor: '#6366f1', borderRadius: '50%' }} />
                                </div>
                            )}
                            {/* HTML Overlay Labels */}"""

new_img_start = """                            <div style={{ position: 'relative', overflow: 'hidden' }}>
                            {panel.imageUrl ? (
                                <img src={panel.imageUrl} alt={panel.caption || `Panel ${panelIdx + 1}`} loading="lazy" style={{ width: '100%', display: 'block' }} />
                            ) : (
                                <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#94a3b8' }}>
                                    <div className="animate-spin" style={{ width: 24, height: 24, border: '3px solid #cbd5e1', borderTopColor: '#6366f1', borderRadius: '50%' }} />
                                </div>
                            )}
                            {!labelsHidden && renderLeaderLines(panel, panelIdx)}
                            {renderDrawingSVG(panelIdx)}
                            {/* HTML Overlay Labels */}"""

if old_img_start in content:
    content = content.replace(old_img_start, new_img_start)
    fixed += 1
    print("[OK] Opened containment wrapper div around image + labels")
else:
    print("[WARN] Could not find image fragment start pattern")

# Step 2: Close the wrapper div AFTER user labels and panel actions, BEFORE caption
old_actions_close = """                            {/* Per-panel edit button */}
                            <div className="visual-panel-actions">
                                <button
                                    aria-label="Refine this panel"
                                    onClick={() => setRefiningPanelIdx(refiningPanelIdx === panelIdx ? null : panelIdx)}
                                    title={'Refine this panel'}
                                >
                                    ✏️
                                </button>
                            </div>
                            {panel.caption && <figcaption className="visual-caption">{panel.caption}</figcaption>}"""

new_actions_close = """                            {/* Per-panel edit button */}
                            <div className="visual-panel-actions">
                                <button
                                    aria-label="Refine this panel"
                                    onClick={() => setRefiningPanelIdx(refiningPanelIdx === panelIdx ? null : panelIdx)}
                                    title={'Refine this panel'}
                                >
                                    ✏️
                                </button>
                            </div>
                            </div>
                            {panel.caption && <figcaption className="visual-caption">{panel.caption}</figcaption>}"""

if old_actions_close in content:
    content = content.replace(old_actions_close, new_actions_close)
    fixed += 1
    print("[OK] Closed containment wrapper div after panel actions, before caption")
else:
    print("[WARN] Could not find actions/caption pattern")

# Step 3: Remove display:flex from .visual-panel CSS since the wrapper handles layout now
old_panel_css = ".visual-panel { position: relative; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: white; transition: box-shadow 0.2s; margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; }"
new_panel_css = ".visual-panel { position: relative; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: white; transition: box-shadow 0.2s; margin: 0; padding: 0; list-style: none; }"
if old_panel_css in content:
    content = content.replace(old_panel_css, new_panel_css)
    fixed += 1
    print("[OK] Removed display:flex from .visual-panel CSS")

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! {fixed} fixes applied.")
