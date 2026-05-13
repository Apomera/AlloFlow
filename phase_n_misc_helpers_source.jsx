// phase_n_misc_helpers_source.jsx -- Phase N of CDN modularization.
// 6 mid-tier helpers: handleQuickAddGlossary, handleAddGlossaryTerm,
// handleGeneratePOSData, handleMasteryGrading, formatInteractiveText,
// handleCheckLevel.

const handleQuickAddGlossary = async (rawWord, skipTip = false, deps) => {
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, standardsInput, targetStandards, dokLevel, isLineFocusMode, clozeInstanceSet, glossaryDefinitionLevel, glossaryImageStyle, newGlossaryTerm, isAutoFillMode, isShowMeMode, autoRemoveWords, creativeMode, enableEmojiInline, useEmojis, isAnalyzingPos, focusMode, latestGlossary, toFocusText, alloBotRef, setGeneratedContent, setHistory, setError, setIsProcessing, setGenerationStep, setNewGlossaryTerm, setClozeInstanceSet, setGlossaryHealthIssues, setIsCheckingGlossaryHealth, setMasteryResult, setIsGradingMastery, setIsCheckingLevel, setLevelCheckResult, setIsGeneratingPOS, setIsAnalyzingPos, setIsAddingTerm, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, highlightGlossaryTerms, repairGeneratedText, getReadableContent, extractSourceTextForProcessing, calculateReadability, countWords, playSound, handleScoreUpdate, getDefaultTitle, parseTaggedContent, chunkText, _stripForImmersive, validateDraftQuality, RELEVANCE_GATE_PROMPT, ClozeInput, MathSymbol } = deps;
  try { if (window._DEBUG_PHASE_N) console.log("[PhaseN] handleQuickAddGlossary fired"); } catch(_) {}
      const word = rawWord.replace(/[^a-zA-ZÀ-ÿ0-9-\s]/g, "").trim();
      if (!word || word.length < 2) return;
      setIsAddingTerm(true);
      addToast(t('glossary.actions.defining_term', { term: word }), "info");
      try {
          let prompt = '';
          if (selectedLanguages.length > 0) {
              prompt = `
                Analyze the input term "${word}".
                1. Detect the language. If it is NOT English, translate it to English. Use this English version as the main "term".
                2. Provide a simple English definition for the term for a ${gradeLevel} student.
                3. Categorize as "Academic" (General Tier 2) or "Domain-Specific" (Topic Tier 3).
                4. Provide translations into: ${selectedLanguages.join(', ')}.
                ${useEmojis ? 'Include a relevant emoji.' : 'Do not use emojis.'}
                CRITICAL FOR TRANSLATIONS: Provide both the translated TERM and the translated DEFINITION.
                Format: "Translated Term: Translated Definition",
                Return ONLY a JSON object (not array): { "term": "English Term", "def": "English Definition", "tier": "Academic" | "Domain-Specific", "translations": { "Lang": "TranslatedTerm: TranslatedDefinition" } }
              `;
          } else {
              prompt = `
                Analyze the input term "${word}".
                1. Detect the language. If it is NOT English, translate it to English. Use this English version as the main "term".
                2. Provide a simple English definition for the term for a ${gradeLevel} student.
                3. Categorize as "Academic" (General Tier 2) or "Domain-Specific" (Topic Tier 3).
                ${useEmojis ? 'Include a relevant emoji.' : 'Do not use emojis.'}
                Return ONLY a JSON object (not array): { "term": "English Term", "def": "English Definition", "tier": "Academic" | "Domain-Specific" }
              `;
          }
          const result = await callGemini(prompt, true);
          const newTermItem = JSON.parse(cleanJson(result));
          try {
              addToast(t('glossary.actions.generating_icon_term', { term: word }), "info");
              const imgPrompt = `Icon style illustration of "${newTermItem.term}" (Context: ${newTermItem.def}). Simple, clear, flat vector art style, white background. STRICTLY NO TEXT, NO LABELS, NO LETTERS. Visual only. Educational icon.`;
              let imageUrl = await callImagen(imgPrompt);
              if (autoRemoveWords) {
                  try {
                      addToast(t('visuals.actions.auto_remove_toast'), "info");
                      const rawBase64 = imageUrl.split(',')[1];
                      const editPrompt = "Remove all text, labels, letters, and words from the image. Keep the illustration clean.";
                      imageUrl = await callGeminiImageEdit(editPrompt, rawBase64);
                  } catch (editErr) {
                      warnLog("Auto-remove text failed for quick add term:", newTermItem.term, editErr);
                  }
              }
              newTermItem.image = imageUrl;
          } catch (imgErr) {
              warnLog("Auto-image generation failed for quick add term:", newTermItem.term, imgErr);
              addToast(t('visuals.actions.auto_remove_fail'), "warning");
          }
          setHistory(prevHistory => {
              const newHistory = [...prevHistory];
              let glossaryIndex = -1;
              for (let i = newHistory.length - 1; i >= 0; i--) {
                  if (newHistory[i].type === 'glossary') {
                      glossaryIndex = i;
                      break;
                  }
              }
              if (glossaryIndex !== -1) {
                  const existingItem = newHistory[glossaryIndex];
                  const updatedData = [...existingItem.data, newTermItem];
                  const updatedItem = { ...existingItem, data: updatedData };
                  newHistory[glossaryIndex] = updatedItem;
                  if (generatedContent && generatedContent.id === existingItem.id) {
                      setGeneratedContent(updatedItem);
                  }
              } else {
                  const newItem = {
                      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                      type: 'glossary',
                      data: [newTermItem],
                      meta: `1 Term (Quick Add)`,
                      title: 'Glossary',
                      timestamp: new Date()
                  };
                  newHistory.push(newItem);
              }
              return newHistory;
          });
          addToast(t('glossary.actions.added_term', { term: word }), "success");
      } catch (err) {
          warnLog("Unhandled error:", err);
          addToast(t('glossary.actions.add_failed'), "error");
      } finally {
          setIsAddingTerm(false);
      }
};

