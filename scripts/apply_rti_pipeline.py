"""
RTI Pipeline - Full Stack Implementation
Layer 1: classifyRTITier function (after calculateStudentStats)
Layer 2: generateRTICSV export function + button
Layer 3: RTI Dashboard section in student detail view with tier badge, metrics, sparklines
"""
import sys
import os

FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'AlloFlowANTI.txt')

def apply_edits():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    edits_applied = 0

    # ============================================================
    # EDIT 1: Add classifyRTITier + generateRTICSV after calculateStudentStats
    # Insert after "return stats;" and before "// Extract safety flags"
    # ============================================================
    target_1 = """        return stats;
    };
    // Extract safety flags from persona chat history"""

    replacement_1 = """        return stats;
    };

    // RTI Tier Classification Engine
    const classifyRTITier = (stats) => {
        const reasons = [];
        const recs = [];
        let tier = 1;

        // Quiz performance
        if (stats.quizAvg < 50) {
            tier = Math.max(tier, 3);
            reasons.push('Quiz average below 50%');
            recs.push('Increase scaffolding on quiz activities; consider breaking content into smaller chunks');
        } else if (stats.quizAvg < 80) {
            tier = Math.max(tier, 2);
            reasons.push('Quiz average in instructional range (50-79%)');
            recs.push('Provide targeted review on missed concepts before advancing');
        }

        // Word Sounds accuracy
        if (stats.wsAccuracy > 0) {
            if (stats.wsAccuracy < 50) {
                tier = Math.max(tier, 3);
                reasons.push('Word Sounds accuracy below 50%');
                recs.push('Focus on phonemic awareness with simpler CVC patterns; increase TTS scaffolding');
            } else if (stats.wsAccuracy < 75) {
                tier = Math.max(tier, 2);
                reasons.push('Word Sounds accuracy in developing range');
                recs.push('Practice with word families; use the fill-in-blank label mode for vocabulary building');
            }
        }

        // Engagement
        if (stats.totalActivities < 2) {
            tier = Math.max(tier, 2);
            reasons.push('Very low engagement (fewer than 2 activities)');
            recs.push('Check for access barriers; consider student interest inventory to personalize content');
        }

        // Fluency
        if (stats.fluencyWCPM > 0 && stats.fluencyWCPM < 60) {
            tier = Math.max(tier, 2);
            reasons.push('Fluency below 60 WCPM');
            recs.push('Implement repeated reading with the fluency assessment tool; track WCPM trend weekly');
        }

        // Label Challenge
        if (stats.labelChallengeAvg > 0 && stats.labelChallengeAvg < 50) {
            tier = Math.max(tier, 2);
            reasons.push('Label Challenge average below 50%');
            recs.push('Use fill-in-blank mode to build vocabulary before attempting from-scratch labeling');
        }

        // Positive indicators
        if (tier === 1) {
            if (stats.quizAvg >= 80) reasons.push('Strong quiz performance');
            if (stats.wsAccuracy >= 75) reasons.push('Solid phonemic accuracy');
            if (stats.totalActivities >= 5) reasons.push('Good engagement level');
            if (stats.fluencyWCPM >= 100) reasons.push('Strong fluency');
            recs.push('Ready for increased challenge, reduced scaffolding, or peer tutoring roles');
        }

        const tierLabels = {
            1: { label: 'Tier 1 — On Track', color: '#16a34a', bg: '#dcfce7', border: '#86efac', emoji: '🟢' },
            2: { label: 'Tier 2 — Strategic', color: '#d97706', bg: '#fef9c3', border: '#fcd34d', emoji: '🟡' },
            3: { label: 'Tier 3 — Intensive', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', emoji: '🔴' }
        };

        return { tier, ...tierLabels[tier], reasons, recommendations: recs };
    };

    // RTI CSV Export
    const generateRTICSV = () => {
        if (!importedStudents || importedStudents.length === 0) return;
        const headers = ['Student', 'Date', 'RTI Tier', 'Quiz Avg', 'WS Accuracy', 'WS Words', 'Fluency WCPM', 'Games Played', 'Total Activities', 'Label Challenge Avg', 'Time on Task (min)', 'Recommendations'];
        const rows = importedStudents.map(s => {
            const rti = classifyRTITier(s.stats);
            const tot = s.data?.timeOnTask?.totalSessionMinutes || 0;
            return [
                s.name,
                new Date().toLocaleDateString(),
                'Tier ' + rti.tier,
                s.stats.quizAvg + '%',
                s.stats.wsAccuracy + '%',
                s.stats.wsWordsCompleted,
                s.stats.fluencyWCPM,
                s.stats.gamesPlayed,
                s.stats.totalActivities,
                s.stats.labelChallengeAvg + '%',
                Math.round(tot),
                '"' + rti.recommendations.join('; ').replace(/"/g, "'") + '"'
            ].join(',');
        });
        const csv = [headers.join(','), ...rows].join('\\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `RTI_Report_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };

    // Extract safety flags from persona chat history"""

    if target_1 in content:
        content = content.replace(target_1, replacement_1, 1)
        edits_applied += 1
        print("✅ EDIT1: Added classifyRTITier + generateRTICSV functions")
    else:
        print("❌ EDIT1: Could not find calculateStudentStats end")

    # ============================================================
    # EDIT 2: Add RTI tier to student table header + row
    # ============================================================
    target_2 = """                                            { key: 'name', label: t('class_analytics.student_name'), align: 'left', round: 'rounded-l-lg' },
                                            { key: 'quizAvg', label: t('class_analytics.quiz_avg') },"""

    replacement_2 = """                                            { key: 'name', label: t('class_analytics.student_name'), align: 'left', round: 'rounded-l-lg' },
                                            { key: 'rtiTier', label: 'RTI' },
                                            { key: 'quizAvg', label: t('class_analytics.quiz_avg') },"""

    if target_2 in content:
        content = content.replace(target_2, replacement_2, 1)
        edits_applied += 1
        print("✅ EDIT2: Added RTI column header to student table")
    else:
        print("❌ EDIT2: Could not find student table header")

    # Add RTI badge to student row
    target_2b = """                                            <td className="p-2 font-medium">{student.name}</td>
                                            <td className="p-2 text-center">{student.stats.quizAvg}%</td>"""

    replacement_2b = """                                            <td className="p-2 font-medium">{student.name}</td>
                                            <td className="p-2 text-center">{(() => { const rti = classifyRTITier(student.stats); return <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: rti.bg, color: rti.color, border: `1px solid ${rti.border}` }}>{rti.emoji} {rti.tier}</span>; })()}</td>
                                            <td className="p-2 text-center">{student.stats.quizAvg}%</td>"""

    if target_2b in content:
        content = content.replace(target_2b, replacement_2b, 1)
        edits_applied += 1
        print("✅ EDIT2b: Added RTI badge to student table row")
    else:
        print("❌ EDIT2b: Could not find student table row")

    # ============================================================
    # EDIT 3: Add 📊 Export RTI Report button near import area
    # ============================================================
    target_3 = """                    {/* Student Table */}
                    {importedStudents.length === 0 ? ("""

    replacement_3 = """                    {/* RTI Export Button */}
                    {importedStudents.length > 0 && (
                        <div className="flex gap-2 mb-3 items-center">
                            <button
                                onClick={generateRTICSV}
                                aria-label="Export RTI progress report as CSV"
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-bold text-sm hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md"
                            >
                                📊 Export RTI Report
                            </button>
                            <span className="text-xs text-slate-500">Download CSV with tier classifications, metrics, and recommendations</span>
                        </div>
                    )}
                    {/* Student Table */}
                    {importedStudents.length === 0 ? ("""

    if target_3 in content:
        content = content.replace(target_3, replacement_3, 1)
        edits_applied += 1
        print("✅ EDIT3: Added 📊 Export RTI Report button")
    else:
        print("❌ EDIT3: Could not find student table marker")

    # ============================================================
    # EDIT 4: Add RTI Dashboard section in student detail modal
    # Insert between the student name header and the safety flags section
    # ============================================================
    target_4 = """                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {/* Safety Flags Section */}"""

    replacement_4 = """                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {/* RTI Progress Monitor Dashboard */}
                            {(() => {
                                const rti = classifyRTITier(selectedStudent.stats);
                                const s = selectedStudent.stats;
                                const metrics = [
                                    { label: 'Quiz Average', value: s.quizAvg + '%', color: s.quizAvg >= 80 ? '#16a34a' : s.quizAvg >= 50 ? '#d97706' : '#dc2626', icon: '📝' },
                                    { label: 'WS Accuracy', value: s.wsAccuracy + '%', color: s.wsAccuracy >= 75 ? '#16a34a' : s.wsAccuracy >= 50 ? '#d97706' : '#dc2626', icon: '🔊' },
                                    { label: 'Fluency', value: s.fluencyWCPM + ' WCPM', color: s.fluencyWCPM >= 100 ? '#16a34a' : s.fluencyWCPM >= 60 ? '#d97706' : '#dc2626', icon: '📖' },
                                    { label: 'Games', value: s.gamesPlayed, color: s.gamesPlayed >= 5 ? '#16a34a' : s.gamesPlayed >= 2 ? '#d97706' : '#dc2626', icon: '🎮' },
                                    { label: 'Activities', value: s.totalActivities, color: s.totalActivities >= 5 ? '#16a34a' : s.totalActivities >= 2 ? '#d97706' : '#dc2626', icon: '📊' },
                                    { label: 'Label Challenge', value: s.labelChallengeAvg + '%', color: s.labelChallengeAvg >= 80 ? '#16a34a' : s.labelChallengeAvg >= 50 ? '#d97706' : '#dc2626', icon: '🏷️' }
                                ];
                                // Sparkline from fluency data
                                const fluencyData = selectedStudent.data?.fluencyAssessments?.map(a => a.wcpm || 0) || [];
                                const gameScores = selectedStudent.data?.gameCompletions
                                    ? Object.values(selectedStudent.data.gameCompletions).flat().map(e => e.score ?? e.accuracy ?? 0)
                                    : [];
                                const renderSparkline = (data, color) => {
                                    if (data.length < 2) return null;
                                    const max = Math.max(...data, 1);
                                    const min = Math.min(...data, 0);
                                    const range = max - min || 1;
                                    const w = 100, h = 30;
                                    const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
                                    const trend = data[data.length - 1] >= data[0] ? '↑' : '↓';
                                    return (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
                                                <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                {data.map((v, i) => (
                                                    <circle key={i} cx={(i / (data.length - 1)) * w} cy={h - ((v - min) / range) * (h - 4) - 2} r="2.5" fill={color} />
                                                ))}
                                            </svg>
                                            <span style={{ fontSize: '14px', fontWeight: 700, color: trend === '↑' ? '#16a34a' : '#dc2626' }}>{trend}</span>
                                        </div>
                                    );
                                };
                                return (
                                    <div data-help-key="dashboard_rti_monitor" className="mb-4 p-4 rounded-xl border-2" style={{ background: `linear-gradient(135deg, ${rti.bg} 0%, white 100%)`, borderColor: rti.border }}>
                                        {/* Tier Badge */}
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <span style={{ fontSize: '28px' }}>{rti.emoji}</span>
                                                <div>
                                                    <div style={{ fontSize: '16px', fontWeight: 800, color: rti.color }}>{rti.label}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>RTI Progress Monitor</div>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                {new Date().toLocaleDateString()}
                                            </div>
                                        </div>
                                        {/* Metric Cards */}
                                        <div className="grid grid-cols-3 gap-2 mb-3">
                                            {metrics.map((m, i) => (
                                                <div key={i} className="bg-white rounded-lg p-2 text-center border" style={{ borderColor: m.color + '33' }}>
                                                    <div style={{ fontSize: '10px', marginBottom: '2px' }}>{m.icon}</div>
                                                    <div style={{ fontSize: '16px', fontWeight: 800, color: m.color }}>{m.value}</div>
                                                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>{m.label}</div>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Sparklines Section */}
                                        {(fluencyData.length >= 2 || gameScores.length >= 2) && (
                                            <div className="grid grid-cols-2 gap-2 mb-3">
                                                {fluencyData.length >= 2 && (
                                                    <div className="bg-white rounded-lg p-2 border border-slate-100">
                                                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>📖 Fluency Trend</div>
                                                        {renderSparkline(fluencyData, '#6366f1')}
                                                    </div>
                                                )}
                                                {gameScores.length >= 2 && (
                                                    <div className="bg-white rounded-lg p-2 border border-slate-100">
                                                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>🎮 Game Scores Trend</div>
                                                        {renderSparkline(gameScores, '#8b5cf6')}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {/* Reasoning */}
                                        <div className="mb-2">
                                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Assessment Basis:</div>
                                            <div className="flex flex-wrap gap-1">
                                                {rti.reasons.map((r, i) => (
                                                    <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: rti.bg, color: rti.color, fontWeight: 600, border: `1px solid ${rti.border}` }}>
                                                        {r}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Recommendations */}
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>💡 Recommendations:</div>
                                            <ul style={{ fontSize: '12px', color: '#334155', margin: 0, paddingLeft: '16px', lineHeight: 1.6 }}>
                                                {rti.recommendations.map((r, i) => (
                                                    <li key={i}>{r}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                );
                            })()}
                            {/* Safety Flags Section */}"""

    if target_4 in content:
        content = content.replace(target_4, replacement_4, 1)
        edits_applied += 1
        print("✅ EDIT4: Added RTI Dashboard section in student detail modal")
    else:
        print("❌ EDIT4: Could not find student detail insertion point")

    # Write
    if edits_applied > 0:
        with open(FILE, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\n✅ Done! {edits_applied}/5 edit(s) applied.")
    else:
        print("\n❌ No edits applied.")
    return edits_applied

if __name__ == '__main__':
    edits = apply_edits()
    sys.exit(0 if edits > 0 else 1)
