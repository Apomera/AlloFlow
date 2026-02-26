"""
RTI Summary Card + Sort Fix
1. Extend classSummary with tier distribution
2. Add RTI Summary Card after class summary cards
3. Fix rtiTier sort in student table comparator
"""
import sys, os

FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'AlloFlowANTI.txt')

def apply_edits():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    edits_applied = 0

    # ============================================================
    # EDIT 1: Extend classSummary with RTI tier distribution
    # ============================================================
    target_1 = """            flagBreakdown: (() => {
                const bd = {};
                importedStudents.forEach(s => s.safetyFlags.forEach(f => { bd[f.category] = (bd[f.category] || 0) + 1; }));
                return bd;
            })()
        };"""

    replacement_1 = """            flagBreakdown: (() => {
                const bd = {};
                importedStudents.forEach(s => s.safetyFlags.forEach(f => { bd[f.category] = (bd[f.category] || 0) + 1; }));
                return bd;
            })(),
            rtiDistribution: (() => {
                const dist = { 1: [], 2: [], 3: [] };
                importedStudents.forEach(s => {
                    const rti = classifyRTITier(s.stats);
                    dist[rti.tier].push(s.name);
                });
                return dist;
            })()
        };"""

    if target_1 in content:
        content = content.replace(target_1, replacement_1, 1)
        edits_applied += 1
        print("✅ EDIT1: Extended classSummary with rtiDistribution")
    else:
        print("❌ EDIT1: Could not find classSummary flagBreakdown")

    # ============================================================
    # EDIT 2: Fix rtiTier sort in student table comparator
    # ============================================================
    target_2 = """                if (sortColumn === 'name') { valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); }
                else if (sortColumn === 'flags') { valA = a.safetyFlags.length; valB = b.safetyFlags.length; }
                else { valA = a.stats[sortColumn] || 0; valB = b.stats[sortColumn] || 0; }"""

    replacement_2 = """                if (sortColumn === 'name') { valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); }
                else if (sortColumn === 'flags') { valA = a.safetyFlags.length; valB = b.safetyFlags.length; }
                else if (sortColumn === 'rtiTier') { valA = classifyRTITier(a.stats).tier; valB = classifyRTITier(b.stats).tier; }
                else { valA = a.stats[sortColumn] || 0; valB = b.stats[sortColumn] || 0; }"""

    if target_2 in content:
        content = content.replace(target_2, replacement_2, 1)
        edits_applied += 1
        print("✅ EDIT2: Fixed rtiTier sort in student table")
    else:
        print("❌ EDIT2: Could not find sort comparator")

    # ============================================================
    # EDIT 3: Add RTI Summary Card after existing class summary cards
    # ============================================================
    target_3 = """                    {/* Chart.js Visualization Row */}
                    {importedStudents.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {/* Quiz Score Distribution */}"""

    replacement_3 = """                    {/* RTI Tier Distribution Summary */}
                    {classSummary?.rtiDistribution && (
                        <div data-help-key="dashboard_rti_summary" className="mb-4 p-4 bg-gradient-to-r from-slate-50 to-indigo-50 border border-indigo-200 rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                    🎯 RTI Tier Distribution
                                </h3>
                                <span className="text-xs text-slate-400">{classSummary.totalStudents} students</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3 mb-3">
                                {[
                                    { tier: 1, label: 'Tier 1 — On Track', emoji: '🟢', color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
                                    { tier: 2, label: 'Tier 2 — Strategic', emoji: '🟡', color: '#d97706', bg: '#fef9c3', border: '#fcd34d' },
                                    { tier: 3, label: 'Tier 3 — Intensive', emoji: '🔴', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' }
                                ].map(t => {
                                    const students = classSummary.rtiDistribution[t.tier] || [];
                                    const pct = classSummary.totalStudents > 0 ? Math.round((students.length / classSummary.totalStudents) * 100) : 0;
                                    return (
                                        <div key={t.tier} className="rounded-xl p-3 text-center border-2 transition-all hover:shadow-md" style={{ background: t.bg, borderColor: t.border }}>
                                            <div style={{ fontSize: '24px' }}>{t.emoji}</div>
                                            <div style={{ fontSize: '28px', fontWeight: 800, color: t.color }}>{students.length}</div>
                                            <div style={{ fontSize: '11px', fontWeight: 700, color: t.color }}>{t.label}</div>
                                            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{pct}% of class</div>
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Visual proportion bar */}
                            <div className="flex rounded-full overflow-hidden h-3 bg-slate-200" role="img" aria-label="RTI tier distribution bar">
                                {[
                                    { tier: 1, color: '#16a34a' },
                                    { tier: 2, color: '#d97706' },
                                    { tier: 3, color: '#dc2626' }
                                ].map(t => {
                                    const count = (classSummary.rtiDistribution[t.tier] || []).length;
                                    const pct = classSummary.totalStudents > 0 ? (count / classSummary.totalStudents) * 100 : 0;
                                    if (pct === 0) return null;
                                    return <div key={t.tier} style={{ width: pct + '%', backgroundColor: t.color, transition: 'width 0.5s ease' }} />;
                                })}
                            </div>
                            {/* Student names in Tier 2 and 3 */}
                            {((classSummary.rtiDistribution[2] || []).length > 0 || (classSummary.rtiDistribution[3] || []).length > 0) && (
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    {(classSummary.rtiDistribution[3] || []).length > 0 && (
                                        <div className="bg-white rounded-lg p-2 border border-rose-100">
                                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#dc2626', marginBottom: '4px' }}>🔴 Intensive</div>
                                            <div className="flex flex-wrap gap-1">
                                                {classSummary.rtiDistribution[3].map((name, i) => (
                                                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-medium border border-rose-200">{name}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {(classSummary.rtiDistribution[2] || []).length > 0 && (
                                        <div className="bg-white rounded-lg p-2 border border-amber-100">
                                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#d97706', marginBottom: '4px' }}>🟡 Strategic</div>
                                            <div className="flex flex-wrap gap-1">
                                                {classSummary.rtiDistribution[2].map((name, i) => (
                                                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium border border-amber-200">{name}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    {/* Chart.js Visualization Row */}
                    {importedStudents.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {/* Quiz Score Distribution */}"""

    if target_3 in content:
        content = content.replace(target_3, replacement_3, 1)
        edits_applied += 1
        print("✅ EDIT3: Added RTI Summary Card")
    else:
        print("❌ EDIT3: Could not find Chart.js insertion point")

    # Write
    if edits_applied > 0:
        with open(FILE, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\n✅ Done! {edits_applied}/3 edit(s) applied.")
    else:
        print("\n❌ No edits applied.")
    return edits_applied

if __name__ == '__main__':
    edits = apply_edits()
    sys.exit(0 if edits > 0 else 1)