const handleAddGlossaryTerm = async (deps) => {
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, standardsInput, targetStandards, dokLevel, isLineFocusMode, clozeInstanceSet, glossaryDefinitionLevel, glossaryImageStyle, newGlossaryTerm, isAutoFillMode, isShowMeMode, autoRemoveWords, creativeMode, enableEmojiInline, useEmojis, isAnalyzingPos, focusMode, latestGlossary, toFocusText, alloBotRef, setGeneratedContent, setHistory, setError, setIsProcessing, setGenerationStep, setNewGlossaryTerm, setClozeInstanceSet, setGlossaryHealthIssues, setIsCheckingGlossaryHealth, setMasteryResult, setIsGradingMastery, setIsCheckingLevel, setLevelCheckResult, setIsGeneratingPOS, setIsAnalyzingPos, setIsAddingTerm, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, highlightGlossaryTerms, repairGeneratedText, getReadableContent, extractSourceTextForProcessing, calculateReadability, countWords, playSound, handleScoreUpdate, getDefaultTitle, parseTaggedContent, chunkText, _stripForImmersive, validateDraftQuality, RELEVANCE_GATE_PROMPT, ClozeInput, MathSymbol } = deps;
  try { if (window._DEBUG_PHASE_N) console.log("[PhaseN] handleAddGlossaryTerm fired"); } catch(_) {}
      if (!newGlossaryTerm.trim()) return;
      if (!generatedContent || generatedContent.type !== 'glossary') return;
      setIsAddingTerm(true);
      try {
          let prompt = '';
          if (selectedLanguages.length > 0) {
              prompt = `
                Analyze the input term "${newGlossaryTerm}".
                1. Detect the language. If it is NOT English, translate it to English. Use this English version as the main "term".
                2. Provide a simple English definition for the term for a ${gradeLevel} student.
                3. Categorize as "Academic" (General Tier 2) or "Domain-Specific" (Topic Tier 3).
                4. Provide translations into: ${selectedLanguages.join(', ')}.
                ${useEmojis ? 'Include a relevant emoji.' : 'Do not use emojis.'}
                CRITICAL FOR TRANSLATIONS: Provide both the translated TERM and the translated DEFINITION.
                Format: "Translated Term: Translated Definition",
                Return ONLY a JSON object (not array): { "term": "English Term", "def": "English Definition", "tier": "Academic" | "Domain-Specific", "translations": { "Lang": "TranslatedTerm: TranslatedDefinition" } }
              `;
          } else {
              prompt = `
                Analyze the input term "${newGlossaryTerm}".
                1. Detect the language. If it is NOT English, translate it to English. Use this English version as the main "term".
                2. Provide a simple English definition for the term for a ${gradeLevel} student.
                3. Categorize as "Academic" (General Tier 2) or "Domain-Specific" (Topic Tier 3).
                ${useEmojis ? 'Include a relevant emoji.' : 'Do not use emojis.'}
                Return ONLY a JSON object (not array): { "term": "English Term", "def": "English Definition", "tier": "Academic" | "Domain-Specific" }
              `;
          }
          const result = await callGemini(prompt, true);
          const newTermItem = JSON.parse(cleanJson(result));
          try {
              addToast(t('glossary.actions.generating_icon_new'), "info");
              const styleInstruction = glossaryImageStyle.trim() ? `Style: ${glossaryImageStyle}.` : 'Simple, clear, flat vector art style.';
              const imgPrompt = `Icon style illustration of "${newTermItem.term}" (Context: ${newTermItem.def}). ${styleInstruction} White background. STRICTLY NO TEXT, NO LABELS, NO LETTERS. Visual only. Educational icon.`;
              let imageUrl = await callImagen(imgPrompt);
              if (autoRemoveWords) {
                  try {
                      addToast(t('visuals.actions.auto_remove_toast'), "info");
                      const rawBase64 = imageUrl.split(',')[1];
                      const editPrompt = "Remove all text, labels, letters, and words from the image. Keep the illustration clean.";
                      imageUrl = await callGeminiImageEdit(editPrompt, rawBase64);
                  } catch (editErr) {
                      warnLog("Auto-remove text failed for new term:", newTermItem.term, editErr);
                  }
              }
              newTermItem.image = imageUrl;
          } catch (imgErr) {
              warnLog("Auto-image generation failed for new term:", newTermItem.term, imgErr);
              addToast(t('visuals.actions.auto_remove_fail'), "warning");
          }
          const newData = [...generatedContent?.data, newTermItem];
          const updatedContent = { ...generatedContent, data: newData };
          setGeneratedContent(updatedContent);
          setHistory(prev => prev.map(item => item.id === generatedContent.id ? updatedContent : item));
          setNewGlossaryTerm('');
          addToast(t('glossary.actions.added_term', { term: newTermItem.term }), "success");
      } catch (err) {
          warnLog("Unhandled error:", err);
          addToast(t('glossary.actions.add_failed'), "error");
      } finally {
          setIsAddingTerm(false);
      }
};

