"""
Gemini-Powered Hybrid Safety Analysis
1. Add SafetyContentChecker.aiCheck() method — lightweight async Gemini call
2. Add aiSafetyFlags state to the App component
3. Inject non-blocking async safety check into 3 handlers
"""
import sys, os

FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'AlloFlowANTI.txt')

def apply_edits():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    edits_applied = 0

    # ============================================================
    # EDIT 1: Add aiCheck method to SafetyContentChecker
    # Insert right before the closing of SafetyContentChecker
    # ============================================================
    target_1 = """        return labelMap[category] || category;
    }
};"""

    replacement_1 = """        return labelMap[category] || category;
    },
    /**
     * AI-powered safety check using Gemini (async, non-blocking)
     * Runs a lightweight classification on student text — separate from main Gemini calls.
     * @param {string} text - Student-submitted text
     * @param {string} source - Origin ('socratic', 'persona', 'adventure')
     * @param {string} apiKey - Gemini API key
     * @param {function} onFlag - Callback when a flag is found: (flag) => void
     */
    async aiCheck(text, source, apiKey, onFlag) {
        if (!text || text.length < 5 || !apiKey) return;
        // Skip if regex already found critical flags (already handled)
        const regexFlags = this.check(text);
        if (regexFlags.some(f => f.severity === 'critical')) return;
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`;
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `You are a K-12 student safety classifier for an educational platform. Analyze this student message and respond with ONLY a JSON object. Be sensitive to context — educational discussions about difficult topics (history, health) are NOT flags.

Student message: "${text.substring(0, 500)}"

Respond ONLY with this JSON (no markdown, no explanation):
{"safe": true/false, "category": "none|self_harm|harm_to_others|bullying|inappropriate|off_task|concerning", "confidence": 0.0-1.0, "reason": "brief explanation"}` }] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 100 }
                })
            });
            if (!resp.ok) return;
            const data = await resp.json();
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            // Parse JSON from response (handle markdown wrapping)
            const jsonMatch = rawText.match(/\\{[\\s\\S]*\\}/);
            if (!jsonMatch) return;
            const result = JSON.parse(jsonMatch[0]);
            if (!result.safe && result.confidence > 0.7 && result.category !== 'none') {
                const flag = {
                    category: `ai_${result.category}`,
                    match: result.reason || 'AI-detected concern',
                    severity: ['self_harm', 'harm_to_others'].includes(result.category) ? 'critical' : 'medium',
                    source: source,
                    context: text.substring(0, 100),
                    timestamp: new Date().toISOString(),
                    aiGenerated: true,
                    confidence: result.confidence
                };
                if (onFlag) onFlag(flag);
            }
        } catch (e) {
            // Silent fail — safety check should never break the app
        }
    }
};"""

    if target_1 in content:
        content = content.replace(target_1, replacement_1, 1)
        edits_applied += 1
        print("✅ EDIT1: Added SafetyContentChecker.aiCheck() method")
    else:
        print("❌ EDIT1: Could not find SafetyContentChecker closing")

    # ============================================================
    # EDIT 2: Add aiSafetyFlags state in the App component
    # Place after the existing progressSyncTimerRef
    # ============================================================
    target_2 = """  const [lastProgressSync, setLastProgressSync] = useState(null);"""
    replacement_2 = """  const [lastProgressSync, setLastProgressSync] = useState(null);
  const [aiSafetyFlags, setAiSafetyFlags] = useState([]);
  const handleAiSafetyFlag = React.useCallback((flag) => {
      setAiSafetyFlags(prev => [...prev, flag]);
      // If critical, show immediate toast notification
      if (flag.severity === 'critical') {
          if (typeof addToast === 'function') {
              addToast(`🚨 Safety concern detected in ${flag.source}: ${flag.match}`, 'error');
          }
      }
      debugLog('[AISafety] Flag detected:', flag.category, flag.match);
  }, []);"""

    if target_2 in content:
        content = content.replace(target_2, replacement_2, 1)
        edits_applied += 1
        print("✅ EDIT2: Added aiSafetyFlags state + handler")
    else:
        print("❌ EDIT2: Could not find lastProgressSync state")

    # ============================================================
    # EDIT 3: Inject async safety check into handleSocraticSubmit
    # Fire after text capture, before the try block
    # ============================================================
    target_3 = """      if (!inputOverride) {
          setSocraticInput('');
      }
      try {
          const latestAnalysis = history.slice().reverse().find(h => h.type === 'analysis');"""
    
    replacement_3 = """      if (!inputOverride) {
          setSocraticInput('');
      }
      // ── Non-blocking AI safety check (runs in parallel, never delays response) ──
      SafetyContentChecker.aiCheck(textToSend, 'socratic', apiKey, handleAiSafetyFlag);
      try {
          const latestAnalysis = history.slice().reverse().find(h => h.type === 'analysis');"""

    if target_3 in content:
        content = content.replace(target_3, replacement_3, 1)
        edits_applied += 1
        print("✅ EDIT3: Injected AI safety check into handleSocraticSubmit")
    else:
        print("❌ EDIT3: Could not find socratic try block")

    # ============================================================
    # EDIT 4: Inject async safety check into handlePersonaChatSubmit
    # Fire after text validation, before main logic
    # ============================================================
    target_4 = """      if (!personaState.selectedCharacter) return;
      const hintsWereViewed = personaTurnHintsViewed;
      setPersonaInput('');"""
    
    replacement_4 = """      if (!personaState.selectedCharacter) return;
      // ── Non-blocking AI safety check ──
      SafetyContentChecker.aiCheck(textToSend, 'persona', apiKey, handleAiSafetyFlag);
      const hintsWereViewed = personaTurnHintsViewed;
      setPersonaInput('');"""

    if target_4 in content:
        content = content.replace(target_4, replacement_4, 1)
        edits_applied += 1
        print("✅ EDIT4: Injected AI safety check into handlePersonaChatSubmit")
    else:
        print("❌ EDIT4: Could not find persona hint/input block")

    # ============================================================
    # EDIT 5: Inject async safety check into handleAdventureTextSubmit
    # Fire after text capture, before state mutation
    # ============================================================
    target_5 = """    const currentInput = overrideInput || adventureTextInput;
    if (!currentInput.trim()) return;
    lastTurnSnapshot.current = structuredClone(adventureState);"""
    
    replacement_5 = """    const currentInput = overrideInput || adventureTextInput;
    if (!currentInput.trim()) return;
    // ── Non-blocking AI safety check ──
    SafetyContentChecker.aiCheck(currentInput, 'adventure', apiKey, handleAiSafetyFlag);
    lastTurnSnapshot.current = structuredClone(adventureState);"""

    if target_5 in content:
        content = content.replace(target_5, replacement_5, 1)
        edits_applied += 1
        print("✅ EDIT5: Injected AI safety check into handleAdventureTextSubmit")
    else:
        print("❌ EDIT5: Could not find adventure text submit")

    # ============================================================
    # EDIT 6: Include AI flags in the live sync flagSummary
    # Extend the existing flagSummary block to also count AI flags
    # ============================================================
    target_6 = """                      return { total: flags.length, categories: summary, hasCritical: flags.some(f => f.severity === 'critical') };
                  } catch (e) { return { total: 0, categories: {}, hasCritical: false }; }
              })()"""
    
    replacement_6 = """                      // Merge AI-detected flags into the summary
                      if (typeof aiSafetyFlags !== 'undefined' && aiSafetyFlags.length > 0) {
                          aiSafetyFlags.forEach(f => { summary[f.category] = (summary[f.category] || 0) + 1; flags.push(f); });
                      }
                      return { total: flags.length, categories: summary, hasCritical: flags.some(f => f.severity === 'critical') };
                  } catch (e) { return { total: 0, categories: {}, hasCritical: false }; }
              })()"""

    if target_6 in content:
        content = content.replace(target_6, replacement_6, 1)
        edits_applied += 1
        print("✅ EDIT6: AI flags now included in live sync flagSummary")
    else:
        print("❌ EDIT6: Could not find flagSummary return block")

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
