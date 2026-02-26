"""
Three-part fix script:
1. Extract Label Challenge Results to a dedicated modal overlay
2. Remove Google Slides .gdoc reference from export_slides
3. Delete orphan help string definitions (profiles, etc.)
"""

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

# =====================================================
# PART 1: Extract Label Challenge Results to Modal
# =====================================================

# Step 1a: Remove the inline comparison view from inside the label map
old_inline = """            {/* === Label Challenge Comparison View === */}
            {showComparison && challengeResult && (
                <div style={{ marginTop: "12px", padding: "16px", background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0fdf4 100%)", borderRadius: "12px", border: "1px solid #bbf7d0" }}>
                    <h4 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: 800, color: "#166534", textAlign: "center" }}>🏆 Label Challenge Results</h4>
                    <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginBottom: "12px" }}>
                        <div style={{ textAlign: "center", padding: "10px 20px", background: "white", borderRadius: "10px", border: "1px solid #d1d5db" }}>
                            <div style={{ fontSize: "28px", fontWeight: 900, color: challengeResult.score >= 80 ? "#16a34a" : challengeResult.score >= 50 ? "#f59e0b" : "#ef4444" }}>{challengeResult.score}%</div>
                            <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Score</div>
                        </div>
                        <div style={{ textAlign: "center", padding: "10px 20px", background: "white", borderRadius: "10px", border: "1px solid #d1d5db" }}>
                            <div style={{ fontSize: "28px", fontWeight: 900, color: "#4f46e5" }}>{challengeResult.totalCorrect || 0}/{challengeResult.totalExpected || 0}</div>
                            <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Correct</div>
                        </div>
                        {(challengeResult.totalClose || 0) > 0 && (
                            <div style={{ textAlign: "center", padding: "10px 20px", background: "white", borderRadius: "10px", border: "1px solid #fde68a" }}>
                                <div style={{ fontSize: "28px", fontWeight: 900, color: "#f59e0b" }}>{challengeResult.totalClose}</div>
                                <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Close</div>
                            </div>
                        )}
                    </div>
                    <p style={{ textAlign: "center", fontSize: "14px", color: "#374151", fontWeight: 500, margin: "0 0 12px 0", fontStyle: "italic" }}>{challengeResult.feedback}</p>
                    {challengeResult.labelResults && challengeResult.labelResults.length > 0 && (
                        <div style={{ display: "grid", gap: "6px" }}>
                            {challengeResult.labelResults.map((r, ri) => (
                                <div key={ri} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", background: r.verdict === "correct" ? "#f0fdf4" : r.verdict === "close" ? "#fffbeb" : "#fef2f2", borderRadius: "8px", border: `1px solid ${r.verdict === "correct" ? "#bbf7d0" : r.verdict === "close" ? "#fde68a" : "#fecaca"}`, fontSize: "13px" }}>
                                    <span style={{ fontSize: "16px" }}>{r.verdict === "correct" ? "✅" : r.verdict === "close" ? "🟡" : "❌"}</span>
                                    <strong>{r.studentLabel}</strong>
                                    <span style={{ color: "#6b7280" }}>— {r.note}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <div style={{ textAlign: "center", marginTop: "12px" }}>
                        <button onClick={() => setLabelsHidden(false)} style={{ padding: "8px 20px", borderRadius: "8px", border: "1px solid #6366f1", background: "#4f46e5", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>👁️ Show Answer Key</button>
                    </div>
                </div>
            )}"""

if old_inline in content:
    content = content.replace(old_inline, '', 1)
    changes.append("Part 1a: Removed inline comparison view from label map")
else:
    print("[WARN] Could not find inline comparison view")

# Step 1b: Add modal version AFTER the panel grid closing tag
# Find the closing </div> of the component's return, right before the very end
# The modal should render after the panel grid and student labels section