const handleGeneratePOSData = async (deps) => {
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, standardsInput, targetStandards, dokLevel, isLineFocusMode, clozeInstanceSet, glossaryDefinitionLevel, glossaryImageStyle, newGlossaryTerm, isAutoFillMode, isShowMeMode, autoRemoveWords, creativeMode, enableEmojiInline, useEmojis, isAnalyzingPos, focusMode, latestGlossary, toFocusText, alloBotRef, setGeneratedContent, setHistory, setError, setIsProcessing, setGenerationStep, setNewGlossaryTerm, setClozeInstanceSet, setGlossaryHealthIssues, setIsCheckingGlossaryHealth, setMasteryResult, setIsGradingMastery, setIsCheckingLevel, setLevelCheckResult, setIsGeneratingPOS, setIsAnalyzingPos, setIsAddingTerm, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, highlightGlossaryTerms, repairGeneratedText, getReadableContent, extractSourceTextForProcessing, calculateReadability, countWords, playSound, handleScoreUpdate, getDefaultTitle, parseTaggedContent, chunkText, _stripForImmersive, validateDraftQuality, RELEVANCE_GATE_PROMPT, ClozeInput, MathSymbol } = deps;
  try { if (window._DEBUG_PHASE_N) console.log("[PhaseN] handleGeneratePOSData fired"); } catch(_) {}
    if (!generatedContent || generatedContent.type !== 'simplified') return;
    if (generatedContent.posEnriched) return;
    if (isAnalyzingPos) return;
    setIsAnalyzingPos(true);
    try {
        const textToAnalyze = _stripForImmersive(generatedContent?.data);
        if (!textToAnalyze.trim()) {
            setIsAnalyzingPos(false);
            return;
        }
        const chunks = chunkText(textToAnalyze, 1500).filter(c => c && c.trim().length > 0);
        if (chunks.length === 0) {
            setIsAnalyzingPos(false);
            return;
        }
        const taggedChunks = [];
        let failedChunks = 0;
        for (const chunk of chunks) {
             const prompt = `
                Analyze the grammatical parts of speech in the following text.
                Task: Reconstruct the text exactly as is, but:
                1. Wrap words with POS tags:
                   - Nouns: <n>word</n>
                   - Verbs: <v>word</v>
                   - Adjectives: <a>word</a>
                   - Adverbs: <d>word</d>
                2. Add syllable markers (·) to ALL multi-syllable words:
                   - Example: "beautiful" → "beau·ti·ful"
                   - Example: "running" → "run·ning"
                   - Single-syllable words stay unchanged: "cat" → "cat"
                   - Apply to tagged words too: <n>beau·ti·ful</n>
                Rules:
                - Keep all punctuation, spacing, and newlines EXACTLY the same.
                - Do not change any words except to add syllable markers.
                - Only tag the main nouns, verbs, adjectives, and adverbs (content words).
                - Add syllable markers to ALL words with more than one syllable.
                Text:
                "${chunk}"
            `;
            try {
                const tagged = await callGemini(prompt);
                if (tagged && typeof tagged === 'string' && tagged.trim().length > 0) {
                    taggedChunks.push(tagged);
                } else {
                    warnLog('handleGeneratePOSData: Gemini returned empty for chunk; using raw fallback.');
                    taggedChunks.push(chunk);
                    failedChunks++;
                }
            } catch (chunkErr) {
                warnLog('handleGeneratePOSData: chunk failed — using raw fallback. ', chunkErr && chunkErr.message);
                taggedChunks.push(chunk);
                failedChunks++;
            }
        }
        if (failedChunks === chunks.length) {
            warnLog('handleGeneratePOSData: every chunk failed — POS toggles will have no visible effect.');
            addToast(t('process.grammar_failed') || 'Could not classify parts of speech right now. Reader still works for reading and audio.', 'info');
            return;
        }
        const fullTaggedText = taggedChunks.join('');
        const parsedData = parseTaggedContent(fullTaggedText);
        const updatedContent = { ...generatedContent, immersiveData: parsedData, posEnriched: true };
        setGeneratedContent(updatedContent);
        setHistory(prev => prev.map(item => item.id === generatedContent.id ? updatedContent : item));
        if (failedChunks > 0) {
            addToast('Parts of speech tagged — ' + failedChunks + ' of ' + chunks.length + ' sections had to use raw text.', 'info');
        } else {
            addToast(t('process.grammar_complete') || 'Parts of speech ready.', 'success');
        }
    } catch (e) {
        warnLog('handleGeneratePOSData unhandled:', e);
        addToast(t('process.grammar_failed') || 'Could not classify parts of speech.', 'info');
    } finally {
        setIsAnalyzingPos(false);
    }
};

