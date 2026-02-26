"""
Polish fixes:
1. Enhance title visually (gradient background, decorative elements)
2. Move refine input inline below the selected panel instead of at bottom
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
original_lines = len(content.split('\n'))
fixed = 0

# ============================================================
# FIX 1: Enhance visual support title
# ============================================================

old_title = """{visualPlan.title && <h3 style={{ textAlign: 'center', fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>{visualPlan.title}</h3>}"""

new_title = """{visualPlan.title && <div style={{ textAlign: 'center', margin: '0 0 10px 0', padding: '8px 16px', background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #c7d2fe 100%)', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.2)' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#312e81', margin: 0, letterSpacing: '0.02em', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>{visualPlan.title}</h3>
                {visualPlan.layout && <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{visualPlan.layout.replace('-', ' ')} view</span>}
            </div>}"""

if old_title in content:
    content = content.replace(old_title, new_title)
    fixed += 1
    print("[OK] FIX 1: Enhanced title with gradient background and layout badge")
else:
    print("[WARN] FIX 1: Title block not found")

# ============================================================
# FIX 2: Move refine input inline below selected panel
# Step A: Add inline refine input inside the panel loop (after </figure>)
# Step B: Remove the old refine input from outside the loop
# ============================================================

# Step A: Add refine input after the sequence arrow, inside the .map loop
old_sequence_block = """                        {/* Sequence arrow between panels */}
                        {visualPlan.layout === 'sequence' && panelIdx < orderedPanels.length - 1 && (
                            <div className="visual-sequence-arrow">\u2022 \u2022 \u2022</div>
                        )}
                    </React.Fragment>"""

new_sequence_block = """                        {/* Inline refine input for selected panel */}
                        {refiningPanelIdx === panelIdx && (
                            <div style={{ display: 'flex', gap: 6, marginTop: 6, padding: '6px 8px', background: '#fafafe', borderRadius: '8px', border: '1px solid #e0e7ff' }}>
                                <input
                                    value={refineInput}
                                    onChange={(e) => setRefineInput(e.target.value)}
                                    placeholder={`Describe changes for Panel ${panelIdx + 1}...`}
                                    onKeyDown={(e) => e.key === 'Enter' && handleRefineSubmit(panelIdx)}
                                    autoFocus
                                    style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #c7d2fe', fontSize: 12, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", outline: 'none' }}
                                />
                                <button
                                    aria-label="Apply panel edit"
                                    onClick={() => handleRefineSubmit(panelIdx)}
                                    style={{ padding: '6px 14px', borderRadius: 6, background: '#4f46e5', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}
                                >Apply</button>
                                <button
                                    aria-label="Cancel"
                                    onClick={() => setRefiningPanelIdx(null)}
                                    style={{ padding: '6px 10px', borderRadius: 6, background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 12 }}
                                >\u2715</button>
                            </div>
                        )}
                        {/* Sequence arrow between panels */}
                        {visualPlan.layout === 'sequence' && panelIdx < orderedPanels.length - 1 && (
                            <div className="visual-sequence-arrow">\u2022 \u2022 \u2022</div>
                        )}
                    </React.Fragment>"""

if old_sequence_block in content:
    content = content.replace(old_sequence_block, new_sequence_block)
    fixed += 1
    print("[OK] FIX 2a: Added inline refine input inside panel loop")
else:
    print("[WARN] FIX 2a: Sequence block not found")

# Step B: Remove old refine input from outside the loop
old_refine_outside = """            {/* Per-panel refinement input */}
            {refiningPanelIdx !== null && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <input
                        value={refineInput}
                        onChange={(e) => setRefineInput(e.target.value)}
                        placeholder={`Describe changes for Panel ${refiningPanelIdx + 1}...`}
                        onKeyDown={(e) => e.key === 'Enter' && handleRefineSubmit(refiningPanelIdx)}
                        style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
                    />
                    <button
                        aria-label="Apply panel edit"
                        onClick={() => handleRefineSubmit(refiningPanelIdx)}
                        style={{ padding: '8px 16px', borderRadius: 8, background: '#4f46e5', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                    >
                        {'Apply'}
                    </button>
                </div>
            )}"""

if old_refine_outside in content:
    content = content.replace(old_refine_outside, '')
    fixed += 1
    print("[OK] FIX 2b: Removed old refine input from outside panel loop")
else:
    print("[WARN] FIX 2b: Old refine input block not found")

# ============================================================
# Verify
# ============================================================
new_lines = len(content.split('\n'))
diff = new_lines - original_lines
print(f"\nLine count: {original_lines} -> {new_lines} (diff: {diff:+d})")

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! {fixed} fixes applied.")
