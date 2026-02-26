import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix 1: Live Translation Contrast
old_dt = """          textTranslated: _dContrast ? '#FFFF00' : (_dDark ? '#c7d2fe' : '#312e81'),"""
new_dt = """          textTranslated: _dContrast ? '#FFFF00' : (_dDark ? '#f8fafc' : '#0f172a'),"""
if old_dt in text:
    text = text.replace(old_dt, new_dt)
    print("Patched textTranslated contrast")
else:
    print("Could not patch textTranslated")

# Fix 2: Prevent Quick Add Glossary from triggering Allobot Tip
old_glossary = """const handleQuickAddGlossary = async (rawWord) => {"""
new_glossary = """const handleQuickAddGlossary = async (rawWord, skipTip = false) => {"""
if old_glossary in text:
    text = text.replace(old_glossary, new_glossary)
    print("Patched handleQuickAddGlossary args")

old_tip = """              if (autoRemoveWords) {
                  try {
                      generateAllobotTip("Just captured a new word for your glossary! Review it anytime.", "glossary", newTermItem);
                  } catch(e) {}
              }"""
new_tip = """              if (!skipTip && autoRemoveWords) {
                  try {
                      generateAllobotTip("Just captured a new word for your glossary! Review it anytime.", "glossary", newTermItem);
                  } catch(e) {}
              }"""
if old_tip in text:
    text = text.replace(old_tip, new_tip)
    print("Patched Quick Add Tip skip")

# Update Bridge Quick Add Calls
for old_call in [
    "handleQuickAddGlossary(addedTerm)", 
    "handleQuickAddGlossary(selectionMenu.text)", 
    "handleQuickAddGlossary(cleanWord)", 
    "handleQuickAddGlossary(displayPart)", 
    "handleQuickAddGlossary(word)"]:
    text = text.replace(old_call, old_call.replace("(", "(", 1).replace(")", ", true)"))
    print("Patched a handleQuickAddGlossary call to skip tip")


# Fix 3: Update `handleF2FSubmit` Generation Prompt to include definitions and visuals
old_explain = """ prompt = `Explain the following concept at ${gradeLevel} reading level. Also provide a translation in ${targetLang}. Format your response as JSON: {"english": "explanation in English", "translated": "explanation in ${targetLang}", "terms": ["key", "vocabulary", "terms"]}\\n\\nConcept: ${bridgeSendText}`;"""
new_explain = """ prompt = `Explain the following concept at ${gradeLevel} reading level. Also provide a translation in ${targetLang}. For up to 3 key vocabulary terms, provide a simple child-friendly definition AND a short image description prompt. Format your response as JSON: {"english": "explanation in English", "translated": "explanation in ${targetLang}", "terms": [{"word": "term1", "definition": "simple definition", "imagePrompt": "short visual description for child-friendly illustration"}]}\\n\\nConcept: ${bridgeSendText}`;"""
if old_explain in text:
    text = text.replace(old_explain, new_explain)
    print("Patched 'explain' prompt")

old_term_img = """                    if (selectedMode === 'visual') {
                      try {
                        imageUrl = await callGeminiImageEdit(`Educational illustration: ${bridgeSendText}. Clear, simple, child-friendly diagram suitable for ${gradeLevel} students.`);
                      } catch(e) { warnLog('Bridge visual generation failed', e); }
                      // Generate per-term images (limit to 3 to avoid rate limits)
                      if (parsed.terms && Array.isArray(parsed.terms)) {
                        const termObjs = parsed.terms.filter(t => t && typeof t === 'object' && t.imagePrompt);
                        const toGenerate = termObjs.slice(0, 3);
                        for (const termObj of toGenerate) {
                          try {
                            termObj.imageUrl = await callGeminiImageEdit(`Simple child-friendly illustration of: ${termObj.imagePrompt}. Clean, colorful, educational style on white background.`);
                          } catch(e) { warnLog('Bridge term image failed:', termObj.word, e); }
                        }
                      }
                    }"""