const handleMasteryGrading = async (text, rubric, topic, draftCount = 1, deps) => {
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, standardsInput, targetStandards, dokLevel, isLineFocusMode, clozeInstanceSet, glossaryDefinitionLevel, glossaryImageStyle, newGlossaryTerm, isAutoFillMode, isShowMeMode, autoRemoveWords, creativeMode, enableEmojiInline, useEmojis, isAnalyzingPos, focusMode, latestGlossary, toFocusText, alloBotRef, setGeneratedContent, setHistory, setError, setIsProcessing, setGenerationStep, setNewGlossaryTerm, setClozeInstanceSet, setGlossaryHealthIssues, setIsCheckingGlossaryHealth, setMasteryResult, setIsGradingMastery, setIsCheckingLevel, setLevelCheckResult, setIsGeneratingPOS, setIsAnalyzingPos, setIsAddingTerm, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, highlightGlossaryTerms, repairGeneratedText, getReadableContent, extractSourceTextForProcessing, calculateReadability, countWords, playSound, handleScoreUpdate, getDefaultTitle, parseTaggedContent, chunkText, _stripForImmersive, validateDraftQuality, RELEVANCE_GATE_PROMPT, ClozeInput, MathSymbol } = deps;
  try { if (window._DEBUG_PHASE_N) console.log("[PhaseN] handleMasteryGrading fired"); } catch(_) {}
      const qualityCheck = validateDraftQuality(text);
      if (!qualityCheck.isValid) {
          throw new Error(qualityCheck.error);
      }
      const gatePrompt = `
        ${RELEVANCE_GATE_PROMPT}
        ASSIGNMENT TOPIC: "${topic}"
        STUDENT SUBMISSION:
        "${text.substring(0, 2000)}"
      `;
      const gateResultRaw = await callGemini(gatePrompt, true);
      let gateResult;
      try {
          gateResult = JSON.parse(cleanJson(gateResultRaw));
      } catch (e) {
          warnLog("Gate parsing failed, proceeding to grading.", e);
          gateResult = { isRelevant: true };
      }
      if (gateResult.isRelevant === false) {
           throw new Error(gateResult.reason || t('process.gate_failure'));
      }
      const gradingPrompt = `
        You are an expert teacher grading a student submission (Attempt #${draftCount}).
        Topic: "${topic}",
        Rubric / Criteria:
        """
        ${rubric}
        """,
        Student Submission:
        """
        ${text}
        """,
        Task:
        1. Evaluate the submission strictly against the Rubric criteria.
        2. Assign a Raw Score (0-100) based on the overall quality.
        3. Provide a breakdown for each criterion.
        4. Provide specific feedback explaining the score.
        Return ONLY JSON:
        {
          "rawScore": number,
          "breakdown": [
            { "criterion": "string", "score": number, "max": number, "reason": "string" }
          ],
          "feedback": {
            "strength": "What they did well",
            "improvement": "Specific advice to reach mastery"
          }
        }
      `;
      const gradingRaw = await callGemini(gradingPrompt, true);
      let gradingData;
      try {
          gradingData = JSON.parse(cleanJson(gradingRaw));
      } catch (e) {
          throw new Error(t('process.grading_error'));
      }
      const aiScore = gradingData.rawScore || 0;
      let finalScore = aiScore;
      let status = 'revision';
      if (aiScore > 85) {
          status = 'mastery';
          finalScore = 100;
      } else {
          status = 'revision';
          finalScore = Math.max(40, aiScore);
      }
      return {
          status: status,
          score: finalScore,
          rawScore: aiScore,
          gradingDetails: gradingData,
          draftCount: draftCount
      };
};

