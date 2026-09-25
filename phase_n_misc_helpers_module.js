(function() {
'use strict';
if (window.AlloModules && window.AlloModules.PhaseNHelpersModule) { console.log('[CDN] PhaseNHelpersModule already loaded, skipping'); return; }
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useMemo = React.useMemo;
var useCallback = React.useCallback;
var Fragment = React.Fragment;
const addGlossaryTerm = async (rawWord, deps, quick = false) => {
  const {
    generatedContent,
    history,
    gradeLevel,
    selectedLanguages,
    useEmojis,
    callGemini,
    cleanJson,
    callImagen,
    callGeminiImageEdit,
    autoRemoveWords,
    glossaryImageStyle,
    universalImageStyle,
    setHistory,
    setIsAddingTerm,
    setNewGlossaryTerm,
    addToast,
    t,
    warnLog
  } = deps;
  const word = String(rawWord || "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!word || !quick && generatedContent?.type !== "glossary") return false;
  const origin = generatedContent?.type === "glossary" ? generatedContent : [...history || []].reverse().find((resource) => resource?.type === "glossary");
  const begin = window.AlloModules?.GlossaryHelpers?.beginGlossaryTask;
  if (origin && !begin) throw new Error("Glossary helpers are not loaded. Reload and retry.");
  const task = origin ? begin(deps, null, [], "add:" + word.toLocaleLowerCase(), origin) : null;
  const invocationId = generatedContent?.id;
  const visible = () => typeof deps.getGlossaryLive !== "function" || deps.getGlossaryLive().resource?.id === invocationId;
  const current = () => !task || task.isCurrent();
  setIsAddingTerm(true);
  try {
    const languages = Array.isArray(selectedLanguages) ? selectedLanguages : [];
    const prompt = [
      "Analyze the input term " + JSON.stringify(word) + ".",
      '1. Detect the language. If it is NOT English, translate it to English. Use this English version as the main "term".',
      "2. Provide a simple English definition for a " + gradeLevel + " student.",
      '3. Categorize as "Academic" (General Tier 2) or "Domain-Specific" (Topic Tier 3).',
      languages.length ? "4. Provide translations into: " + languages.join(", ") + '. Include both the translated TERM and DEFINITION as "Translated Term: Translated Definition".' : "",
      useEmojis ? "Include a relevant emoji in a separate emoji field, never in the term." : "Do not use emojis.",
      'Return ONLY a JSON object: { "term": "English Term", "def": "English Definition", "tier": "Academic" | "Domain-Specific"' + (languages.length ? ', "translations": { "Lang": "TranslatedTerm: TranslatedDefinition" }' : "") + " }"
    ].join("\n");
    const result = await callGemini(prompt, true, false, null, null, task?.signal);
    if (!current()) return false;
    const newTermItem = JSON.parse(cleanJson(result));
    if (!newTermItem || typeof newTermItem.term !== "string" || !newTermItem.term.trim() || typeof newTermItem.def !== "string" || !newTermItem.def.trim()) throw new Error("The glossary term or definition was empty.");
    if (window.AlloModules.createGlossaryEntryId) newTermItem.entryId = window.AlloModules.createGlossaryEntryId();
    try {
      if (visible()) addToast(t("glossary.actions.generating_icon_new"), "info");
      const style = String(glossaryImageStyle || "").trim() || String(universalImageStyle || "").trim();
      const prompt2 = "Icon style illustration of " + JSON.stringify(newTermItem.term) + " (Context: " + newTermItem.def + "). " + (style ? "Style: " + style + "." : "Simple, clear, flat vector art style.") + " White background. STRICTLY NO TEXT, NO LABELS, NO LETTERS. Visual only. Educational icon.";
      let image = await callImagen(prompt2, void 0, void 0, { signal: task?.signal });
      if (!current()) return false;
      if (autoRemoveWords && image) {
        try {
          image = await callGeminiImageEdit("Remove all text, labels, letters, and words from the image. Keep the illustration clean.", image.split(",")[1], void 0, void 0, null, { signal: task?.signal });
        } catch (error) {
          if (!current()) return false;
          warnLog("Auto-remove text failed for new term:", error);
        }
      }
      if (image) newTermItem.image = image;
    } catch (error) {
      if (!current()) return false;
      warnLog("Auto-image generation failed for new term:", error);
    }
    if (!current()) return false;
    if (task) {
      if (!task.commit((resource) => ({ ...resource, data: [...resource.data, newTermItem] }))) return false;
    } else {
      setHistory((previous) => [...previous, {
        id: "glossary-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2),
        type: "glossary",
        data: [newTermItem],
        meta: "1 Term (Quick Add)",
        title: "Glossary",
        timestamp: /* @__PURE__ */ new Date()
      }]);
    }
    if (visible()) {
      if (!quick) setNewGlossaryTerm((previous) => previous === rawWord ? "" : previous);
      addToast(t("glossary.actions.added_term", { term: newTermItem.term }), "success");
    }
    return true;
  } catch (error) {
    if (current() && visible()) {
      warnLog("Glossary add failed:", error);
      addToast(t("glossary.actions.add_failed"), "error");
    }
    return false;
  } finally {
    task?.finish();
    const pendingAdd = deps.glossaryTaskRegistry && [...deps.glossaryTaskRegistry.values()].some((token) => !token.finished && !token.controller.signal.aborted && token.invocationId === invocationId && token.channel.startsWith("add:"));
    if (visible() && (!task || task.isOwner()) && !pendingAdd) setIsAddingTerm(false);
  }
};
const handleQuickAddGlossary = async (rawWord, skipTip = false, deps) => addGlossaryTerm(rawWord, deps, true);
const handleAddGlossaryTerm = async (deps) => addGlossaryTerm(deps.newGlossaryTerm, deps);
const handleGeneratePOSData = async (deps) => {
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, standardsInput, targetStandards, dokLevel, isLineFocusMode, clozeInstanceSet, glossaryDefinitionLevel, glossaryImageStyle, newGlossaryTerm, isAutoFillMode, isShowMeMode, autoRemoveWords, creativeMode, enableEmojiInline, useEmojis, isAnalyzingPos, focusMode, latestGlossary, toFocusText, alloBotRef, setGeneratedContent, setHistory, setError, setIsProcessing, setGenerationStep, setNewGlossaryTerm, setClozeInstanceSet, setGlossaryHealthIssues, setIsCheckingGlossaryHealth, setMasteryResult, setIsGradingMastery, setIsCheckingLevel, setLevelCheckResult, setIsGeneratingPOS, setIsAnalyzingPos, setIsAddingTerm, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, highlightGlossaryTerms, repairGeneratedText, getReadableContent, extractSourceTextForProcessing, calculateReadability, countWords, playSound, handleScoreUpdate, getDefaultTitle, parseTaggedContent, chunkText, _stripForImmersive, validateDraftQuality, RELEVANCE_GATE_PROMPT, ClozeInput, MathSymbol } = deps;
  try {
    if (window._DEBUG_PHASE_N) console.log("[PhaseN] handleGeneratePOSData fired");
  } catch (_) {
  }
  if (!generatedContent || generatedContent.type !== "simplified") return;
  if (generatedContent.posEnriched) return;
  if (isAnalyzingPos) return;
  setIsAnalyzingPos(true);
  try {
    const textToAnalyze = _stripForImmersive(generatedContent?.data);
    if (!textToAnalyze.trim()) {
      setIsAnalyzingPos(false);
      return;
    }
    const chunks = chunkText(textToAnalyze, 1500).filter((c) => c && c.trim().length > 0);
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
                2. Add syllable markers (\xB7) to ALL multi-syllable words:
                   - Example: "beautiful" \u2192 "beau\xB7ti\xB7ful"
                   - Example: "running" \u2192 "run\xB7ning"
                   - Single-syllable words stay unchanged: "cat" \u2192 "cat"
                   - Apply to tagged words too: <n>beau\xB7ti\xB7ful</n>
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
        if (tagged && typeof tagged === "string" && tagged.trim().length > 0) {
          taggedChunks.push(tagged);
        } else {
          warnLog("handleGeneratePOSData: Gemini returned empty for chunk; using raw fallback.");
          taggedChunks.push(chunk);
          failedChunks++;
        }
      } catch (chunkErr) {
        warnLog("handleGeneratePOSData: chunk failed \u2014 using raw fallback. ", chunkErr && chunkErr.message);
        taggedChunks.push(chunk);
        failedChunks++;
      }
    }
    if (failedChunks === chunks.length) {
      warnLog("handleGeneratePOSData: every chunk failed \u2014 POS toggles will have no visible effect.");
      addToast(t("process.grammar_failed") || "Could not classify parts of speech right now. Reader still works for reading and audio.", "info");
      return;
    }
    const fullTaggedText = taggedChunks.join("");
    const parsedData = parseTaggedContent(fullTaggedText);
    const updatedContent = { ...generatedContent, immersiveData: parsedData, immersiveSource: String(generatedContent.data || ""), posEnriched: true };
    setGeneratedContent(updatedContent);
    setHistory((prev) => prev.map((item) => item.id === generatedContent.id ? updatedContent : item));
    if (failedChunks > 0) {
      addToast("Parts of speech tagged \u2014 " + failedChunks + " of " + chunks.length + " sections had to use raw text.", "info");
    } else {
      addToast(t("process.grammar_complete") || "Parts of speech ready.", "success");
    }
  } catch (e) {
    warnLog("handleGeneratePOSData unhandled:", e);
    addToast(t("process.grammar_failed") || "Could not classify parts of speech.", "info");
  } finally {
    setIsAnalyzingPos(false);
  }
};
const handleMasteryGrading = async (text, rubric, topic, draftCount = 1, deps) => {
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, standardsInput, targetStandards, dokLevel, isLineFocusMode, clozeInstanceSet, glossaryDefinitionLevel, glossaryImageStyle, newGlossaryTerm, isAutoFillMode, isShowMeMode, autoRemoveWords, creativeMode, enableEmojiInline, useEmojis, isAnalyzingPos, focusMode, latestGlossary, toFocusText, alloBotRef, setGeneratedContent, setHistory, setError, setIsProcessing, setGenerationStep, setNewGlossaryTerm, setClozeInstanceSet, setGlossaryHealthIssues, setIsCheckingGlossaryHealth, setMasteryResult, setIsGradingMastery, setIsCheckingLevel, setLevelCheckResult, setIsGeneratingPOS, setIsAnalyzingPos, setIsAddingTerm, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, highlightGlossaryTerms, repairGeneratedText, getReadableContent, extractSourceTextForProcessing, calculateReadability, countWords, playSound, handleScoreUpdate, getDefaultTitle, parseTaggedContent, chunkText, _stripForImmersive, validateDraftQuality, RELEVANCE_GATE_PROMPT, ClozeInput, MathSymbol } = deps;
  try {
    if (window._DEBUG_PHASE_N) console.log("[PhaseN] handleMasteryGrading fired");
  } catch (_) {
  }
  const qualityCheck = validateDraftQuality(text);
  if (!qualityCheck.isValid) {
    throw new Error(qualityCheck.error);
  }
  const gatePrompt = `
        ${RELEVANCE_GATE_PROMPT}
        ASSIGNMENT TOPIC: "${topic}"
        STUDENT SUBMISSION:
        "${text.substring(0, 2e3)}"
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
    throw new Error(gateResult.reason || t("process.gate_failure"));
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
    throw new Error(t("process.grading_error"));
  }
  const aiScore = gradingData.rawScore || 0;
  let finalScore = aiScore;
  let status = "revision";
  if (aiScore > 85) {
    status = "mastery";
    finalScore = 100;
  } else {
    status = "revision";
    finalScore = Math.max(40, aiScore);
  }
  return {
    status,
    score: finalScore,
    rawScore: aiScore,
    gradingDetails: gradingData,
    draftCount
  };
};
const _SUPERSCRIPT_DIGITS = [8304, 185, 178, 179, 8308, 8309, 8310, 8311, 8312, 8313].map((code) => String.fromCharCode(code));
const _citationNumber = (label) => {
  const value = String(label || "").trim();
  if (value.length < 3 || value.charCodeAt(0) !== 8317 || value.charCodeAt(value.length - 1) !== 8318) return null;
  const digits = value.slice(1, -1).split("").map((ch) => _SUPERSCRIPT_DIGITS.indexOf(ch));
  return digits.every((d) => d >= 0) ? digits.join("") : null;
};
const _linkLabel = (label, t) => {
  const tr = (key, fallback, params) => {
    const v = typeof t === "function" ? t(key, params) : void 0;
    return typeof v === "string" && v && v !== key ? v : fallback;
  };
  const number = _citationNumber(label);
  const name = number ? tr("common.source_number", "Source " + number, { number }) : String(label || "");
  return name + ", " + tr("common.opens_new_tab", "opens in a new tab");
};
const formatInteractiveText = (text, isCloze = false, isDarkBg = false, deps, instanceKey) => {
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, standardsInput, targetStandards, dokLevel, isLineFocusMode, clozeInstanceSet, glossaryDefinitionLevel, glossaryImageStyle, newGlossaryTerm, isAutoFillMode, isShowMeMode, autoRemoveWords, creativeMode, enableEmojiInline, useEmojis, isAnalyzingPos, focusMode, latestGlossary, toFocusText, alloBotRef, setGeneratedContent, setHistory, setError, setIsProcessing, setGenerationStep, setNewGlossaryTerm, setClozeInstanceSet, setGlossaryHealthIssues, setIsCheckingGlossaryHealth, setMasteryResult, setIsGradingMastery, setIsCheckingLevel, setLevelCheckResult, setIsGeneratingPOS, setIsAnalyzingPos, setIsAddingTerm, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, highlightGlossaryTerms, repairGeneratedText, getReadableContent, extractSourceTextForProcessing, calculateReadability, countWords, playSound, handleScoreUpdate, getDefaultTitle, parseTaggedContent, chunkText, _stripForImmersive, validateDraftQuality, RELEVANCE_GATE_PROMPT, ClozeInput, MathSymbol } = deps;
  try {
    if (window._DEBUG_PHASE_N) console.log("[PhaseN] formatInteractiveText fired");
  } catch (_) {
  }
  if (!text) return null;
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$(?=\S)[^$]*?\S\$(?!\d)|\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g);
  return parts.filter((p) => p != null).map((part, i) => {
    if (part.startsWith("$") && part.endsWith("$") || part.startsWith("$$") && part.endsWith("$$")) {
      return /* @__PURE__ */ React.createElement(React.Fragment, { key: i }, /* @__PURE__ */ React.createElement(MathSymbol, { text: part }));
    }
    if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
      const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (match) {
        return /* @__PURE__ */ React.createElement(
          "a",
          {
            key: i,
            href: match[2],
            "aria-label": _linkLabel(match[1], t),
            target: "_blank",
            rel: "noopener noreferrer",
            className: `${isDarkBg ? "text-sky-300 hover:text-sky-200 focus-visible:ring-sky-300 focus-visible:ring-offset-slate-900" : "text-blue-700 hover:text-blue-900 focus-visible:ring-blue-700 focus-visible:ring-offset-white"} z-20 relative font-medium underline decoration-2 underline-offset-2 cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`,
            onClick: (e) => e.stopPropagation(),
            title: match[2]
          },
          match[1]
        );
      }
    }
    const isBold = part.startsWith("**") && part.endsWith("**");
    const isItalic = part.startsWith("*") && part.endsWith("*");
    let content = part;
    if (isBold) content = part.slice(2, -2);
    else if (isItalic) content = part.slice(1, -1);
    const subParts = content.split(/(\$\$[\s\S]+?\$\$|\$(?=\S)[^$]*?\S\$(?!\d)|\[.*?\]\(.*?\))/g);
    const renderedSubParts = subParts.filter((sp) => sp != null).map((subPart, sIdx) => {
      if (subPart.startsWith("$") && subPart.endsWith("$") || subPart.startsWith("$$") && subPart.endsWith("$$")) {
        return /* @__PURE__ */ React.createElement(React.Fragment, { key: sIdx }, /* @__PURE__ */ React.createElement(MathSymbol, { text: subPart }));
      }
      if (subPart.startsWith("[") && subPart.includes("](") && subPart.endsWith(")")) {
        const match = subPart.match(/^\[(.*?)\]\((.*?)\)$/);
        if (match) {
          return /* @__PURE__ */ React.createElement(
            "a",
            {
              key: sIdx,
              href: match[2],
              "aria-label": _linkLabel(match[1], t),
              target: "_blank",
              rel: "noopener noreferrer",
              className: `${isDarkBg ? "text-sky-300 hover:text-sky-200 focus-visible:ring-sky-300 focus-visible:ring-offset-slate-900" : "text-blue-700 hover:text-blue-900 focus-visible:ring-blue-700 focus-visible:ring-offset-white"} z-20 relative font-medium underline decoration-2 underline-offset-2 cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`,
              onClick: (e) => e.stopPropagation(),
              title: match[2]
            },
            match[1]
          );
        }
      }
      const glossed = highlightGlossaryTerms(subPart, latestGlossary, isCloze, isDarkBg, instanceKey ? instanceKey + "." + i + "." + sIdx : void 0);
      let finalContent = glossed;
      if (focusMode && !isCloze) {
        if (Array.isArray(glossed)) {
          finalContent = glossed.map((g, gIdx) => {
            if (typeof g === "string") return /* @__PURE__ */ React.createElement(React.Fragment, { key: gIdx }, toFocusText(g));
            return /* @__PURE__ */ React.createElement(React.Fragment, { key: gIdx }, g);
          });
        } else if (typeof glossed === "string") {
          finalContent = toFocusText(glossed);
        }
      }
      return /* @__PURE__ */ React.createElement(React.Fragment, { key: sIdx }, finalContent);
    });
    if (isBold) {
      return /* @__PURE__ */ React.createElement("strong", { key: i, className: `font-bold ${isDarkBg ? "text-white" : "text-indigo-900"}` }, renderedSubParts);
    }
    if (isItalic) {
      return /* @__PURE__ */ React.createElement("em", { key: i, className: `italic ${isDarkBg ? "text-indigo-200" : "text-indigo-800"}` }, renderedSubParts);
    }
    return /* @__PURE__ */ React.createElement(React.Fragment, { key: i }, renderedSubParts);
  });
};
const handleCheckLevel = async (deps) => {
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, standardsInput, targetStandards, dokLevel, isLineFocusMode, clozeInstanceSet, glossaryDefinitionLevel, glossaryImageStyle, newGlossaryTerm, isAutoFillMode, isShowMeMode, autoRemoveWords, creativeMode, enableEmojiInline, useEmojis, isAnalyzingPos, focusMode, latestGlossary, toFocusText, alloBotRef, setGeneratedContent, setHistory, setError, setIsProcessing, setGenerationStep, setNewGlossaryTerm, setClozeInstanceSet, setGlossaryHealthIssues, setIsCheckingGlossaryHealth, setMasteryResult, setIsGradingMastery, setIsCheckingLevel, setLevelCheckResult, setIsGeneratingPOS, setIsAnalyzingPos, setIsAddingTerm, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, highlightGlossaryTerms, repairGeneratedText, getReadableContent, extractSourceTextForProcessing, calculateReadability, countWords, playSound, handleScoreUpdate, getDefaultTitle, parseTaggedContent, chunkText, _stripForImmersive, validateDraftQuality, RELEVANCE_GATE_PROMPT, ClozeInput, MathSymbol } = deps;
  try {
    if (window._DEBUG_PHASE_N) console.log("[PhaseN] handleCheckLevel fired");
  } catch (_) {
  }
  if (!generatedContent || generatedContent.type !== "simplified") return;
  setIsCheckingLevel(true);
  try {
    const textToCheck = typeof generatedContent?.data === "string" ? generatedContent?.data : "";
    if (!textToCheck) return;
    const contextModule = typeof window !== "undefined" && window.AlloModules ? window.AlloModules.InstructionalContext : null;
    const ambientStandards = standardsInput || targetStandards || null;
    const artifactContext = contextModule && typeof contextModule.resolveArtifactContext === "function" ? contextModule.resolveArtifactContext(generatedContent, {
      grade: gradeLevel,
      language: leveledTextLanguage,
      standards: ambientStandards
    }) : {
      grade: generatedContent?.instructionalText?.complexity?.requestedGrade || generatedContent?.targetGradeLevel || generatedContent?.config?.grade || gradeLevel,
      language: generatedContent?.instructionalText?.complexity?.language || generatedContent?.config?.language || leveledTextLanguage || "English",
      standards: generatedContent?.config?.standardsContext || generatedContent?.config?.standards || ambientStandards,
      instructionalText: generatedContent?.instructionalText || null
    };
    const targetGrade = artifactContext.grade || gradeLevel;
    const artifactLanguage = artifactContext.language || leveledTextLanguage || "English";
    const standardsValue = artifactContext.standards;
    const standardsForPrompt = (() => {
      if (!standardsValue) return "";
      if (typeof standardsValue === "string") return standardsValue.trim();
      if (typeof standardsValue.promptText === "string" && standardsValue.promptText.trim()) {
        return standardsValue.promptText.trim();
      }
      if (Array.isArray(standardsValue.standards)) {
        return standardsValue.standards.map((entry) => {
          if (typeof entry === "string") return entry;
          return [entry?.code || entry?.id, entry?.text || entry?.label].filter(Boolean).join(": ");
        }).filter(Boolean).join("; ");
      }
      if (Array.isArray(standardsValue)) {
        return standardsValue.map(
          (entry) => typeof entry === "string" ? entry : [entry?.code || entry?.id, entry?.text || entry?.label].filter(Boolean).join(": ")
        ).filter(Boolean).join("; ");
      }
      return "";
    })().slice(0, 2400);
    const standardsContextLine = standardsForPrompt ? `Instructional Standards Context: ${standardsForPrompt}
