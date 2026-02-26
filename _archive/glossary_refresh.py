"""
Glossary Health Check: Suggestion Refresh Feature

After a user adds a suggested term:
1. Remove that term from the coverageGaps list immediately
2. Call Gemini for 1 replacement suggestion
3. Append the new suggestion to the list

Two changes required:
A. Add a helper function `fetchReplacementSuggestion` near runGlossaryHealthCheck
B. Modify the Add button onClick to remove + replace after add completes
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    text = f.read()
lines = text.split('\n')

# =========================================================================
# CHANGE A: Insert helper function after runGlossaryHealthCheck closes (L40273)
# =========================================================================
# Find the closing of runGlossaryHealthCheck (the line with }, [callGemini]);)
helper_marker = "}, [callGemini]);"
helper_insert_idx = None
for i in range(40270, 40280):
    if helper_marker in lines[i]:
        helper_insert_idx = i + 1
        break

if helper_insert_idx is None:
    print("ERROR: Could not find runGlossaryHealthCheck closing")
    sys.exit(1)

helper_function = """
  // === Fetch a single replacement suggestion for health check coverage gaps ===
  const fetchReplacementSuggestion = React.useCallback(async (existingTerms, addedTerm, sourceText) => {
    try {
      const termNames = existingTerms.map(t => t.term || t.word || (typeof t === 'string' ? t : '')).filter(Boolean);
      termNames.push(addedTerm); // include just-added term so we don't re-suggest it
      const prompt = `You are a literacy specialist. A student glossary already contains these terms: ${termNames.join(', ')}.

Suggest exactly 1 NEW important vocabulary term that is missing from this glossary and would strengthen a student's understanding of the source text.

${sourceText ? `SOURCE TEXT (first 400 chars):\\n${sourceText.substring(0, 400)}` : ''}

Return ONLY valid JSON (no markdown): {"term": "suggested term", "reason": "why it should be included (max 15 words)"}`;
      const result = await callGemini(prompt, true);
      if (result) {
        const cleaned = result.replace(/\`\`\`json\\s*/g, '').replace(/\`\`\`\\s*/g, '').trim();
        let parsed;
        try { parsed = JSON.parse(cleaned); } catch(e) {
          const m = result.match(/\\{[\\s\\S]*\\}/);
          if (m) parsed = JSON.parse(m[0]);
        }
        if (parsed && parsed.term) return parsed;
      }
    } catch(e) {
      debugLog('🩺 [HealthCheck] fetchReplacementSuggestion failed:', e.message);
    }
    return null;
  }, [callGemini]);
"""

lines.insert(helper_insert_idx, helper_function)
print(f"INSERTED fetchReplacementSuggestion after L{helper_insert_idx}")

# =========================================================================
# CHANGE B: Modify the Add button onClick handler
# Find the onClick at L66051 (now shifted by inserted lines)
# =========================================================================
# We need to find the exact line with: onClick={() => { handleQuickAddGlossary(gap.term); }}
# after the insertion, line numbers shifted. Search by content.

old_onclick = "onClick={() => { handleQuickAddGlossary(gap.term); }}"
new_onclick = """onClick={async () => {
                                                    const addedTerm = gap.term;
                                                    await handleQuickAddGlossary(addedTerm);
                                                    // Remove added term from coverageGaps immediately
                                                    setGlossaryHealthCheck(prev => {
                                                        if (!prev || !Array.isArray(prev.coverageGaps)) return prev;
                                                        return { ...prev, coverageGaps: prev.coverageGaps.filter(g => g.term !== addedTerm) };
                                                    });
                                                    // Fetch a replacement suggestion in the background
                                                    const allTerms = generatedContent?.data || [];
                                                    const srcText = latestAnalysis?.data?.originalText || '';
                                                    const replacement = await fetchReplacementSuggestion(allTerms, addedTerm, srcText);
                                                    if (replacement) {
                                                        setGlossaryHealthCheck(prev => {
                                                            if (!prev) return prev;
                                                            const gaps = Array.isArray(prev.coverageGaps) ? [...prev.coverageGaps] : [];
                                                            gaps.push(replacement);
                                                            return { ...prev, coverageGaps: gaps };
                                                        });
                                                    }
                                                }}"""

replaced = False
for i in range(len(lines)):
    if old_onclick in lines[i]:
        lines[i] = lines[i].replace(old_onclick, new_onclick)
        replaced = True
        print(f"REPLACED onClick handler at L{i+1}")
        break

if not replaced:
    print("ERROR: Could not find Add button onClick handler")
    sys.exit(1)

# =========================================================================
# Save and verify
# =========================================================================
text = '\n'.join(lines)
open_b = text.count('{')
close_b = text.count('}')
print(f"Brace balance: {open_b} open, {close_b} close, delta = {open_b - close_b}")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(text)
print("FILE SAVED")