const formatInteractiveText = (text, isCloze = false, isDarkBg = false, deps) => {
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, standardsInput, targetStandards, dokLevel, isLineFocusMode, clozeInstanceSet, glossaryDefinitionLevel, glossaryImageStyle, newGlossaryTerm, isAutoFillMode, isShowMeMode, autoRemoveWords, creativeMode, enableEmojiInline, useEmojis, isAnalyzingPos, focusMode, latestGlossary, toFocusText, alloBotRef, setGeneratedContent, setHistory, setError, setIsProcessing, setGenerationStep, setNewGlossaryTerm, setClozeInstanceSet, setGlossaryHealthIssues, setIsCheckingGlossaryHealth, setMasteryResult, setIsGradingMastery, setIsCheckingLevel, setLevelCheckResult, setIsGeneratingPOS, setIsAnalyzingPos, setIsAddingTerm, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, highlightGlossaryTerms, repairGeneratedText, getReadableContent, extractSourceTextForProcessing, calculateReadability, countWords, playSound, handleScoreUpdate, getDefaultTitle, parseTaggedContent, chunkText, _stripForImmersive, validateDraftQuality, RELEVANCE_GATE_PROMPT, ClozeInput, MathSymbol } = deps;
  try { if (window._DEBUG_PHASE_N) console.log("[PhaseN] formatInteractiveText fired"); } catch(_) {}
      if (!text) return null;
      const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$|\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g);
      return parts.filter(p => p != null).map((part, i) => {
          if ((part.startsWith('$') && part.endsWith('$')) || (part.startsWith('$$') && part.endsWith('$$'))) {
               return <React.Fragment key={i}><MathSymbol text={part} /></React.Fragment>;
          }
          if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
              const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
              if (match) {
                  const isCitation = match[1].startsWith('⁽') && match[1].endsWith('⁾');
                  return (
                      <a
                        key={i}
                        href={match[2]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-blue-600 ${isCitation ? 'no-underline' : 'underline'} hover:text-blue-800 z-20 relative font-medium cursor-pointer`}
                        onClick={(e) => e.stopPropagation()}
                        title={match[2]}
                      >
                          {match[1]}
                      </a>
                  );
              }
          }
          const isBold = part.startsWith('**') && part.endsWith('**');
          const isItalic = part.startsWith('*') && part.endsWith('*');
          let content = part;
          if (isBold) content = part.slice(2, -2);
          if (isItalic) content = part.slice(1, -1);
          const subParts = content.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$|\[.*?\]\(.*?\))/g);
          const renderedSubParts = subParts.filter(sp => sp != null).map((subPart, sIdx) => {
               if ((subPart.startsWith('$') && subPart.endsWith('$')) || (subPart.startsWith('$$') && subPart.endsWith('$$'))) {
                   return <React.Fragment key={sIdx}><MathSymbol text={subPart} /></React.Fragment>;
               }
               if (subPart.startsWith('[') && subPart.includes('](') && subPart.endsWith(')')) {
                  const match = subPart.match(/^\[(.*?)\]\((.*?)\)$/);
                  if (match) {
                      const isCitation = match[1].startsWith('⁽') && match[1].endsWith('⁾');
                      return (
                          <a
                            key={sIdx}
                            href={match[2]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-blue-600 ${isCitation ? 'no-underline' : 'underline'} hover:text-blue-800 z-20 relative font-medium cursor-pointer`}
                            role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
                          >
                              {match[1]}
                          </a>
                      );
                  }
               }
               const glossed = highlightGlossaryTerms(subPart, latestGlossary, isCloze, isDarkBg);
               let finalContent = glossed;
               if (focusMode && !isCloze) {
                   if (Array.isArray(glossed)) {
                       finalContent = glossed.map((g, gIdx) => {
                           if (typeof g === 'string') return <React.Fragment key={gIdx}>{toFocusText(g)}</React.Fragment>;
                           return <React.Fragment key={gIdx}>{g}</React.Fragment>;
                       });
                   } else if (typeof glossed === 'string') {
                       finalContent = toFocusText(glossed);
                   }
               }
               return <React.Fragment key={sIdx}>{finalContent}</React.Fragment>;
          });
          if (isBold) {
              return <strong key={i} className={`font-bold ${isDarkBg ? 'text-white' : 'text-indigo-900'}`}>{renderedSubParts}</strong>;
          }
          if (isItalic) {
              return <em key={i} className={`italic ${isDarkBg ? 'text-indigo-200' : 'text-indigo-800'}`}>{renderedSubParts}</em>;
          }
          return <React.Fragment key={i}>{renderedSubParts}</React.Fragment>;
      });
};

