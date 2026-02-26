"""
Safety Model + Teacher Toggle
1. Add GEMINI_MODELS.safety = 'gemini-2.5-flash-lite'
2. Switch aiCheck to use GEMINI_MODELS.safety
3. Add safetyFlaggingVisible state (persisted to localStorage)
4. Add toggle button in teacher dashboard toolbar
5. Gate safety column display with the toggle
"""
import sys, os

FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'AlloFlowANTI.txt')

def apply_edits():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    edits_applied = 0

    # ============================================================
    # EDIT 1: Add GEMINI_MODELS.safety entry
    # ============================================================
    target_1 = """  tts: 'gemini-2.5-flash-preview-tts',
};"""
    replacement_1 = """  tts: 'gemini-2.5-flash-preview-tts',
  safety: 'gemini-2.5-flash-lite',
};"""

    if target_1 in content:
        content = content.replace(target_1, replacement_1, 1)
        edits_applied += 1
        print("✅ EDIT1: Added GEMINI_MODELS.safety = gemini-2.5-flash-lite")
    else:
        print("❌ EDIT1: Could not find GEMINI_MODELS closing")

    # ============================================================
    # EDIT 2: Switch aiCheck from GEMINI_MODELS.flash to .safety
    # ============================================================
    target_2 = """            const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.flash}:generateContent?key=${apiKey}`;"""
    # Only replace the one inside SafetyContentChecker (first occurrence, near line 710)
    # The other occurrences of GEMINI_MODELS.flash are in different functions
    # Since the safety checker URL is the first usage of GEMINI_MODELS.flash in the file,
    # we can replace only the first occurrence
    replacement_2 = """            const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.safety}:generateContent?key=${apiKey}`;"""

    # Find the first occurrence only (should be in SafetyContentChecker)
    idx = content.find(target_2)
    if idx != -1 and idx < 50000:  # Safety check is near line 710, well before 50000 chars
        content = content[:idx] + replacement_2 + content[idx + len(target_2):]
        edits_applied += 1
        print("✅ EDIT2: aiCheck now uses GEMINI_MODELS.safety")
    else:
        print("❌ EDIT2: Could not find aiCheck URL")

    # ============================================================
    # EDIT 3: Add safetyFlaggingVisible state (teacher dashboard level)
    # Place it near the existing showRTISettings state
    # ============================================================
    target_3 = """    const [showRTISettings, setShowRTISettings] = React.useState(false);"""
    replacement_3 = """    const [showRTISettings, setShowRTISettings] = React.useState(false);
    const [safetyFlaggingVisible, setSafetyFlaggingVisible] = React.useState(() => {
        try { return localStorage.getItem('alloflow_safety_visible') !== 'false'; } catch (e) { return true; }
    });
    React.useEffect(() => {
        try { localStorage.setItem('alloflow_safety_visible', String(safetyFlaggingVisible)); } catch (e) {}
    }, [safetyFlaggingVisible]);"""

    if target_3 in content:
        content = content.replace(target_3, replacement_3, 1)
        edits_applied += 1
        print("✅ EDIT3: Added safetyFlaggingVisible state with localStorage persistence")
    else:
        print("❌ EDIT3: Could not find showRTISettings state")

    # ============================================================
    # EDIT 4: Add toggle button in teacher dashboard toolbar
    # Place it after the RTI config button (⚙️ button near RTI settings)
    # ============================================================
    target_4 = """                                <button 
                                    aria-label="Delete"
                                    data-help-key="dashboard_clear_btn\""""
    replacement_4 = """                                <button
                                    aria-label="Toggle Safety Flags"
                                    data-help-key="dashboard_safety_toggle"
                                    onClick={() => setSafetyFlaggingVisible(prev => !prev)}
                                    className={`${safetyFlaggingVisible ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-400 hover:bg-slate-500'} text-white px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm`}
                                    title={safetyFlaggingVisible ? 'Safety flags visible — click to hide' : 'Safety flags hidden — click to show'}
                                >
                                    <Shield size={16} /> {safetyFlaggingVisible ? '🛡️ Safety On' : '🛡️ Off'}
                                </button>
                                <button 
                                    aria-label="Delete"
                                    data-help-key="dashboard_clear_btn\""""

    if target_4 in content:
        content = content.replace(target_4, replacement_4, 1)
        edits_applied += 1
        print("✅ EDIT4: Added Safety toggle button to toolbar")
    else:
        print("❌ EDIT4: Could not find clear data button")

    # ============================================================
    # EDIT 5: Gate the safety flags column header with toggle
    # ============================================================
    target_5 = """                                            { key: 'flags', label: t('class_analytics.safety_flags') },"""
    replacement_5 = """                                            ...(safetyFlaggingVisible ? [{ key: 'flags', label: t('class_analytics.safety_flags') }] : []),"""

    if target_5 in content:
        content = content.replace(target_5, replacement_5, 1)
        edits_applied += 1
        print("✅ EDIT5: Safety flags column header gated by toggle")
    else:
        print("❌ EDIT5: Could not find flags column header")

    # ============================================================
    # EDIT 6: Gate the safety flags cell with toggle
    # The cell is the td block that shows flag count or —
    # ============================================================
    target_6 = """                                            <td className="p-2 text-center">
                                                {(() => {
                                                    const flagCount = student.safetyFlags?.length || 0;
                                                    const liveFlagCount = student.data?.flagSummary?.total || 0;
                                                    const totalFlags = flagCount + liveFlagCount;
                                                    const hasCritical = student.safetyFlags?.some(f => f.severity === 'critical') || student.data?.flagSummary?.hasCritical;
                                                    if (totalFlags > 0) {
                                                        return <span className={`${hasCritical ? 'bg-red-200 text-red-800 ring-2 ring-red-300' : 'bg-rose-100 text-rose-700'} px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 justify-center`}
                                                            title={student.isLive && student.data?.flagSummary ? `Live flags: ${Object.entries(student.data.flagSummary.categories || {}).map(([k,v]) => `${k}: ${v}`).join(', ')}` : ''}>
                                                            {hasCritical ? '🚨' : <AlertCircle size={12} />} {totalFlags}
                                                        </span>;
                                                    }
                                                    return <span className="text-slate-500">—</span>;
                                                })()}
                                            </td>"""
    
    replacement_6 = """                                            {safetyFlaggingVisible && <td className="p-2 text-center">
                                                {(() => {
                                                    const flagCount = student.safetyFlags?.length || 0;
                                                    const liveFlagCount = student.data?.flagSummary?.total || 0;
                                                    const totalFlags = flagCount + liveFlagCount;
                                                    const hasCritical = student.safetyFlags?.some(f => f.severity === 'critical') || student.data?.flagSummary?.hasCritical;
                                                    if (totalFlags > 0) {
                                                        return <span className={`${hasCritical ? 'bg-red-200 text-red-800 ring-2 ring-red-300' : 'bg-rose-100 text-rose-700'} px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 justify-center`}
                                                            title={student.isLive && student.data?.flagSummary ? `Live flags: ${Object.entries(student.data.flagSummary.categories || {}).map(([k,v]) => `${k}: ${v}`).join(', ')}` : ''}>
                                                            {hasCritical ? '🚨' : <AlertCircle size={12} />} {totalFlags}
                                                        </span>;
                                                    }
                                                    return <span className="text-slate-500">—</span>;
                                                })()}
                                            </td>}"""

    if target_6 in content:
        content = content.replace(target_6, replacement_6, 1)
        edits_applied += 1
        print("✅ EDIT6: Safety flags cell gated by toggle")
    else:
        print("❌ EDIT6: Could not find safety flags cell")

    # Write
    if edits_applied > 0:
        with open(FILE, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\n✅ Done! {edits_applied}/6 edit(s) applied.")
    else:
        print("\n❌ No edits applied.")
    return edits_applied

if __name__ == '__main__':
    edits = apply_edits()
    sys.exit(0 if edits > 0 else 1)
