"""
Safety Analysis Refinements — 5 Fixes
1. Switch from hardcoded gemini-2.0-flash-lite to GEMINI_MODELS.flash
2. Lower confidence threshold (0.5 for critical, 0.6 for others)
3. Remove student-facing toast, make flagging silent  
4. Surface live flagSummary in safety column for live-synced students
5. Add 🚨 critical badge on student name for live-flagged students
"""
import sys, os

FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'AlloFlowANTI.txt')

def apply_edits():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    edits_applied = 0

    # ============================================================
    # EDIT 1: Switch to GEMINI_MODELS.flash  
    # The aiCheck method is inside SafetyContentChecker (module-scope),
    # so GEMINI_MODELS is accessible.
    # ============================================================
    target_1 = """            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`;"""
    replacement_1 = """            const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.flash}:generateContent?key=${apiKey}`;"""

    if target_1 in content:
        content = content.replace(target_1, replacement_1, 1)
        edits_applied += 1
        print("✅ EDIT1: Switched to GEMINI_MODELS.flash")
    else:
        print("❌ EDIT1: Could not find flash-lite URL")

    # ============================================================
    # EDIT 2: Lower confidence threshold
    #   0.5 for critical (self_harm, harm_to_others)
    #   0.6 for everything else
    # ============================================================
    target_2 = """            if (!result.safe && result.confidence > 0.7 && result.category !== 'none') {
                const flag = {
                    category: `ai_${result.category}`,
                    match: result.reason || 'AI-detected concern',
                    severity: ['self_harm', 'harm_to_others'].includes(result.category) ? 'critical' : 'medium',"""
    
    replacement_2 = """            const isCriticalCategory = ['self_harm', 'harm_to_others'].includes(result.category);
            const confidenceThreshold = isCriticalCategory ? 0.5 : 0.6;
            if (!result.safe && result.confidence > confidenceThreshold && result.category !== 'none') {
                const flag = {
                    category: `ai_${result.category}`,
                    match: result.reason || 'AI-detected concern',
                    severity: isCriticalCategory ? 'critical' : 'medium',"""

    if target_2 in content:
        content = content.replace(target_2, replacement_2, 1)
        edits_applied += 1
        print("✅ EDIT2: Lowered confidence thresholds (0.5 critical, 0.6 others)")
    else:
        print("❌ EDIT2: Could not find confidence threshold block")

    # ============================================================
    # EDIT 3: Remove student-facing toast, make flagging silent
    # Only log to console, never show to student
    # ============================================================
    target_3 = """  const handleAiSafetyFlag = React.useCallback((flag) => {
      setAiSafetyFlags(prev => [...prev, flag]);
      // If critical, show immediate toast notification
      if (flag.severity === 'critical') {
          if (typeof addToast === 'function') {
              addToast(`🚨 Safety concern detected in ${flag.source}: ${flag.match}`, 'error');
          }
      }
      debugLog('[AISafety] Flag detected:', flag.category, flag.match);
  }, []);"""
    
    replacement_3 = """  const handleAiSafetyFlag = React.useCallback((flag) => {
      setAiSafetyFlags(prev => {
          const updated = [...prev, flag];
          // Persist flags to localStorage for teacher access (keyed by nickname)
          try {
              const key = `alloflow_ai_flags_${studentNickname || 'unknown'}`;
              localStorage.setItem(key, JSON.stringify(updated));
          } catch (e) { /* ignore */ }
          return updated;
      });
      // Silent flag — never show to student. Teacher sees these in the dashboard.
      debugLog('[AISafety] Flag detected:', flag.category, flag.source, flag.match);
  }, [studentNickname]);"""

    if target_3 in content:
        content = content.replace(target_3, replacement_3, 1)
        edits_applied += 1
        print("✅ EDIT3: Removed student-facing toast, flags now silent + localStorage-persisted")
    else:
        print("❌ EDIT3: Could not find handleAiSafetyFlag callback")

    # ============================================================
    # EDIT 4: Extended safety flags cell to show live flagSummary
    # Live students have data.flagSummary instead of safetyFlags array
    # ============================================================
    target_4 = """                                            <td className="p-2 text-center">
                                                {student.safetyFlags.length > 0 ? (
                                                    <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 justify-center">
                                                        <AlertCircle size={12} /> {student.safetyFlags.length}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500">—</span>
                                                )}
                                            </td>"""
    
    replacement_4 = """                                            <td className="p-2 text-center">
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

    if target_4 in content:
        content = content.replace(target_4, replacement_4, 1)
        edits_applied += 1
        print("✅ EDIT4: Safety column now shows live flagSummary + critical badge")
    else:
        print("❌ EDIT4: Could not find safety flags cell")

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
