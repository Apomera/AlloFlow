"""
Teacher-Configurable RTI Thresholds
1. Add rtiThresholds state + showRTISettings state
2. Refactor classifyRTITier to accept an optional thresholds param
3. Add ⚙️ Configure button on RTI Summary Card header
4. Add settings modal with sliders for each threshold
5. Wire all classifyRTITier call sites to pass thresholds
"""
import sys, os

FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'AlloFlowANTI.txt')

DEFAULT_THRESHOLDS = {
    'quizTier3': 50,
    'quizTier2': 80,
    'wsTier3': 50,
    'wsTier2': 75,
    'engagementMin': 2,
    'fluencyMin': 60,
    'labelChallengeMin': 50,
}

def apply_edits():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    edits_applied = 0

    # ============================================================
    # EDIT 1: Add state variables after searchQuery
    # ============================================================
    target_1 = "    const [searchQuery, setSearchQuery] = React.useState('');"
    replacement_1 = """    const [searchQuery, setSearchQuery] = React.useState('');
    const [showRTISettings, setShowRTISettings] = React.useState(false);
    const [rtiThresholds, setRtiThresholds] = React.useState({
        quizTier3: 50, quizTier2: 80,
        wsTier3: 50, wsTier2: 75,
        engagementMin: 2, fluencyMin: 60,
        labelChallengeMin: 50
    });"""

    if target_1 in content:
        content = content.replace(target_1, replacement_1, 1)
        edits_applied += 1
        print("✅ EDIT1: Added rtiThresholds + showRTISettings state")
    else:
        print("❌ EDIT1: Could not find searchQuery state")

    # ============================================================
    # EDIT 2: Refactor classifyRTITier to accept optional thresholds param
    # ============================================================
    target_2 = """    // RTI Tier Classification Engine
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
        }"""

    replacement_2 = """    // RTI Tier Classification Engine (supports configurable thresholds)
    const classifyRTITier = (stats, thresholds) => {
        const t3 = thresholds || rtiThresholds || { quizTier3: 50, quizTier2: 80, wsTier3: 50, wsTier2: 75, engagementMin: 2, fluencyMin: 60, labelChallengeMin: 50 };
        const reasons = [];
        const recs = [];
        let tier = 1;

        // Quiz performance
        if (stats.quizAvg < t3.quizTier3) {
            tier = Math.max(tier, 3);
            reasons.push(`Quiz average below ${t3.quizTier3}%`);
            recs.push('Increase scaffolding on quiz activities; consider breaking content into smaller chunks');
        } else if (stats.quizAvg < t3.quizTier2) {
            tier = Math.max(tier, 2);
            reasons.push(`Quiz average in instructional range (${t3.quizTier3}-${t3.quizTier2 - 1}%)`);
            recs.push('Provide targeted review on missed concepts before advancing');
        }

        // Word Sounds accuracy
        if (stats.wsAccuracy > 0) {
            if (stats.wsAccuracy < t3.wsTier3) {
                tier = Math.max(tier, 3);
                reasons.push(`Word Sounds accuracy below ${t3.wsTier3}%`);
                recs.push('Focus on phonemic awareness with simpler CVC patterns; increase TTS scaffolding');
            } else if (stats.wsAccuracy < t3.wsTier2) {
                tier = Math.max(tier, 2);
                reasons.push('Word Sounds accuracy in developing range');
                recs.push('Practice with word families; use the fill-in-blank label mode for vocabulary building');
            }
        }

        // Engagement
        if (stats.totalActivities < t3.engagementMin) {
            tier = Math.max(tier, 2);
            reasons.push(`Very low engagement (fewer than ${t3.engagementMin} activities)`);
            recs.push('Check for access barriers; consider student interest inventory to personalize content');
        }

        // Fluency
        if (stats.fluencyWCPM > 0 && stats.fluencyWCPM < t3.fluencyMin) {
            tier = Math.max(tier, 2);
            reasons.push(`Fluency below ${t3.fluencyMin} WCPM`);
            recs.push('Implement repeated reading with the fluency assessment tool; track WCPM trend weekly');
        }

        // Label Challenge
        if (stats.labelChallengeAvg > 0 && stats.labelChallengeAvg < t3.labelChallengeMin) {
            tier = Math.max(tier, 2);
            reasons.push(`Label Challenge average below ${t3.labelChallengeMin}%`);
            recs.push('Use fill-in-blank mode to build vocabulary before attempting from-scratch labeling');
        }

        // Positive indicators
        if (tier === 1) {
            if (stats.quizAvg >= t3.quizTier2) reasons.push('Strong quiz performance');
            if (stats.wsAccuracy >= t3.wsTier2) reasons.push('Solid phonemic accuracy');
            if (stats.totalActivities >= 5) reasons.push('Good engagement level');
            if (stats.fluencyWCPM >= 100) reasons.push('Strong fluency');
            recs.push('Ready for increased challenge, reduced scaffolding, or peer tutoring roles');
        }"""

    if target_2 in content:
        content = content.replace(target_2, replacement_2, 1)
        edits_applied += 1
        print("✅ EDIT2: Refactored classifyRTITier for configurable thresholds")
    else:
        print("❌ EDIT2: Could not find classifyRTITier function")

    # ============================================================
    # EDIT 3: Add ⚙️ Configure button to RTI Summary Card header
    # ============================================================
    target_3 = """                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                    🎯 RTI Tier Distribution
                                </h3>
                                <span className="text-xs text-slate-400">{classSummary.totalStudents} students</span>
                            </div>"""

    replacement_3 = """                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                    🎯 RTI Tier Distribution
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400">{classSummary.totalStudents} students</span>
                                    <button
                                        aria-label="Configure RTI Thresholds"
                                        onClick={() => setShowRTISettings(true)}
                                        className="p-1.5 rounded-lg hover:bg-white/80 text-slate-400 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-200"
                                        title="Configure RTI Thresholds"
                                    >
                                        <Settings size={14} />
                                    </button>
                                </div>
                            </div>"""

    if target_3 in content:
        content = content.replace(target_3, replacement_3, 1)
        edits_applied += 1
        print("✅ EDIT3: Added ⚙️ Configure button to RTI Summary Card")
    else:
        print("❌ EDIT3: Could not find RTI card header")

    # ============================================================
    # EDIT 4: Add RTI Settings Modal right before the Chart.js row
    # ============================================================
    target_4 = "                    {/* Chart.js Visualization Row */}"

    settings_modal = """                    {/* RTI Threshold Settings Modal */}
                    {showRTISettings && (
                        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowRTISettings(false)}>
                            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg border-2 border-indigo-100 transform transition-all animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <div className="bg-indigo-100 p-2 rounded-full text-indigo-600"><Settings size={18} /></div>
                                        RTI Threshold Configuration
                                    </h3>
                                    <button onClick={() => setShowRTISettings(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400" aria-label="Close"><X size={18} /></button>
                                </div>
                                <p className="text-xs text-slate-500 mb-4">Adjust classification cutoffs to match your grade level, district benchmarks, or screening tool norms. Changes apply immediately to all student classifications.</p>
                                <div className="space-y-4">
                                    {[
                                        { key: 'quizTier3', label: '🔴 Quiz — Tier 3 cutoff', desc: 'Below this → Intensive', unit: '%', min: 10, max: 80, step: 5 },
                                        { key: 'quizTier2', label: '🟡 Quiz — Tier 2 cutoff', desc: 'Below this → Strategic', unit: '%', min: 40, max: 100, step: 5 },
                                        { key: 'wsTier3', label: '🔴 Word Sounds — Tier 3 cutoff', desc: 'Below this → Intensive', unit: '%', min: 10, max: 80, step: 5 },
                                        { key: 'wsTier2', label: '🟡 Word Sounds — Tier 2 cutoff', desc: 'Below this → Strategic', unit: '%', min: 30, max: 100, step: 5 },
                                        { key: 'engagementMin', label: '🟡 Minimum Activities', desc: 'Fewer than this → Strategic', unit: '', min: 1, max: 20, step: 1 },
                                        { key: 'fluencyMin', label: '🟡 Fluency WCPM Floor', desc: 'Below this → Strategic', unit: ' WCPM', min: 20, max: 200, step: 10 },
                                        { key: 'labelChallengeMin', label: '🟡 Label Challenge Floor', desc: 'Below this → Strategic', unit: '%', min: 10, max: 80, step: 5 }
                                    ].map(item => (
                                        <div key={item.key} className="flex items-center gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-semibold text-slate-700">{item.label}</div>
                                                <div className="text-xs text-slate-400">{item.desc}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="range"
                                                    min={item.min}
                                                    max={item.max}
                                                    step={item.step}
                                                    value={rtiThresholds[item.key]}
                                                    onChange={e => setRtiThresholds(prev => ({ ...prev, [item.key]: Number(e.target.value) }))}
                                                    className="w-24 accent-indigo-600"
                                                    aria-label={item.label}
                                                />
                                                <span className="text-sm font-bold text-indigo-600 w-16 text-right">{rtiThresholds[item.key]}{item.unit}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
                                    <button
                                        onClick={() => setRtiThresholds({ quizTier3: 50, quizTier2: 80, wsTier3: 50, wsTier2: 75, engagementMin: 2, fluencyMin: 60, labelChallengeMin: 50 })}
                                        className="text-xs text-slate-500 hover:text-indigo-600 font-medium transition-colors"
                                    >
                                        ↺ Reset to Defaults
                                    </button>
                                    <button
                                        onClick={() => setShowRTISettings(false)}
                                        className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md text-sm"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Chart.js Visualization Row */}"""

    if target_4 in content:
        content = content.replace(target_4, settings_modal, 1)
        edits_applied += 1
        print("✅ EDIT4: Added RTI Settings Modal")
    else:
        print("❌ EDIT4: Could not find Chart.js insertion point")

    # Write
    if edits_applied > 0:
        with open(FILE, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\n✅ Done! {edits_applied}/4 edit(s) applied.")
    else:
        print("\n❌ No edits applied.")
    return edits_applied

if __name__ == '__main__':
    edits = apply_edits()
    sys.exit(0 if edits > 0 else 1)