new_term_img = """                    if (selectedMode === 'visual') {
                      try {
                        imageUrl = await callGeminiImageEdit(`Educational illustration: ${bridgeSendText}. Clear, simple, child-friendly diagram suitable for ${gradeLevel} students.`);
                      } catch(e) { warnLog('Bridge visual generation failed', e); }
                    }
                    if (parsed.terms && Array.isArray(parsed.terms)) {
                      const termObjs = parsed.terms.filter(t => t && typeof t === 'object' && t.imagePrompt);
                      const toGenerate = termObjs.slice(0, 3);
                      for (const termObj of toGenerate) {
                        try {
                          termObj.imageUrl = await callGeminiImageEdit(`Simple child-friendly illustration of: ${termObj.imagePrompt}. Clean, colorful, educational design on white background. NO TEXT.`);
                        } catch(e) { warnLog('Bridge term image failed:', termObj.word, e); }
                      }
                    }"""
if old_term_img in text:
    text = text.replace(old_term_img, new_term_img)
    print("Patched term image generation hook")


# Fix 4: Bridge Mode Markdown Bold and TTS Strip
old_eng_span = """                  {bridgeMessage.english.split(/\\s+/).map((word, idx) => (
                    <span key={idx} style={{
                      padding:'2px 4px',borderRadius:'4px',transition:'all 0.15s',
                      background: bridgeActiveLanguage === 'en' && idx === bridgeKaraokeIndex ? 'rgba(99,102,241,0.3)' : 'transparent',
                      color: bridgeActiveLanguage === 'en' && idx === bridgeKaraokeIndex ? '#e0e7ff' : _dt.textEnglish
                    }}>{word}{' '}</span>
                  ))}"""
new_eng_span = """                  {bridgeMessage.english.split(/\\s+/).map((word, idx) => {
                    const isBold = /^\\*\\*(.*?)\\*\\*$/.test(word.trim());
                    const cleanWord = word.replace(/\\*\\*/g, '');
                    return (
                    <span key={idx} style={{
                      padding:'2px 4px',borderRadius:'4px',transition:'all 0.15s',
                      fontWeight: isBold ? '900' : 'normal',
                      letterSpacing: isBold ? '0.03em' : 'normal',
                      background: bridgeActiveLanguage === 'en' && idx === bridgeKaraokeIndex ? 'rgba(99,102,241,0.3)' : 'transparent',
                      color: bridgeActiveLanguage === 'en' && idx === bridgeKaraokeIndex ? '#e0e7ff' : _dt.textEnglish
                    }}>{cleanWord}{' '}</span>
                  )})}"""
if old_eng_span in text:
    text = text.replace(old_eng_span, new_eng_span)
    print("Patched English span markdown rendering")

old_tr_span = """                    {bridgeMessage.translated.split(/\\s+/).map((word, idx) => (
                      <span key={idx} style={{
                        padding:'2px 4px',borderRadius:'4px',transition:'all 0.15s',
                        background: bridgeActiveLanguage === 'translated' && idx === bridgeKaraokeIndex ? 'rgba(20,184,166,0.3)' : 'transparent',
                        color: bridgeActiveLanguage === 'translated' && idx === bridgeKaraokeIndex ? '#f0fdfa' : _dt.textTranslated
                      }}>{word}{' '}</span>
                    ))}"""
new_tr_span = """                    {bridgeMessage.translated.split(/\\s+/).map((word, idx) => {
                      const isBold = /^\\*\\*(.*?)\\*\\*$/.test(word.trim());
                      const cleanWord = word.replace(/\\*\\*/g, '');
                      return (
                      <span key={idx} style={{
                        padding:'2px 4px',borderRadius:'4px',transition:'all 0.15s',
                        fontWeight: isBold ? '900' : 'normal',
                        letterSpacing: isBold ? '0.03em' : 'normal',
                        background: bridgeActiveLanguage === 'translated' && idx === bridgeKaraokeIndex ? 'rgba(20,184,166,0.3)' : 'transparent',
                        color: bridgeActiveLanguage === 'translated' && idx === bridgeKaraokeIndex ? '#f0fdfa' : _dt.textTranslated
                      }}>{cleanWord}{' '}</span>
                    )})}"""
if old_tr_span in text:
    text = text.replace(old_tr_span, new_tr_span)
    print("Patched Translation span markdown rendering")


old_eng_tts = """                      try { await handleAudio(text); } catch(e) { warnLog('Bridge TTS error', e); }"""
new_eng_tts = """                      try { await handleAudio(text.replace(/\\*\\*/g, '')); } catch(e) { warnLog('Bridge TTS error', e); }"""
if text.count(old_eng_tts) > 0:
    text = text.replace(old_eng_tts, new_eng_tts)
    print("Patched TTS handleAudio stripping asterisks")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(text)