const handleCheckLevel = async (deps) => {
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, standardsInput, targetStandards, dokLevel, isLineFocusMode, clozeInstanceSet, glossaryDefinitionLevel, glossaryImageStyle, newGlossaryTerm, isAutoFillMode, isShowMeMode, autoRemoveWords, creativeMode, enableEmojiInline, useEmojis, isAnalyzingPos, focusMode, latestGlossary, toFocusText, alloBotRef, setGeneratedContent, setHistory, setError, setIsProcessing, setGenerationStep, setNewGlossaryTerm, setClozeInstanceSet, setGlossaryHealthIssues, setIsCheckingGlossaryHealth, setMasteryResult, setIsGradingMastery, setIsCheckingLevel, setLevelCheckResult, setIsGeneratingPOS, setIsAnalyzingPos, setIsAddingTerm, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, highlightGlossaryTerms, repairGeneratedText, getReadableContent, extractSourceTextForProcessing, calculateReadability, countWords, playSound, handleScoreUpdate, getDefaultTitle, parseTaggedContent, chunkText, _stripForImmersive, validateDraftQuality, RELEVANCE_GATE_PROMPT, ClozeInput, MathSymbol } = deps;
  try { if (window._DEBUG_PHASE_N) console.log("[PhaseN] handleCheckLevel fired"); } catch(_) {}
    if (!generatedContent || generatedContent.type !== 'simplified') return;
    setIsCheckingLevel(true);
    try {
        const textToCheck = typeof generatedContent?.data === 'string' ? generatedContent?.data : '';
        if (!textToCheck) return;
        const prompt1 = `
            You are a literacy expert. Analyze the text below to determine its text complexity.
            Target Level: ${gradeLevel}
            Task:
            1. Estimate the actual Grade Level equivalent (e.g., "3rd Grade", "5th-6th Grade").
            2. Assess alignment with the target level.
            3. Provide specific feedback on sentence structure and vocabulary load.
            Return ONLY JSON:
            {
                "estimatedLevel": "e.g. 4th Grade",
                "alignment": "Aligned" or "Too Complex" or "Too Simple",
                "feedback": "Brief explanation...",
            }
            Text: "${textToCheck.substring(0, 3000)}"
        `;
        const result1 = await callGemini(prompt1, true);
        const analysis1 = JSON.parse(cleanJson(result1));
        const prompt2 = `
            You are a senior curriculum verifier. Review the following text and the initial complexity analysis.
            Text: "${textToCheck.substring(0, 3000)}"
            Initial Estimate: ${analysis1.estimatedLevel}
            Target Level: ${gradeLevel}
            Task:
            1. VERIFY the Grade Level estimate. Is it accurate?
            2. Generate a COMPLEXITY RUBRIC to show nuances.
            Rubric Scales (-5 to +5):
            -5 = Much too simple for target
            0  = Perfect alignment
            +5 = Much too complex for target
            Return ONLY JSON:
            {
                "confirmedLevel": "Verified Grade Level",
                "rubric": {
                    "vocabulary": { "score": number, "reason": "string" },
                    "sentenceStructure": { "score": number, "reason": "string" },
                    "conceptDensity": { "score": number, "reason": "string" }
                },
                "nuanceSummary": "A sentence explaining the degree of complexity."
            }
        `;
        const result2 = await callGemini(prompt2, true);
        const analysis2 = JSON.parse(cleanJson(result2));
        const finalAnalysis = {
            ...analysis1,
            ...analysis2,
            localStats: calculateReadability(textToCheck)
        };
        const updatedContent = { ...generatedContent, levelCheck: finalAnalysis };
        setGeneratedContent(updatedContent);
        setHistory(prev => prev.map(item => item.id === generatedContent.id ? updatedContent : item));
        addToast(t('toasts.level_analysis_complete'), "success");
        if (alloBotRef.current) {
             alloBotRef.current.speak("I've verified the text complexity using a dual-check process. Review the rubric to see exactly how it aligns!", 'happy');
        }
    } catch (e) {
        warnLog("Unhandled error:", e);
        setError(t('errors.reading_level_check_failed'));
        addToast(t('toasts.level_check_failed'), "error");
    } finally {
        setIsCheckingLevel(false);
    }
};

window.AlloModules = window.AlloModules || {};
window.AlloModules.PhaseNHelpers = {
  handleQuickAddGlossary,
  handleAddGlossaryTerm,
  handleGeneratePOSData,
  handleMasteryGrading,
  formatInteractiveText,
  handleCheckLevel,
};