Use this only when considering qualitative knowledge and language demands; do not treat standards alignment as a readability formula.` : "";
    const prompt1 = `
            You are a literacy expert. Analyze the text below to determine its text complexity.
            Target Level: ${targetGrade}
            Text Language: ${artifactLanguage}
            ${standardsContextLine}
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
            Text: "${textToCheck.substring(0, 3e3)}"
        `;
    const result1 = await callGemini(prompt1, true);
    const analysis1 = JSON.parse(cleanJson(result1));
    const prompt2 = `
            You are a senior curriculum verifier. Review the following text and the initial complexity analysis.
            Text: "${textToCheck.substring(0, 3e3)}"
            Initial Estimate: ${analysis1.estimatedLevel}
            Target Level: ${targetGrade}
            Text Language: ${artifactLanguage}
            ${standardsContextLine}
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
    const bilingualText = /---\s*ENGLISH TRANSLATION\s*---/i.test(textToCheck) || /---\s*TRANSLATION\s*---/i.test(textToCheck);
    const supportsEnglishMeasurement = !bilingualText && (contextModule && typeof contextModule.isEnglishLanguage === "function" ? contextModule.isEnglishLanguage(artifactLanguage) : /^(?:english|en)$/i.test(String(artifactLanguage || "").trim()));
    const localStats = supportsEnglishMeasurement ? calculateReadability(textToCheck) : null;
    const fallbackFingerprint = (value) => {
      const input = String(value == null ? "" : value).replace(/\r\n?/g, "\n");
      let hash = 2166136261;
      for (let index = 0; index < input.length; index++) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return `txt-${(hash >>> 0).toString(16).padStart(8, "0")}-${input.length}`;
    };
    const contentFingerprint = contextModule && typeof contextModule.fingerprintText === "function" ? contextModule.fingerprintText(textToCheck) : fallbackFingerprint(textToCheck);
    const baseInstructionalText = contextModule && typeof contextModule.getInstructionalText === "function" ? contextModule.getInstructionalText(generatedContent, {
      complexity: { requestedGrade: targetGrade, language: artifactLanguage }
    }) : artifactContext.instructionalText || generatedContent.instructionalText || {
      role: "unspecified",
      form: "adapted",
      designationSource: "legacy-inferred",
      complexity: { requestedGrade: targetGrade, language: artifactLanguage }
    };
    let nextInstructionalText;
    if (localStats && contextModule && typeof contextModule.withComplexityEvidence === "function") {
      nextInstructionalText = contextModule.withComplexityEvidence(baseInstructionalText, {
        requestedGrade: targetGrade,
        measuredGrade: Number(localStats.score),
        method: "flesch-kincaid-en",
        language: artifactLanguage
      }, textToCheck);
    } else if (!localStats && contextModule && typeof contextModule.invalidateComplexityEvidence === "function") {
      nextInstructionalText = contextModule.invalidateComplexityEvidence(
        baseInstructionalText,
        textToCheck,
        supportsEnglishMeasurement ? "unavailable" : "not-applicable"
      );
    } else {
      nextInstructionalText = {
        ...baseInstructionalText,
        complexity: {
          ...baseInstructionalText?.complexity || {},
          requestedGrade: targetGrade,
          measuredGrade: localStats ? Number(localStats.score) : null,
          method: localStats ? "flesch-kincaid-en" : "",
          status: localStats ? "measured" : supportsEnglishMeasurement ? "unavailable" : "not-applicable",
          contentFingerprint,
          measuredAt: localStats ? (/* @__PURE__ */ new Date()).toISOString() : "",
          language: artifactLanguage
        }
      };
    }
    const finalAnalysis = {
      ...analysis1,
      ...analysis2,
      targetGradeLevel: targetGrade,
      language: artifactLanguage,
      standards: standardsForPrompt,
      contentFingerprint,
      measurementStatus: localStats ? "measured" : "not-evaluated",
      ...localStats ? { localStats } : {}
    };
    const updatedContent = {
      ...generatedContent,
      targetGradeLevel: targetGrade,
      instructionalText: nextInstructionalText,
      levelCheck: finalAnalysis,
      ...localStats ? { localStats } : {}
    };
    if (!localStats && updatedContent.localStats) delete updatedContent.localStats;
    setGeneratedContent(updatedContent);
    setHistory((prev) => prev.map((item) => item.id === generatedContent.id ? updatedContent : item));
    addToast(t("toasts.level_analysis_complete"), "success");
    if (alloBotRef.current) {
      alloBotRef.current.speak("I've verified the text complexity using a dual-check process. Review the rubric to see exactly how it aligns!", "happy");
    }
  } catch (e) {
    warnLog("Unhandled error:", e);
    setError(t("errors.reading_level_check_failed"));
    addToast(t("toasts.level_check_failed"), "error");
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
  handleCheckLevel
};
window.AlloModules.PhaseNHelpersModule = true;
console.log('[PhaseNHelpers] 6 helpers registered');
})();