modal_code = """
            {/* === Label Challenge Results Modal === */}
            {showComparison && challengeResult && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', animation: 'fadeIn 0.2s ease-out' }}
                     onClick={(e) => { if (e.target === e.currentTarget) setShowComparison(false); }}
                     role="dialog" aria-modal="true" aria-label="Label Challenge Results">
                    <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxWidth: '520px', width: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.25s ease-out', overflow: 'hidden' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)' }}>
                            <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#166534' }}>🏆 Label Challenge Results</h4>
                            <button onClick={() => setShowComparison(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280', padding: '4px 8px', borderRadius: '6px', lineHeight: 1 }} aria-label="Close results">✕</button>
                        </div>
                        {/* Scrollable Content */}
                        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                            {/* Score Cards */}
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                                <div style={{ textAlign: 'center', padding: '12px 24px', background: challengeResult.score >= 80 ? '#f0fdf4' : challengeResult.score >= 50 ? '#fffbeb' : '#fef2f2', borderRadius: '12px', border: `2px solid ${challengeResult.score >= 80 ? '#86efac' : challengeResult.score >= 50 ? '#fde68a' : '#fecaca'}`, minWidth: '90px' }}>
                                    <div style={{ fontSize: '32px', fontWeight: 900, color: challengeResult.score >= 80 ? '#16a34a' : challengeResult.score >= 50 ? '#f59e0b' : '#ef4444' }}>{challengeResult.score}%</div>
                                    <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Score</div>
                                </div>
                                <div style={{ textAlign: 'center', padding: '12px 24px', background: '#eef2ff', borderRadius: '12px', border: '2px solid #c7d2fe', minWidth: '90px' }}>
                                    <div style={{ fontSize: '32px', fontWeight: 900, color: '#4f46e5' }}>{challengeResult.totalCorrect || 0}/{challengeResult.totalExpected || 0}</div>
                                    <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Correct</div>
                                </div>
                                {(challengeResult.totalClose || 0) > 0 && (
                                    <div style={{ textAlign: 'center', padding: '12px 24px', background: '#fffbeb', borderRadius: '12px', border: '2px solid #fde68a', minWidth: '90px' }}>
                                        <div style={{ fontSize: '32px', fontWeight: 900, color: '#f59e0b' }}>{challengeResult.totalClose}</div>
                                        <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Close</div>
                                    </div>
                                )}
                            </div>
                            {/* Feedback */}
                            <p style={{ textAlign: 'center', fontSize: '15px', color: '#374151', fontWeight: 500, margin: '0 0 16px 0', fontStyle: 'italic', lineHeight: 1.5 }}>{challengeResult.feedback}</p>
                            {/* Label-by-Label Results */}
                            {challengeResult.labelResults && challengeResult.labelResults.length > 0 && (
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Label Details</div>
                                    {challengeResult.labelResults.map((r, ri) => (
                                        <div key={ri} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 14px', background: r.verdict === 'correct' ? '#f0fdf4' : r.verdict === 'close' ? '#fffbeb' : '#fef2f2', borderRadius: '10px', border: `1px solid ${r.verdict === 'correct' ? '#bbf7d0' : r.verdict === 'close' ? '#fde68a' : '#fecaca'}`, fontSize: '13px', lineHeight: 1.5 }}>
                                            <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>{r.verdict === 'correct' ? '✅' : r.verdict === 'close' ? '🟡' : '❌'}</span>
                                            <div>
                                                <strong style={{ color: '#1e293b' }}>{r.studentLabel}</strong>
                                                <div style={{ color: '#6b7280', marginTop: '2px' }}>{r.note}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Footer */}
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                            <button onClick={() => { setLabelsHidden(false); setShowComparison(false); }} style={{ padding: '10px 24px', borderRadius: '10px', border: '1px solid #6366f1', background: '#4f46e5', color: 'white', fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>👁️ Show Answer Key</button>
                            <button onClick={() => setShowComparison(false)} style={{ padding: '10px 24px', borderRadius: '10px', border: '1px solid #d1d5db', background: 'white', color: '#374151', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>Close</button>
                        </div>
                    </div>
                </div>
            )}"""

# Insert the modal right before the component's closing </div>
# Find the right place - after the panel grid and before the final return's </div>
insert_marker = """            </div>
        </div>
    );
});"""

if insert_marker in content:
    content = content.replace(insert_marker, f"""            </div>{modal_code}
        </div>
    );
}});""", 1)
    changes.append("Part 1b: Added Label Challenge Results modal overlay")
else:
    print("[WARN] Could not find component return closing marker")
    # Try alternate: find the VisualPanelGrid's return closing
    alt_marker = "        </div>\n    );\n});"
    if alt_marker in content:
        content = content.replace(alt_marker, f"        </div>{modal_code}\n    );\n}});", 1)
        changes.append("Part 1b (alt): Added Label Challenge Results modal overlay")
    else:
        print("[WARN] Alt marker also not found")

# =====================================================
# PART 2: Remove Google Slides .gdoc reference
# =====================================================
old_export = "Export formats: PowerPoint (.pptx), Google Slides (.gdoc link), or PDF slides."
new_export = "Export formats: PowerPoint (.pptx) or PDF slides."
if old_export in content:
    content = content.replace(old_export, new_export, 1)
    changes.append("Part 2: Removed Google Slides .gdoc reference from export_slides")
else:
    print("[WARN] Could not find Google Slides reference in export_slides")

# =====================================================
# PART 3: Delete true orphan help string definitions
# =====================================================
# These keys have NO code references and can be safely deleted
orphans = [
    'analysis_depth', 'analysis_focus',
    'dashboard_toggle_graded',
    'export_share_button', 'export_word_button',
    'header_animation_toggle', 'header_help_toggle', 'header_hints_recall',
    'header_overlay_toggle', 'header_settings_voice_pitch', 'header_sync_toggle',
    'header_theme_toggle', 'header_view_toggle', 'header_xp_modal',
    'large_file_dropzone', 'large_file_transcribe_btn',
    'outline_depth', 'persona_continue_btn',
    'profiles_export_button', 'profiles_import_button',
    'profiles_save_button', 'profiles_select_dropdown',
    'quiz_boss_difficulty', 'quiz_end_btn',
    'resource_next_button', 'resource_prev_button',
    'tool_phonics_mode', 'visuals_delete',
    'wizard_file_upload_btn', 'word_sounds_play', 'wordsounds_check_btn',
]

orphan_count = 0
for key in orphans:
    # Find and remove the line containing this key definition
    # Pattern: 'key_name': "..." or 'key_name': '...'
    import re
    # Match the full line including the help string value
    pattern = re.compile(r"^\s*'" + re.escape(key) + r"'\s*:.*$\n?", re.MULTILINE)
    match = pattern.search(content)
    if match:
        content = content[:match.start()] + content[match.end():]
        orphan_count += 1
    else:
        print(f"[SKIP] Orphan key not found: {key}")

if orphan_count > 0:
    changes.append(f"Part 3: Deleted {orphan_count} orphan help string definitions")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n{'='*60}")
print(f"Applied {len(changes)} changes:")
for c in changes:
    print(f"  ✓ {c}")
print(f"{'='*60}")
