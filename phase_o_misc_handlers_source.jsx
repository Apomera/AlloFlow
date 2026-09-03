// phase_o_misc_handlers_source.jsx -- Phase O of CDN modularization.
// 6 misc handlers across class sessions, image refinement, standards
// lookup, wizard flow, blueprint execution.

// Shared alt-text upkeep for the image tool: after the pixels change, describe
// the NEW picture through window.AlloModules.AltText (batched, resource
// language). A description a person wrote is never overwritten; the image-hash
// mismatch marks it stale in the edit field instead.
const _redescribeImageContent = async (content, deps) => {
  const A = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.AltText;
  const data = content && content.data;
  if (!A || !data) return;
  const targets = [];
  const plan = data.visualPlan;
  if (plan && Array.isArray(plan.panels) && plan.panels.length > 1) {
    plan.panels.forEach((panel) => {
      if (!panel || !panel.imageUrl) return;
      const poster = Array.isArray(panel.frames) && panel.frames.length > 1 ? panel.frames[0] : panel.imageUrl;
      targets.push({ altSource: panel.altSource, dataUrl: poster, context: panel.caption || panel.imagenPrompt || panel.motionPrompt || data.prompt,
        apply: (r) => { panel.alt = r.decorative ? '' : r.alt; panel.altSource = r.source; panel.decorative = r.decorative === true; panel.altHash = A.hashImage(poster); } });
    });
  } else if (data.imageUrl) {
    targets.push({ altSource: data.altSource, dataUrl: data.imageUrl, context: data.prompt,
      apply: (r) => { data.altText = r.decorative ? '' : r.alt; data.altSource = r.source; data.decorative = r.decorative === true; data.altHash = A.hashImage(data.imageUrl); } });
  }
  const live = [];
  targets.forEach((target) => {
    if (target.altSource === 'author') return;
    live.push(target);
  });
  if (!live.length) return;
  try {
    const results = await A.draftAlts(live.map((target, index) => ({ id: index, dataUrl: target.dataUrl, context: target.context })), { language: deps && deps.language, callGeminiVision: deps && deps.callGeminiVision });
    results.forEach((r, index) => { if (r) live[index].apply(r); });
  } catch (error) {
    try { console.warn('[AltText] refresh after image edit skipped:', error && error.message ? error.message : error); } catch (_) {}
  }
  if (plan && Array.isArray(plan.panels) && plan.panels.length > 1 && plan.panels[0] && plan.panels[0].alt) {
    data.altText = plan.panels[0].alt;
    data.altSource = plan.panels[0].altSource;
    data.altHash = plan.panels[0].altHash;
  }
};

const startClassSession = async (deps) => {
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, standardsInput, targetStandards, dokLevel, rosterKey, sessionData, studentAiPolicyForShare, user, appId, activeSessionAppId, activeSessionCode, studentNickname, sourceLength, sourceTone, textFormat, differentiationRange, differentiationTypes, differentiationCustomGrades, fullPackTargetGroup, isAutoConfigEnabled, resourceCount, creativeMode, noText, fillInTheBlank, imageGenerationStyle, imageAspectRatio, useLowQualityVisuals, autoRemoveWords, globalPoints, wizardData, isWizardOpen, standardsLookupRegion, standardsLookupGoal, pdfFixResult, showExportPreview, aiStandardQuery, aiStandardRegion, imageRefinementInput, activeBlueprint, ai, webSearchProvider, alloBotRef, pdfPreviewRef, exportPreviewRef, setError, setIsProcessing, setGenerationStep, setGeneratedContent, setHistory, setActiveView, setActiveSessionCode, setActiveSessionAppId, setStudentNickname, setIsWizardOpen, setShowSourceGen, setSourceTopic, setSourceCustomInstructions, setSourceLength, setSourceTone, setTextFormat, setSelectedLanguages, setGradeLevel, setStandardsInput, setTargetStandards, setDokLevel, setStudentInterests, setSuggestedStandards, setIsLookingUpStandards, setStandardsLookupGoal, setStandardsLookupRegion, setExpandedTools, setShowUDLGuide, setUdlMessages, setGuidedFlowState, setIsRefiningImage, setShowImageRefineModal, setIsExecutingBlueprint, setBlueprintExecutionResult, setShowExportPreview, setInputText, setIsTeacherMode, setIsParentMode, setIsIndependentMode, setActiveSidebarTab, setDoc, setSessionData, setShowSessionModal, setImageRefinementInput, setIsFindingStandards, setShowWizard, setSourceLevel, setSourceVocabulary, setIncludeSourceCitations, setLeveledTextLanguage, setActiveBlueprint, setPersistedLessonDNA, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, flyToElement, getDefaultTitle, storageDB, updateDoc, doc, db, playSound, playAdventureEventSound, generateSessionCode, stripUndefined, uploadSessionAssets, safeSetItem, handleGenerateSource, applyDetailedAutoConfig, handleGenerate, fileInputRef } = deps;
  try { if (window._DEBUG_PHASE_O) console.log("[PhaseO] startClassSession fired"); } catch(_) {}
    if (history.length === 0) {
        addToast(t('session.error_no_resources'), "error");
        return false;
    }
    const code = generateSessionCode();
    const aiPolicy = {
        studentAi: studentAiPolicyForShare === 'student-byok' ? 'student-byok' : 'off'
    };
    const hostHeartbeatAt = Date.now();
    const hostPresence = {
        state: 'online',
        heartbeatAt: hostHeartbeatAt,
        expiresAt: hostHeartbeatAt + (90 * 1000),
        leaseId: null,
    };
    addToast(t('session.creating', { code }), "info");
    try {
        const resourcesToUpload = history.filter(h => h.id);
        const lightweightResources = await uploadSessionAssets(appId, resourcesToUpload, code);
        const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', code);
        const sessionPayload = {
            resources: lightweightResources,
            mode: 'sync',
            currentResourceId: null,
            createdAt: new Date().toISOString(),
            hostId: user?.uid,
            aiPolicy,
            hostPresence,
        };
        try {
            const payloadStr = JSON.stringify(sessionPayload);
            const payloadSizeKB = Math.round(payloadStr.length / 1024);
            console.log(`[SESSION DEBUG] Session payload size: ${payloadSizeKB}KB (${payloadStr.length} chars). Firestore limit is ~1MB.`);
            if (payloadSizeKB > 800) {
                console.warn(`[SESSION DEBUG] ⚠️ Payload is ${payloadSizeKB}KB — dangerously close to Firestore 1MB limit!`);
            }
        } catch(sizeErr) {
            console.error("[SESSION DEBUG] Cannot serialize payload:", sizeErr?.message);
        }
        await setDoc(sessionRef, stripUndefined({
            resources: lightweightResources,
            mode: 'sync',
            currentResourceId: null,
            createdAt: new Date().toISOString(),
            hostId: user?.uid,
            aiPolicy,
            hostPresence,
            roster: {},
            democracy: {
                isActive: false,
                phase: 'idle',
                votingContext: 'custom',
                activeOptions: [],
                votes: {},
                suggestions: {}
            },
            quizState: {
                isActive: false,
                mode: 'live-pulse',
                currentQuestionIndex: 0,
                phase: 'idle',
                responses: {},
                responseReceipts: {},
                bossStats: {
                    maxHP: 1000,
                    currentHP: 1000,
                    classHP: 100,
                    name: "The Knowledge Keeper",
                    lastDamage: 0
                },
                teams: {}
            }
        }));
        await new Promise(r => setTimeout(r, 1000));
        setActiveSessionCode(code);
        setShowSessionModal(true);
        setActiveSidebarTab('history');
        addToast(t('session.live', { code }), "success");
        return true;
    } catch (e) {
        warnLog("Session Start Error:", e);
        console.error("[SESSION DEBUG] Full error object:", e);
        console.error("[SESSION DEBUG] Error name:", e?.name);
        console.error("[SESSION DEBUG] Error code:", e?.code);
        console.error("[SESSION DEBUG] Error message:", e?.message);
        console.error("[SESSION DEBUG] Resources count:", history?.length, "history items");
        try {
            const payloadTest = JSON.stringify(history.filter(h => h.id).map(h => ({type: h.type, id: h.id, title: h.title})));
            console.error("[SESSION DEBUG] Payload size:", payloadTest?.length, "chars (~", Math.round((payloadTest?.length || 0)/1024), "KB)");
        } catch(jsonErr) {
            console.error("[SESSION DEBUG] JSON.stringify FAILED:", jsonErr?.message);
            console.error("[SESSION DEBUG] This means non-serializable data in resources");
            if (false /* lightweightResources out of scope */) {
                lightweightResources.forEach((r, i) => {
                    try { JSON.stringify(r); } catch(e2) {
                        console.error(`[SESSION DEBUG] Resource ${i} (${r?.type}/${r?.title}) is NOT serializable:`, e2?.message);
                    }
                });
            }
        }
        if (e.code === 'permission-denied' || e.message?.includes('permission')) {
            const code = generateSessionCode();
            const resourcesToUpload = history.filter(h => h.id);
            const mockResources = resourcesToUpload.map(r => ({
                id: r.id,
                type: r.type,
                title: r.title,
                meta: r.meta,
                data: r.data,
                config: r.config,
                instructionalContext: r.instructionalContext,
                standardsContext: r.standardsContext,
                instructionalText: r.instructionalText,
                localStats: r.localStats,
                targetGradeLevel: r.targetGradeLevel,
                sourceProvenance: r.sourceProvenance,
            }));
            setSessionData(stripUndefined({
                resources: mockResources,
                mode: 'sync',
                currentResourceId: null,
                createdAt: new Date().toISOString(),
                hostId: user?.uid,
                aiPolicy,
                hostPresence,
                isLocalOnly: true,
                transport: 'local-preview',
                shareUnavailableReason: 'firebase-permission-denied',
                roster: {},
                groups: {},
                democracy: { isActive: false, phase: 'idle', votingContext: 'custom', activeOptions: [], votes: {}, suggestions: {} },
                quizState: { isActive: false, mode: 'live-pulse', currentQuestionIndex: 0, phase: 'idle', responses: {}, responseReceipts: {}, bossStats: { maxHP: 1000, currentHP: 1000, classHP: 100, name: "The Knowledge Keeper", lastDamage: 0 }, teams: {} }
            }));
            setActiveSessionCode(code);
            setShowSessionModal(true);
            setActiveSidebarTab('history');
            addToast(t('session.local_mode_warning') || "⚠️ Running in local preview mode (Firebase unavailable)", "warning");
            return true;
        } else {
            addToast(t('session.error_generic'), "error");
            return false;
        }
    }
};

const handleRefineImage = async (deps) => {
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, standardsInput, targetStandards, dokLevel, rosterKey, sessionData, user, appId, activeSessionAppId, activeSessionCode, studentNickname, sourceLength, sourceTone, textFormat, differentiationRange, differentiationTypes, differentiationCustomGrades, fullPackTargetGroup, isAutoConfigEnabled, resourceCount, creativeMode, noText, fillInTheBlank, imageGenerationStyle, imageAspectRatio, useLowQualityVisuals, autoRemoveWords, globalPoints, wizardData, isWizardOpen, standardsLookupRegion, standardsLookupGoal, pdfFixResult, showExportPreview, aiStandardQuery, aiStandardRegion, imageRefinementInput, activeBlueprint, ai, webSearchProvider, alloBotRef, pdfPreviewRef, exportPreviewRef, setError, setIsProcessing, setGenerationStep, setGeneratedContent, setHistory, setActiveView, setActiveSessionCode, setActiveSessionAppId, setStudentNickname, setIsWizardOpen, setShowSourceGen, setSourceTopic, setSourceCustomInstructions, setSourceLength, setSourceTone, setTextFormat, setSelectedLanguages, setGradeLevel, setStandardsInput, setTargetStandards, setDokLevel, setStudentInterests, setSuggestedStandards, setIsLookingUpStandards, setStandardsLookupGoal, setStandardsLookupRegion, setExpandedTools, setShowUDLGuide, setUdlMessages, setGuidedFlowState, setIsRefiningImage, setShowImageRefineModal, setIsExecutingBlueprint, setBlueprintExecutionResult, setShowExportPreview, setInputText, setIsTeacherMode, setIsParentMode, setIsIndependentMode, setActiveSidebarTab, setDoc, setSessionData, setShowSessionModal, setImageRefinementInput, setIsFindingStandards, setShowWizard, setSourceLevel, setSourceVocabulary, setIncludeSourceCitations, setLeveledTextLanguage, setActiveBlueprint, setPersistedLessonDNA, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, flyToElement, getDefaultTitle, storageDB, updateDoc, doc, db, playSound, playAdventureEventSound, generateSessionCode, stripUndefined, uploadSessionAssets, safeSetItem, handleGenerateSource, applyDetailedAutoConfig, handleGenerate, fileInputRef } = deps;
  try { if (window._DEBUG_PHASE_O) console.log("[PhaseO] handleRefineImage fired"); } catch(_) {}
    if (!imageRefinementInput.trim() || !generatedContent?.data?.imageUrl) return;
    setIsProcessing(true);
    setGenerationStep(t('status.refining_image'));
    setError(null);
    addToast(t('visuals.actions.refining_image'), "info");
    try {
        const refinementPrompt = `
            Edit this educational image.
            Instruction: ${imageRefinementInput}.
            Maintain the clear, vector-art style suitable for a worksheet.
        `;
        if (generatedContent?.data.visualPlan && generatedContent?.data.visualPlan.panels.length > 1) {
            const plan = generatedContent?.data.visualPlan;
            setGenerationStep(t('visual_director.refining_all_panels') || 'Applying edit to all panels...');
            const updatedPanels = await Promise.all(
                plan.panels.map(async (panel, idx) => {
                    if (!panel.imageUrl) return panel;
                    try {
                        setGenerationStep(t('visual_director.refining_panel_n', { num: idx + 1, total: plan.panels.length }) || `Editing panel ${idx + 1}/${plan.panels.length}...`);
                        const rawBase64 = panel.imageUrl.split(',')[1];
                        const refined = await callGeminiImageEdit(refinementPrompt, rawBase64);
                        return refined ? { ...panel, imageUrl: refined } : panel;
                    } catch (panelErr) {
                        warnLog(`[NanoBanana] Panel ${idx} edit failed:`, panelErr);
                        return panel;
                    }
                })
            );
            const updatedPlan = { ...plan, panels: updatedPanels };
            const updatedContent = {
                ...generatedContent,
                data: {
                    ...generatedContent?.data,
                    imageUrl: updatedPanels[0]?.imageUrl || generatedContent?.data.imageUrl,
                    visualPlan: updatedPlan,
                    prompt: `(Edited) ${generatedContent?.data.prompt}`
                }
            };
            await _redescribeImageContent(updatedContent, { callGeminiVision, language: leveledTextLanguage });
            setGeneratedContent(updatedContent);
            setHistory(prev => prev.map(item => item.id === generatedContent.id ? updatedContent : item));
            setImageRefinementInput('');
            addToast(t('visual_director.all_panels_refined') || `All ${updatedPanels.length} panels edited!`, "success");
        } else {
            const currentImageBase64 = generatedContent?.data.imageUrl.split(',')[1];
            const newImageBase64 = await callGeminiImageEdit(refinementPrompt, currentImageBase64);
            const updatedContent = {
                ...generatedContent,
                data: {
                    ...generatedContent?.data,
                    imageUrl: newImageBase64,
                    prompt: `(Edited) ${generatedContent?.data.prompt}`
                }
            };
            await _redescribeImageContent(updatedContent, { callGeminiVision, language: leveledTextLanguage });
            setGeneratedContent(updatedContent);
            setHistory(prev => prev.map(item => item.id === generatedContent.id ? updatedContent : item));
            setImageRefinementInput('');
            addToast(t('toasts.image_updated'), "success");
        }
    } catch (e) {
        warnLog("Unhandled error:", e);
        setError(t('glossary.actions.edit_failed'));
        addToast(t('visuals.actions.refinement_failed'), "error");
    } finally {
        setIsProcessing(false);
    }
  }
  const handleGenerateGuide = async (index) => {
    const activity = generatedContent?.data[index];
    if (activity.guide) return;
    setIsGeneratingGuide(prev => ({...prev, [index]: true}));
    try {
        const prompt = `Create a concise step-by-step teacher guide for this activity: "${activity.title}".
        Context: ${activity.description}
        Target Audience: ${gradeLevel}
        Provide:
        1. Materials Needed
        2. Preparation Steps
        3. Step-by-Step Instructions
        Format using simple Markdown.`;
        const guide = await callGemini(prompt);
        const newData = [...generatedContent?.data];
        newData[index] = { ...activity, guide: guide };
        const updatedContent = { ...generatedContent, data: newData };
        setGeneratedContent(updatedContent);
        setHistory(prev => prev.map(item => item.id === generatedContent.id ? updatedContent : item));
    } catch (e) {
        warnLog("Unhandled error:", e);
    } finally {
        setIsGeneratingGuide(prev => ({...prev, [index]: false}));
    }
};

const handleFindStandards = async (gradeContext = null, deps) => {
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, standardsInput, targetStandards, dokLevel, rosterKey, sessionData, user, appId, activeSessionAppId, activeSessionCode, studentNickname, sourceLength, sourceTone, textFormat, differentiationRange, differentiationTypes, differentiationCustomGrades, fullPackTargetGroup, isAutoConfigEnabled, resourceCount, creativeMode, noText, fillInTheBlank, imageGenerationStyle, imageAspectRatio, useLowQualityVisuals, autoRemoveWords, globalPoints, wizardData, isWizardOpen, standardsLookupRegion, standardsLookupGoal, pdfFixResult, showExportPreview, aiStandardQuery, aiStandardRegion, imageRefinementInput, activeBlueprint, ai, webSearchProvider, alloBotRef, pdfPreviewRef, exportPreviewRef, setError, setIsProcessing, setGenerationStep, setGeneratedContent, setHistory, setActiveView, setActiveSessionCode, setActiveSessionAppId, setStudentNickname, setIsWizardOpen, setShowSourceGen, setSourceTopic, setSourceCustomInstructions, setSourceLength, setSourceTone, setTextFormat, setSelectedLanguages, setGradeLevel, setStandardsInput, setTargetStandards, setDokLevel, setStudentInterests, setSuggestedStandards, setIsLookingUpStandards, setStandardsLookupGoal, setStandardsLookupRegion, setExpandedTools, setShowUDLGuide, setUdlMessages, setGuidedFlowState, setIsRefiningImage, setShowImageRefineModal, setIsExecutingBlueprint, setBlueprintExecutionResult, setShowExportPreview, setInputText, setIsTeacherMode, setIsParentMode, setIsIndependentMode, setActiveSidebarTab, setDoc, setSessionData, setShowSessionModal, setImageRefinementInput, setIsFindingStandards, setShowWizard, setSourceLevel, setSourceVocabulary, setIncludeSourceCitations, setLeveledTextLanguage, setActiveBlueprint, setPersistedLessonDNA, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, flyToElement, getDefaultTitle, storageDB, updateDoc, doc, db, playSound, playAdventureEventSound, generateSessionCode, stripUndefined, uploadSessionAssets, safeSetItem, handleGenerateSource, applyDetailedAutoConfig, handleGenerate, fileInputRef } = deps;
  try { if (window._DEBUG_PHASE_O) console.log("[PhaseO] handleFindStandards fired"); } catch(_) {}
      if (!aiStandardQuery.trim()) return;
            const effectiveGrade = (typeof gradeContext === 'string' && gradeContext) ? gradeContext : gradeLevel;
      const regionText = aiStandardRegion ? `Constraint (Region or Framework): ${aiStandardRegion}` : "Context: General/US";
      setIsFindingStandards(true);
      setSuggestedStandards([]);
      try {
          const isLocalBackend = ai?.backend === 'ollama' || ai?.backend === 'localai';
          let textToParse = "";
          // Tracks whether these codes actually came off the open web. Only a
          // search that returned attributable results earns "verified".
          let webVerified = true;

          if (isLocalBackend) {
              const searchQuery = `${aiStandardRegion || 'CCSS'} ${effectiveGrade} "${aiStandardQuery}" educational standard`;
              let searchContext = '';
              try {
                  // search() resolves { results, contextPrompt, groundingMetadata },
                  // not a bare array — the old `.length` check was always falsy,
                  // so searchContext stayed empty even on a successful search.
                  const searchResults = await webSearchProvider.search(searchQuery);
                  const hits = Array.isArray(searchResults && searchResults.results)
                      ? searchResults.results
                      : (Array.isArray(searchResults) ? searchResults : []);
                  if (hits.length > 0) {
                      searchContext = hits.slice(0, 5).map((r, i) =>
                          `[${i+1}] ${r.title}\n${r.snippet}\nURL: ${r.url}`
                      ).join('\n\n');
                  }
              } catch (searchErr) {
                  warnLog('[Standards] Web search failed:', searchErr && searchErr.message);
              }
              if (!searchContext) webVerified = false;
              const localPrompt = `
                Task: Extract official educational standard codes from the following search results.
                User Query/Skill: "${aiStandardQuery}"
                Target Grade: ${effectiveGrade}
                ${regionText}
                ${searchContext ? `\nWEB SEARCH RESULTS:\n${searchContext}\n` : ''}
                INSTRUCTIONS:
                1. Extract EXACT standard codes and their descriptions from the search results above.
                2. If the search results mention specific standard codes (e.g. CCSS.ELA-LITERACY.RI.5.1), include those exact codes.
                3. If no relevant standards are found, return an empty array: [].
                Return ONLY a raw JSON array:
                [{"code": "CCSS.ELA-LITERACY.RI.5.1", "description": "Quote accurately from a text...", "framework": "CCSS"}]
              `;
              textToParse = await ai.generateText(localPrompt, { json: true, temperature: 0.1 });
          } else {
              const prompt = `
                Task: Find official educational standards using Google Search.
                User Query/Skill: "${aiStandardQuery}"
                Target Grade: ${effectiveGrade}
                ${regionText}
                INSTRUCTIONS:
                1. Use Google Search to find the EXACT standard codes.
                2. **FRAMEWORK PRIORITY:** If the "Constraint" specifies a framework (e.g. "CASEL", "CCSS", "NGSS"), RESTRICT results to that specific framework.
                3. If no framework is specified, prioritize official standards for the region or US Common Core.
                4. Verify the standard code matches the description found in the search snippet.
                CRITICAL OUTPUT RULES:
                - You are a JSON generator. You are NOT a chatbot.
                - Do NOT output conversational text, introductions, or explanations.
                - If no standards are found, return an empty JSON array: [].
                - Return ONLY the raw JSON array.
                Return ONLY a JSON array of objects:
                [
                    {
                        "code": "Exact Standard Code Found",
                        "description": "The official text of the standard...",
                        "framework": "The Framework Name (e.g. TEKS, CCSS, BC Curriculum)",
                    }
                ]
              `;
              const unverifiedPrompt = `
                Task: List official educational standards you are confident about from your own training knowledge.
                User Query/Skill: "${aiStandardQuery}"
                Target Grade: ${effectiveGrade}
                ${regionText}
                INSTRUCTIONS:
                1. Web search is NOT available for this request. Use only what you already know.
                2. **FRAMEWORK PRIORITY:** If the "Constraint" specifies a framework, RESTRICT results to that framework.
                3. Include a standard ONLY if you are confident the code and its description are correct and belong together.
                4. DO NOT invent, guess, or approximate a code. Omitting an uncertain standard is correct; a fabricated code is not.
                5. If you are not confident about any standard, return an empty JSON array: [].
                CRITICAL OUTPUT RULES:
                - You are a JSON generator. You are NOT a chatbot.
                - Return ONLY the raw JSON array of objects, same format as above.
              `;
              // Explicit query — see the note in handleWizardStandardLookup.
              // The prompt's `User Query/Skill: "..."` line otherwise regex-scrapes
              // down to the bare skill, losing the grade and framework.
              const searchQuery = `${aiStandardRegion || 'CCSS'} ${effectiveGrade} "${aiStandardQuery}" educational standard`;
              try {
                  const result = await callGemini(prompt, false, true, null, searchQuery);
                  if (typeof result === 'object' && result.text) {
                      textToParse = result.text;
                  } else if (typeof result === 'string') {
                      textToParse = result;
                  }
              } catch (searchErr) {
                  if (searchErr && searchErr.code === 'allo/search-unavailable') {
                      warnLog('[Standards] Web search unavailable - falling back to model knowledge (unverified):', searchErr.message);
                      webVerified = false;
                      textToParse = String(await callGemini(unverifiedPrompt, true, false, 0.1) || "");
                  } else {
                      throw searchErr;
                  }
              }
          }

          const parsed = safeJsonParse(textToParse);
          if (Array.isArray(parsed)) {
              const standards = parsed.map((std) => ({ ...std, webVerified }));
              setSuggestedStandards(standards);
              if (standards.length === 0) {
                  addToast(t('toasts.no_standards_found'), "info");
              } else if (webVerified) {
                  // Was hardcoded English AND said "verified" unconditionally —
                  // including on the local-backend path, which may never have
                  // searched at all.
                  addToast(t('toasts.standards_found_verified', { count: standards.length }), "success");
              } else {
                  addToast(t('toasts.standards_found_unverified', { count: standards.length }), "warning");
              }
          } else {
              warnLog("Standards Search: Response was not a valid array.", textToParse);
              addToast(t('toasts.standards_parse_error'), "warning");
          }
      } catch (err) {
          warnLog("Global Standards Search Error:", err);
          addToast(t('toasts.standards_search_failed'), "error");
      } finally {
          setIsFindingStandards(false);
      }
};

const handleWizardComplete = (data, deps) => {
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, standardsInput, targetStandards, dokLevel, rosterKey, sessionData, user, appId, activeSessionAppId, activeSessionCode, studentNickname, sourceLength, sourceTone, textFormat, differentiationRange, differentiationTypes, differentiationCustomGrades, fullPackTargetGroup, isAutoConfigEnabled, resourceCount, creativeMode, noText, fillInTheBlank, imageGenerationStyle, imageAspectRatio, useLowQualityVisuals, autoRemoveWords, globalPoints, wizardData, isWizardOpen, standardsLookupRegion, standardsLookupGoal, pdfFixResult, showExportPreview, aiStandardQuery, aiStandardRegion, imageRefinementInput, activeBlueprint, ai, webSearchProvider, alloBotRef, pdfPreviewRef, exportPreviewRef, setError, setIsProcessing, setGenerationStep, setGeneratedContent, setHistory, setActiveView, setActiveSessionCode, setActiveSessionAppId, setStudentNickname, setIsWizardOpen, setShowSourceGen, setSourceTopic, setSourceCustomInstructions, setSourceLength, setSourceTone, setTextFormat, setSelectedLanguages, setGradeLevel, setStandardsInput, setTargetStandards, setDokLevel, setStudentInterests, setSuggestedStandards, setIsLookingUpStandards, setStandardsLookupGoal, setStandardsLookupRegion, setExpandedTools, setShowUDLGuide, setUdlMessages, setGuidedFlowState, setIsRefiningImage, setShowImageRefineModal, setIsExecutingBlueprint, setBlueprintExecutionResult, setShowExportPreview, setInputText, setIsTeacherMode, setIsParentMode, setIsIndependentMode, setActiveSidebarTab, setDoc, setSessionData, setShowSessionModal, setImageRefinementInput, setIsFindingStandards, setShowWizard, setSourceLevel, setSourceVocabulary, setIncludeSourceCitations, setLeveledTextLanguage, setActiveBlueprint, setPersistedLessonDNA, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, flyToElement, getDefaultTitle, storageDB, updateDoc, doc, db, playSound, playAdventureEventSound, generateSessionCode, stripUndefined, uploadSessionAssets, safeSetItem, handleGenerateSource, applyDetailedAutoConfig, handleGenerate, fileInputRef } = deps;
  try { if (window._DEBUG_PHASE_O) console.log("[PhaseO] handleWizardComplete fired"); } catch(_) {}
    const finalData = data;
    if (finalData.grade) {
        setGradeLevel(finalData.grade);
        setSourceLevel(finalData.grade);
    }
    if (finalData.standards && Array.isArray(finalData.standards) && finalData.standards.length > 0) {
        setTargetStandards(finalData.standards);
        const stdCodes = finalData.standards.map(s => s.split(':')[0].trim()).join(', ');
    }
    if (finalData.languages && Array.isArray(finalData.languages)) {
         const validLangs = finalData.languages.filter(l => l && l.trim());
         if (validLangs.length > 0) {
             setSelectedLanguages(validLangs);
             setLeveledTextLanguage(validLangs[0]);
         } else {
             setLeveledTextLanguage('English');
         }
    } else {
         setLeveledTextLanguage('English');
    }
    if (finalData.interests) {
        const interestArray = typeof finalData.interests === 'string'
            ? finalData.interests.split(',').map(i => i.trim()).filter(i => i)
            : (Array.isArray(finalData.interests) ? finalData.interests : []);
        setStudentInterests(interestArray);
    }
    if (finalData.format) {
        setTextFormat(finalData.format);
    }
    if (finalData.sourceMode === 'generate') {
      setSourceTopic(finalData.topic);
      if (finalData.tone) setSourceTone(finalData.tone);
      if (finalData.length) setSourceLength(finalData.length);
      if (finalData.sourceCustomInstructions) setSourceCustomInstructions(finalData.sourceCustomInstructions);
      if (finalData.verification !== undefined) {
          setIncludeSourceCitations(finalData.verification);
      }
      if (finalData.dokLevel) setDokLevel(finalData.dokLevel);
      if (finalData.vocabulary) setSourceVocabulary(finalData.vocabulary);
      setShowSourceGen(true);
      setExpandedTools(prev => prev.includes('source-input') ? prev : [...prev, 'source-input']);
      setTimeout(() => {
          handleGenerateSource({
              topic: finalData.topic,
              grade: finalData.grade,
              standards: finalData.standards ? finalData.standards.join('; ') : '',
              includeCitations: finalData.verification,
              length: parseInt(finalData.length),
              tone: finalData.tone,
              dokLevel: finalData.dokLevel,
              vocabulary: finalData.vocabulary,
              customInstructions: finalData.sourceCustomInstructions
          });
      }, 500);
    } else if (finalData.sourceMode === 'url' || finalData.sourceMode === 'search' || finalData.sourceMode === 'storybook') {
      if (finalData.fetchedContent) {
          setInputText(finalData.fetchedContent);
      }
      const topic = finalData.searchQuery || finalData.topic;
      if (topic) setSourceTopic(topic);
      setExpandedTools(prev => prev.includes('source-input') ? prev : [...prev, 'source-input']);
      // A picked catalog resource also becomes a resource-pack entry (same
      // 'readingBook' item the reader's Save-to-lesson creates), so it rides
      // along with the lesson and can be reopened from Resources — not just
      // dumped into the source box.
      if (finalData.sourceMode === 'storybook' && finalData.storybookRef && finalData.storybookRef.slug) {
        const ref = finalData.storybookRef;
        const meta = [
          ref.sourceName || 'Reading Catalog resource',
          ref.level ? (t('readinglib_level') || 'Level') + ' ' + ref.level : null,
          ref.language,
          ref.hasAudio ? ('🔊 ' + (t('readinglib_narrated') || 'narrated')) : null,
        ].filter(Boolean).join(' · ');
        setHistory(prev => {
          if (prev.some(it => it && it.type === 'readingBook' && it.data && it.data.slug === ref.slug)) return prev;
          return [...prev, {
            id: 'readingbook-' + ref.slug + '-' + Date.now(),
            type: 'readingBook',
            title: ref.title,
            meta,
            timestamp: new Date(),
            data: ref,
            config: {},
          }];
        });
      }
    } else if (finalData.sourceMode === 'file' || finalData.materialType === 'file') {
      setExpandedTools(prev => prev.includes('source-input') ? prev : [...prev, 'source-input']);
      setTimeout(() => {
          if (fileInputRef.current) fileInputRef.current.click();
      }, 200);
    } else if (finalData.materialType === 'text') {
      setInputText(finalData.topic);
    }
    setShowWizard(false);
    safeSetItem('allo_wizard_completed', 'true');
};

const handleWizardStandardLookup = async (grade, goal, region, deps) => {
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, standardsInput, targetStandards, dokLevel, rosterKey, sessionData, user, appId, activeSessionAppId, activeSessionCode, studentNickname, sourceLength, sourceTone, textFormat, differentiationRange, differentiationTypes, differentiationCustomGrades, fullPackTargetGroup, isAutoConfigEnabled, resourceCount, creativeMode, noText, fillInTheBlank, imageGenerationStyle, imageAspectRatio, useLowQualityVisuals, autoRemoveWords, globalPoints, wizardData, isWizardOpen, standardsLookupRegion, standardsLookupGoal, pdfFixResult, showExportPreview, aiStandardQuery, aiStandardRegion, imageRefinementInput, activeBlueprint, ai, webSearchProvider, alloBotRef, pdfPreviewRef, exportPreviewRef, setError, setIsProcessing, setGenerationStep, setGeneratedContent, setHistory, setActiveView, setActiveSessionCode, setActiveSessionAppId, setStudentNickname, setIsWizardOpen, setShowSourceGen, setSourceTopic, setSourceCustomInstructions, setSourceLength, setSourceTone, setTextFormat, setSelectedLanguages, setGradeLevel, setStandardsInput, setTargetStandards, setDokLevel, setStudentInterests, setSuggestedStandards, setIsLookingUpStandards, setStandardsLookupGoal, setStandardsLookupRegion, setExpandedTools, setShowUDLGuide, setUdlMessages, setGuidedFlowState, setIsRefiningImage, setShowImageRefineModal, setIsExecutingBlueprint, setBlueprintExecutionResult, setShowExportPreview, setInputText, setIsTeacherMode, setIsParentMode, setIsIndependentMode, setActiveSidebarTab, setDoc, setSessionData, setShowSessionModal, setImageRefinementInput, setIsFindingStandards, setShowWizard, setSourceLevel, setSourceVocabulary, setIncludeSourceCitations, setLeveledTextLanguage, setActiveBlueprint, setPersistedLessonDNA, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, flyToElement, getDefaultTitle, storageDB, updateDoc, doc, db, playSound, playAdventureEventSound, generateSessionCode, stripUndefined, uploadSessionAssets, safeSetItem, handleGenerateSource, applyDetailedAutoConfig, handleGenerate, fileInputRef } = deps;
  try { if (window._DEBUG_PHASE_O) console.log("[PhaseO] handleWizardStandardLookup fired"); } catch(_) {}
      try {
          const regionText = region ? `Constraint (Region or Framework): ${region}` : "Context: General/US";
          const isLocalBackend = ai?.backend === 'ollama' || ai?.backend === 'localai';

          if (isLocalBackend) {
              const searchQuery = `${region || 'CCSS'} ${grade} "${goal}" educational standard`;
              let searchContext = '';
              try {
                  // search() resolves { results, contextPrompt, groundingMetadata },
                  // not a bare array — the old `.length` check was always falsy,
                  // so searchContext stayed empty even on a successful search.
                  const searchResults = await webSearchProvider.search(searchQuery);
                  const hits = Array.isArray(searchResults && searchResults.results)
                      ? searchResults.results
                      : (Array.isArray(searchResults) ? searchResults : []);
                  if (hits.length > 0) {
                      searchContext = hits.slice(0, 5).map((r, i) =>
                          `[${i+1}] ${r.title}\n${r.snippet}\nURL: ${r.url}`
                      ).join('\n\n');
                  }
              } catch (searchErr) {
                  warnLog('[Standards] Web search failed, LLM will use training data:', searchErr && searchErr.message);
              }
              const localPrompt = `
                Task: Extract official educational standard codes from the following search results.
                Target Grade Level: ${grade}
                ${regionText}
                Learning Goal: "${goal}"
                ${searchContext ? `\nWEB SEARCH RESULTS:\n${searchContext}\n` : ''}
                INSTRUCTIONS:
                1. Extract EXACT standard codes and their descriptions from the search results above.
                2. If the search results mention specific standard codes (e.g. CCSS.ELA-LITERACY.RI.5.1), include those exact codes.
                3. If no relevant standards are found in the search results, return an empty array: [].
                Return ONLY a raw JSON array:
                [{"code": "CCSS.ELA-LITERACY.RI.5.1", "description": "Quote accurately from a text...", "framework": "CCSS"}]
              `;
              const result = await ai.generateText(localPrompt, { json: true, temperature: 0.1 });
              const parsed = safeJsonParse(result);
              if (!Array.isArray(parsed)) return [];
              return parsed.map((std) => ({ ...std, webVerified: !!searchContext }));
          }

          const prompt = `
            Task: Find official educational standards using Google Search.
            Target Grade Level: ${grade}
            ${regionText}
            Learning Goal: "${goal}",
            INSTRUCTIONS:
            1. Use Google Search to find the EXACT standard codes and descriptions relevant to this skill.
            2. **FRAMEWORK PRIORITY:** If the "Constraint" specifies a framework (e.g. "CASEL", "CCSS", "NGSS"), RESTRICT results to that specific framework.
            3. If no framework is specified, prioritize official standards for the region or US Common Core.
            4. Verify the standard code matches the description found in the search snippet.
            CRITICAL OUTPUT RULES:
            - You are a JSON generator. You are NOT a chatbot.
            - Do NOT output conversational text, introductions, or explanations (e.g. "Here are the standards...").
            - Do NOT summarize the search results in plain text.
            - If no exact standards are found, return an empty JSON array: [].
            - Return ONLY the raw JSON array of objects.
            Format:
            [
                {
                    "code": "Exact Standard Code Found",
                    "description": "The official text of the standard...",
                    "framework": "The Framework Name (e.g. TEKS, CCSS, BC Curriculum)",
                }
            ]
          `;
          // No-search variant. Deliberately tells the model NOT to guess a code
          // it cannot recall: a plausible-looking fabricated standard code is
          // worse than no result, because a teacher will paste it into an IEP
          // or a lesson plan and it will read as authoritative.
          const unverifiedPrompt = `
            Task: List official educational standards you are confident about from your own training knowledge.
            Target Grade Level: ${grade}
            ${regionText}
            Learning Goal: "${goal}"
            INSTRUCTIONS:
            1. Web search is NOT available for this request. Use only what you already know.
            2. **FRAMEWORK PRIORITY:** If the "Constraint" specifies a framework (e.g. "CASEL", "CCSS", "NGSS"), RESTRICT results to that framework.
            3. Include a standard ONLY if you are confident the code and its description are correct and belong together.
            4. DO NOT invent, guess, or approximate a code. Omitting an uncertain standard is correct; a fabricated code is not.
            5. If you are not confident about any standard, return an empty JSON array: [].
            CRITICAL OUTPUT RULES:
            - You are a JSON generator. You are NOT a chatbot.
            - Return ONLY the raw JSON array of objects, same format as below.
            [
                {
                    "code": "Standard Code",
                    "description": "The text of the standard...",
                    "framework": "The Framework Name"
                }
            ]
          `;
          // The web query must be built explicitly. Left to itself,
          // WebSearchProvider._extractSearchQuery regex-scrapes the prompt and
          // matches `Learning Goal: "..."` — which yields the BARE goal ("main
          // ideas"), dropping the grade and the framework. Searching the open
          // web for "main ideas" returns reading-comprehension blogs with no
          // standard codes in them, so the model has nothing to extract and the
          // Find button returns an empty list.
          //
          // This did not bite under the old google_search grounding, where
          // Gemini itself decided what to search from the full prompt. The
          // Canvas transport injects results the client fetched, so the client
          // is now responsible for asking a good question.
          //
          // Same query the local-backend branch above already builds.
          const searchQuery = `${region || 'CCSS'} ${grade} "${goal}" educational standard`;
          // Grounded first. When the environment has no web-search transport
          // (Canvas since the maintainer proxy was retired), callGemini throws
          // allo/search-unavailable rather than silently returning ungrounded
          // prose — see gemini_api_source. Catching it HERE and returning []
          // is what made the wizard's Find button look dead: no results, no
          // error, no spinner state left behind. Fall back to the model's own
          // knowledge instead, and mark every row as NOT web-verified so the
          // UI can say so rather than implying the codes were looked up.
          let textToParse = "";
          let webVerified = true;
          try {
              const result = await callGemini(prompt, false, true, null, searchQuery);
              if (typeof result === 'object' && result.text) {
                  textToParse = result.text;
              } else {
                  textToParse = String(result || "");
              }
          } catch (searchErr) {
              if (searchErr && searchErr.code === 'allo/search-unavailable') {
                  warnLog("[Standards] Web search unavailable - falling back to model knowledge (unverified):", searchErr.message);
                  webVerified = false;
                  textToParse = String(await callGemini(unverifiedPrompt, true, false, 0.1) || "");
              } else {
                  throw searchErr;
              }
          }
          const parsed = safeJsonParse(textToParse);
          if (!Array.isArray(parsed)) return [];
          return parsed.map((std) => ({ ...std, webVerified }));
      } catch (e) {
          warnLog("Unhandled error in handleWizardStandardLookup:", e);
          // Rethrow: the wizard shows a toast. Swallowing here is what turned
          // every failure into a button that does nothing.
          throw e;
      }
};

// executeOneBlueprint — run ONE blueprint's resource loop. Extracted verbatim
// from handleExecuteBlueprint's inner loop (2026-06-14) so it can be reused by
// the Generate-Unit driver (once per lesson) without duplicating any generation
// logic. Behavior of the single-blueprint path is unchanged: same handleGenerate
// call, same lessonDNA carry-forward (analysis→concepts/source, glossary→keyTerms,
// image→visualContext, lesson-plan→essentialQuestion), same 1s inter-resource pace.
// `dna` is mutated IN PLACE (faithful to the original) and returned as dnaOut.
// Additions are inert for the single-blueprint caller: `onResource` (per-item
// hook) is optional; `signal` (cooperative abort) is null on that path.
const _resolveBlueprintInstructionalContext = (blueprint, settingsSnapshot, lessonDNA) => {
    const bp = blueprint && typeof blueprint === 'object' ? blueprint : {};
    const snapshot = settingsSnapshot && typeof settingsSnapshot === 'object' ? settingsSnapshot : {};
    const modules = typeof window !== 'undefined' && window.AlloModules ? window.AlloModules : {};
    const standardsModule = modules.StandardsContext;
    const instructionalModule = modules.InstructionalContext;
    const rawContext = snapshot.instructionalContext || bp.instructionalContext || {};
    const rawStandards = rawContext.standardsContext || snapshot.standardsContext || bp.standardsContext
        || bp.standards || (lessonDNA && lessonDNA.standard) || null;
    const standardsContext = rawStandards && Array.isArray(rawStandards.standards)
        ? rawStandards
        : (standardsModule && typeof standardsModule.resolve === 'function' ? standardsModule.resolve(rawStandards) : rawStandards);
    const grade = rawContext.instructionalGrade || snapshot.gradeLevel
        || (bp.globalSettings && bp.globalSettings.gradeLevel)
        || (lessonDNA && lessonDNA.grade) || '';
    if (instructionalModule && typeof instructionalModule.normalizeInstructionalContext === 'function') {
        return instructionalModule.normalizeInstructionalContext(rawContext, {
            instructionalGrade: grade,
            standardsContext,
            standardsInput: bp.standards || (lessonDNA && lessonDNA.standard) || '',
        });
    }
    const constraints = standardsContext && standardsContext.instructionalConstraints || {};
    const prohibited = constraints.textAccessExpectation === 'adaptation-prohibited'
        && (constraints.sourced === true || !!(constraints.basis || constraints.sourceUrl));
    const explicitAdapted = ['include', 'omit', 'prohibited'].includes(rawContext.adaptedTextPolicy)
        ? rawContext.adaptedTextPolicy : '';
    return {
        schemaVersion: 1,
        instructionalGrade: String(grade || ''),
        primaryTextPolicy: rawContext.primaryTextPolicy === 'educator-directed' ? 'educator-directed' : 'preserve-primary',
        primaryTextAccess: constraints.textAccessExpectation === 'preserve-primary' || prohibited ? 'required' : 'available',
        adaptedTextPolicy: prohibited ? 'prohibited' : (explicitAdapted || 'include'),
        adaptedTextPolicySource: prohibited ? 'standard' : (explicitAdapted ? 'educator' : 'workflow-default'),
        textAccessReason: prohibited ? 'sourced-adaptation-prohibition' : (explicitAdapted ? 'educator-choice' : 'default-access-companion'),
        standardsContext: standardsContext || null,
        standardsFingerprint: String(rawContext.standardsFingerprint || ''),
    };
};

const _resolveBlueprintInstructionalText = (type, raw, instructionalContext, language) => {
    const isAdapted = type === 'simplified';
    const defaults = {
        schemaVersion: 1,
        role: isAdapted ? 'supplemental' : (type === 'analysis' ? 'primary' : 'unspecified'),
        form: isAdapted ? 'adapted' : 'original',
        sourceArtifactId: null,
        primaryArtifactId: null,
        designationSource: 'workflow-default',
        replacementAuthorization: { authorized: false, source: 'none' },
        complexity: {
            requestedGrade: instructionalContext && instructionalContext.instructionalGrade || '',
            calibrationTarget: '', measuredGrade: null, method: '', status: 'unavailable',
            contentFingerprint: '', measuredAt: '', language: language || 'English',
        },
    };
    const candidate = Object.assign({}, defaults, raw && typeof raw === 'object' ? raw : {});
    candidate.complexity = Object.assign({}, defaults.complexity,
        raw && raw.complexity && typeof raw.complexity === 'object' ? raw.complexity : {});
    const module = typeof window !== 'undefined' && window.AlloModules
        ? window.AlloModules.InstructionalContext : null;
    return module && typeof module.normalizeInstructionalText === 'function'
        ? module.normalizeInstructionalText(candidate)
        : candidate;
};

const getBlueprintResourcePlan = (blueprint) => {
    const toolDirectives = (blueprint && blueprint.toolDirectives) || {};
    const plannedRows = Array.isArray(blueprint?.resourcePlan) && blueprint.resourcePlan.length > 0
        ? blueprint.resourcePlan
        : ((blueprint && blueprint.recommendedResources) || []);
    const adaptedPolicy = blueprint && blueprint.instructionalContext
        && blueprint.instructionalContext.adaptedTextPolicy;
    const rawPlan = adaptedPolicy === 'omit' || adaptedPolicy === 'prohibited'
        ? plannedRows.filter(item => {
            const type = typeof item === 'string' ? item : (item && (item.tool || item.type || item.id));
            return type !== 'simplified';
        })
        : plannedRows;
    return rawPlan.map((item, idx) => {
        const type = typeof item === 'string' ? item : (item && (item.tool || item.type || item.id));
        if (!type) return null;
        const row = {
            type,
            // Stable row identity minted by the contract layer. Falls back to
            // the positional form only for plans built outside it.
            uiId: (typeof item === 'object' && item && (item.uiId || item.stepId)) || (String(type) + '-' + idx),
            directive: typeof item === 'string'
                ? (toolDirectives[type] || "")
                : (item.directive || item.instructions || item.customInstructions || toolDirectives[type] || ""),
            instructionalText: (typeof item === 'object' && item && item.instructionalText) || null,
            // Activities redesign (2026-08-16): a brainstorm step may carry an
            // activity mode ('ideas' | 'discussion' | 'jigsaw') plus options.
            // Optional and additive — plans without it behave exactly as before
            // (the dispatcher defaults to idea starters).
            activityMode: (typeof item === 'object' && item && typeof item.activityMode === 'string') ? item.activityMode : null,
            activityConfig: (typeof item === 'object' && item && item.activityConfig && typeof item.activityConfig === 'object') ? item.activityConfig : null
        };
        if (typeof item === 'object' && item) {
            if (typeof item.generationAction === 'string') row.generationAction = item.generationAction;
            if (item.generationIdentity !== undefined) row.generationIdentity = item.generationIdentity;
            if (Array.isArray(item.generationVariants)) row.generationVariants = item.generationVariants.map(v => v && typeof v === 'object' ? { ...v } : v);
            if (typeof item.existingArtifactId === 'string') row.existingArtifactId = item.existingArtifactId;
            if (typeof item.variantKey === 'string') row.variantKey = item.variantKey;
            if (Object.prototype.hasOwnProperty.call(item, 'explicitVariantKey')) row.explicitVariantKey = item.explicitVariantKey;
            if (item.variantKeyDerived === true || item.variantKeyDerived === false) row.variantKeyDerived = item.variantKeyDerived;
            if (typeof item.sourceFingerprint === 'string') row.sourceFingerprint = item.sourceFingerprint;
            if (Object.prototype.hasOwnProperty.call(item, 'sourceArtifactId')) row.sourceArtifactId = item.sourceArtifactId;
            if (typeof item.contextFingerprint === 'string') row.contextFingerprint = item.contextFingerprint;
            if (typeof item.contextInputsFingerprint === 'string') row.contextInputsFingerprint = item.contextInputsFingerprint;
            if (item.contextFingerprintDerived === true || item.contextFingerprintDerived === false) row.contextFingerprintDerived = item.contextFingerprintDerived;
            if (item.generationMatrix && typeof item.generationMatrix === 'object') row.generationMatrix = { ...item.generationMatrix };
            if (item.generationMatrixUnavailable === true) row.generationMatrixUnavailable = true;
        }
        return row;
    }).filter(Boolean);
};

const _getBlueprintGenerationMatrix = () => {
    try {
        return typeof window !== 'undefined' && window.AlloModules
            ? window.AlloModules.GenerationMatrix || null : null;
    } catch (_) { return null; }
};

const _isBlueprintGenerationMatrixReady = () => {
    const matrix = _getBlueprintGenerationMatrix();
    return !!(matrix && typeof matrix.resolveGenerationMatrix === 'function');
};

const _createBlueprintGenerationMatrixError = (details) => {
    const error = new Error('Blueprint generation planning is unavailable. No resources were generated; retry after the Generation Matrix module finishes loading.');
    error.name = 'BlueprintGenerationMatrixUnavailableError';
    error.code = 'BLUEPRINT_GENERATION_MATRIX_UNAVAILABLE';
    error.reasonCode = 'generation-matrix-unavailable';
    error.isRetryable = true;
    error.isFatal = true;
    if (details && typeof details === 'object') Object.assign(error, details);
    return error;
};

// Convert a reviewed row into the exact execution cells the shared matrix
// selected. A reviewed generationVariants array is authoritative. Only legacy
// rows are resolved defensively; if the module is unavailable they retain the
// historical one-call behavior and the run record says so explicitly.
const _resolveBlueprintExecutionMatrix = (row, settingsSnapshot, existingArtifacts, sourceText, forceRefresh) => {
    const reviewed = row && Array.isArray(row.generationVariants) ? row.generationVariants.filter(Boolean) : [];
    const matrix = _getBlueprintGenerationMatrix();
    const reviewedSourceFingerprint = (row && row.sourceFingerprint)
        || (reviewed[0] && reviewed[0].sourceFingerprint)
        || (settingsSnapshot && settingsSnapshot.sourceFingerprint)
        || '';
    let currentSourceFingerprint = '';
    if (matrix && typeof matrix.fingerprintSourceText === 'function' && sourceText) {
        try { currentSourceFingerprint = matrix.fingerprintSourceText(sourceText); } catch (_) {}
    }
    const sourceChanged = !!(currentSourceFingerprint && reviewedSourceFingerprint
        && currentSourceFingerprint !== reviewedSourceFingerprint);
    let currentGenerationConfigFingerprint = '';
    if (matrix && typeof matrix.buildGenerationConfigFingerprint === 'function') {
        try { currentGenerationConfigFingerprint = matrix.buildGenerationConfigFingerprint(row, settingsSnapshot || {}); } catch (_) {}
    }
    const reviewedGenerationConfigFingerprints = reviewed
        .map(cell => cell && cell.generationConfigFingerprint).filter(Boolean);
    if (!reviewedGenerationConfigFingerprints.length && row && row.generationConfigFingerprint) {
        reviewedGenerationConfigFingerprints.push(row.generationConfigFingerprint);
    }
    const generationConfigChanged = !!(currentGenerationConfigFingerprint
        && reviewedGenerationConfigFingerprints.length
        && reviewedGenerationConfigFingerprints.some(value => value !== currentGenerationConfigFingerprint));
    // Re-resolve only when an identity-bearing input changed. Otherwise retain
    // the exact reviewed grade-language cells (including legacy snapshots that
    // do not contain enough inputs to reconstruct their cross-product).
    if ((sourceChanged || generationConfigChanged)
        && matrix && typeof matrix.resolveGenerationMatrix === 'function') {
        try {
            const options = Object.assign({}, settingsSnapshot || {}, {
                existingArtifacts: Array.isArray(existingArtifacts) ? existingArtifacts : [],
                sourceText: sourceText || '',
                sourceFingerprint: sourceChanged ? currentSourceFingerprint
                    : ((settingsSnapshot && settingsSnapshot.sourceFingerprint) || currentSourceFingerprint || ''),
                forceRefresh: forceRefresh === true,
            });
            const resolved = matrix.resolveGenerationMatrix(row, options);
            if (resolved && Array.isArray(resolved.variants) && resolved.variants.length) {
                return {
                    available: true,
                    action: resolved.action,
                    sourceChanged,
                    reviewedSourceFingerprint,
                    currentSourceFingerprint: currentSourceFingerprint || reviewedSourceFingerprint,
                    variants: resolved.variants.map(cell => Object.assign({}, cell, {
                        explicitVariantKey: cell.explicitVariantKey !== undefined ? cell.explicitVariantKey : resolved.explicitVariantKey,
                        variantKeyDerived: cell.variantKeyDerived !== undefined ? cell.variantKeyDerived : resolved.variantKeyDerived,
                    }))
                };
            }
        } catch (_) {}
    }
    if (reviewed.length && !sourceChanged) {
        const artifactIdentity = (artifact) => {
            const candidate = artifact && (artifact.generationIdentity
                || (artifact.config && artifact.config.generationIdentity));
            if (typeof candidate === 'string') return candidate;
            return candidate && typeof candidate === 'object'
                ? String(candidate.key || candidate.id || candidate.generationIdentity || candidate.identity || '') : '';
        };
        const artifacts = Array.isArray(existingArtifacts) ? existingArtifacts : [];
        const executionVariants = reviewed.map(cell => {
            let action = forceRefresh ? 'refresh' : (cell.action || row.generationAction || 'generate');
            let existingArtifactId = cell.existingArtifactId || null;
            if (!forceRefresh && action !== 'reuse' && cell.generationIdentity) {
                const landed = artifacts.find(artifact => artifactIdentity(artifact) === String(cell.generationIdentity));
                if (landed) {
                    action = 'reuse';
                    existingArtifactId = landed.id || landed.resourceId || landed.artifactId || null;
                }
            }
            return {
                ...cell,
                action,
                existingArtifactId,
                explicitVariantKey: cell.explicitVariantKey !== undefined ? cell.explicitVariantKey : row.explicitVariantKey,
                variantKeyDerived: cell.variantKeyDerived !== undefined ? cell.variantKeyDerived : row.variantKeyDerived,
            };
        });
        return {
            available: true,
            action: executionVariants.every(cell => cell.action === 'reuse') ? 'reuse'
                : (forceRefresh ? 'refresh' : (row.generationAction || reviewed[0].action || 'generate')),
            sourceChanged: false,
            reviewedSourceFingerprint,
            currentSourceFingerprint: currentSourceFingerprint || reviewedSourceFingerprint,
            variants: executionVariants,
        };
    }
    if (row && (row.generationAction || row.generationIdentity || row.existingArtifactId) && !sourceChanged) {
        return {
            available: true,
            action: forceRefresh ? 'refresh' : (row.generationAction || 'generate'),
            sourceChanged: false,
            reviewedSourceFingerprint,
            currentSourceFingerprint: currentSourceFingerprint || reviewedSourceFingerprint,
            variants: [{
                type: row.type,
                action: forceRefresh ? 'refresh' : (row.generationAction || 'generate'),
                generationIdentity: row.generationIdentity || null,
                existingArtifactId: row.existingArtifactId || null,
                variantKey: row.variantKey || null,
                explicitVariantKey: row.explicitVariantKey || null,
                variantKeyDerived: row.variantKeyDerived === true,
                grade: row.grade || row.gradeLevel || null,
                language: row.language || row.leveledTextLanguage || null,
            }],
        };
    }
    if (matrix && typeof matrix.resolveGenerationMatrix === 'function') {
        try {
            const options = Object.assign({}, settingsSnapshot || {}, {
                existingArtifacts: Array.isArray(existingArtifacts) ? existingArtifacts : [],
                sourceText: sourceText || '',
                sourceFingerprint: sourceChanged ? currentSourceFingerprint
                    : ((settingsSnapshot && settingsSnapshot.sourceFingerprint) || currentSourceFingerprint || ''),
                forceRefresh: forceRefresh === true,
            });
            const resolved = matrix.resolveGenerationMatrix(row, options);
            if (resolved && Array.isArray(resolved.variants) && resolved.variants.length) {
                return {
                    available: true,
                    action: resolved.action,
                    sourceChanged,
                    reviewedSourceFingerprint,
                    currentSourceFingerprint: currentSourceFingerprint || reviewedSourceFingerprint,
                    variants: resolved.variants.map(cell => Object.assign({}, cell, {
                        explicitVariantKey: cell.explicitVariantKey !== undefined ? cell.explicitVariantKey : resolved.explicitVariantKey,
                        variantKeyDerived: cell.variantKeyDerived !== undefined ? cell.variantKeyDerived : resolved.variantKeyDerived,
                    }))
                };
            }
        } catch (_) {}
    }
    if (reviewed.length && sourceChanged) {
        return {
            available: false,
            action: forceRefresh ? 'refresh' : 'generate',
            sourceChanged: true,
            reviewedSourceFingerprint,
            currentSourceFingerprint,
            variants: reviewed.map(cell => Object.assign({}, cell, {
                action: forceRefresh ? 'refresh' : 'generate',
                generationIdentity: null,
                existingArtifactId: null,
                sourceFingerprint: currentSourceFingerprint,
                matrixUnavailable: true,
            })),
        };
    }
    return {
        available: false,
        action: forceRefresh ? 'refresh' : 'generate',
        sourceChanged,
        reviewedSourceFingerprint,
        currentSourceFingerprint: currentSourceFingerprint || reviewedSourceFingerprint,
        variants: [{
            type: row && row.type,
            action: forceRefresh ? 'refresh' : 'generate',
            generationIdentity: null,
            existingArtifactId: null,
            variantKey: null,
            grade: null,
            language: null,
            matrixUnavailable: true,
        }],
    };
};

const _blueprintVariantId = (cell, uiId, index) => String(
    (cell && (cell.generationIdentity || cell.variantId || cell.id))
    || ((cell && cell.variantKey) ? `${uiId}:${cell.variantKey}:${index}` : `${uiId}:variant-${index + 1}`)
);

const _findBlueprintArtifact = (artifacts, id) => {
    if (!id || !Array.isArray(artifacts)) return null;
    return artifacts.find(item => item && String(item.id || item.resourceId || item.artifactId || '') === String(id)) || null;
};

// Share the UDL planner's source-choice policy when that module is present.
// The fallback intentionally has the same safety property: a non-empty current
// source that differs from the latest analysis wins, so execution never uses a
// stale analyzed original behind the teacher's back.
const _resolveBlueprintSourceSelection = (options) => {
    const o = options || {};
    try {
        const udl = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.UdlChat;
        if (udl && typeof udl.resolveBlueprintSourceChoice === 'function') {
            return udl.resolveBlueprintSourceChoice(o);
        }
    } catch (_) {}
    const currentText = String(o.inputText || '').trim() ? String(o.inputText)
        : (String(o.requestedSourceText || '').trim() ? String(o.requestedSourceText) : String(o.sourceTopic || ''));
    const analysisText = String((o.latestAnalysis && o.latestAnalysis.data && o.latestAnalysis.data.originalText) || '');
    const normalize = (value) => String(value || '').trim().replace(/\s+/g, ' ');
    const divergent = !!(normalize(currentText) && normalize(analysisText) && normalize(currentText) !== normalize(analysisText));
    const useCurrent = !!normalize(currentText) && (divergent || !normalize(analysisText));
    return {
        text: useCurrent ? currentText : analysisText,
        metadata: {
            kind: 'workspace-source',
            selectedSource: useCurrent ? (String(o.inputText || '').trim() ? 'current-editor' : 'current-request')
                : (normalize(analysisText) ? 'latest-analysis' : 'none'),
            reviewedSelection: o.sourcePolicy && o.sourcePolicy.selectedSource || null,
            sourceChoiceRequired: false,
            divergentFromLatestAnalysis: divergent,
            latestAnalysisArtifactId: o.latestAnalysis && o.latestAnalysis.id || null,
            selectionReason: divergent
                ? 'Current source differs from the latest analyzed original; current source selected.'
                : 'Selected the available workspace source.'
        }
    };
};

const _applyBlueprintResultToContext = (type, resultItem, lessonDNA, setSourceText) => {
    if (!resultItem || !resultItem.data) return;
    if (type === 'analysis') {
        if (resultItem.data.originalText && typeof setSourceText === 'function') setSourceText(resultItem.data.originalText);
        if (Array.isArray(resultItem.data.concepts) && lessonDNA.concepts.length === 0) lessonDNA.concepts = resultItem.data.concepts.slice(0, 5);
    }
    if (type === 'glossary' && Array.isArray(resultItem.data) && lessonDNA.keyTerms.length === 0) {
        lessonDNA.keyTerms = resultItem.data.slice(0, 8).map(t => t.term).filter(Boolean);
    }
    if (type === 'image') lessonDNA.visualContext = resultItem.data.prompt || resultItem.data.altText || lessonDNA.visualContext;
    if (type === 'lesson-plan' && resultItem.data.essentialQuestion && !lessonDNA.essentialQuestion) lessonDNA.essentialQuestion = resultItem.data.essentialQuestion;
};

// Generation failures need to be useful in two places: the in-app diagnostics
// ring (via warnLog) and the user-facing Error Reporter (via record). The latter
// does not capture console.warn unless the teacher opts in, so unattended
// blueprint failures must record themselves explicitly.
const _redactBlueprintDiagnosticText = (value, maxLength = 8000) => {
    const raw = String(value || '');
    const clipped = raw.length > maxLength ? raw.slice(0, maxLength) + ' [truncated]' : raw;
    return clipped
        .replace(/\b(Bearer)\s+[A-Za-z0-9._~+\/=-]{6,}/gi, '$1 [REDACTED]')
        .replace(/\b(?:AIza[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9_-]{12,}|xox[baprs]-[A-Za-z0-9-]{12,})\b/g, '[REDACTED]')
        .replace(/((?:api[ _-]?key|access[ _-]?token|authorization|credential|secret|password)\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED]')
        .replace(/([?&](?:key|api_key|token|access_token)=)[^&#\s]+/gi, '$1[REDACTED]');
};

const recordBlueprintResourceFailure = (details, warnLog) => {
    const d = details || {};
    const reason = _redactBlueprintDiagnosticText(d.reason || 'unknown generation failure', 4000);
    const message = '[Blueprint] resource generation failed'
        + ' tool=' + String(d.tool || 'unknown')
        + ' uiId=' + String(d.uiId || 'unknown')
        + ' step=' + String((Number.isFinite(d.index) ? d.index + 1 : '?'))
        + ' reason=' + reason
        + ' dispatcherLoaded=' + String(d.dispatcherLoaded == null ? 'unknown' : d.dispatcherLoaded)
        + ' sourceTextChars=' + String(Number.isFinite(d.sourceTextChars) ? d.sourceTextChars : 0)
        + ' runId=' + String(d.runId || 'unknown')
        + ' elapsedMs=' + String(Number.isFinite(d.elapsedMs) ? d.elapsedMs : 0);
    try {
        if (typeof warnLog === 'function') warnLog(message);
        else if (typeof console !== 'undefined' && console.warn) console.warn(message);
    } catch (_) {}
    const stack = d.error && d.error.stack ? _redactBlueprintDiagnosticText(d.error.stack, 12000) : '';
    try {
        const reporter = typeof window !== 'undefined'
            && window.AlloModules
            && window.AlloModules.ErrorReporter;
        if (reporter && typeof reporter.record === 'function') {
            reporter.record('error', message, stack, 'blueprint-resource-generation', 0, 0);
        } else if (typeof window !== 'undefined') {
            // ErrorReporter is loaded asynchronously. Keep a small hand-off
            // queue so a fast first run is not lost before that module arrives.
            const pending = window.__alloPendingErrorReports = window.__alloPendingErrorReports || [];
            pending.push({ level: 'error', message: message, stack: stack, source: 'blueprint-resource-generation' });
            while (pending.length > 20) pending.shift();
        }
    } catch (_) {}
    return message;
};

const _blueprintProviderFailurePolicy = (failure) => {
    const module = typeof window !== 'undefined' && window.AlloModules
        ? window.AlloModules.UtilsPure : null;
    if (module && typeof module.classifyProviderError === 'function') {
        const policy = module.classifyProviderError(failure);
        return Object.assign({}, policy, {
            safe: typeof module.getProviderErrorSafeFields === 'function'
                ? module.getProviderErrorSafeFields(policy)
                : {
                    schemaVersion: 1, kind: policy.kind, category: policy.category,
                    retryable: policy.retryable === true, quotaScope: policy.quotaScope,
                    httpStatus: policy.httpStatus == null ? null : policy.httpStatus,
                    retryAfterMs: policy.retryAfterMs == null ? null : policy.retryAfterMs,
                },
        });
    }
    const err = failure && typeof failure === 'object' ? failure : {};
    const message = String(err.message || failure || '');
    const nested = err.classification && typeof err.classification === 'object' ? err.classification : {};
    const retryAfterMs = Number.isFinite(Number(err.retryAfterMs))
        ? Math.max(0, Math.min(120000, Math.ceil(Number(err.retryAfterMs))))
        : (Number.isFinite(Number(err.retryAfterSec))
            ? Math.max(0, Math.min(120000, Math.ceil(Number(err.retryAfterSec) * 1000))) : null);
    const daily = nested.perDay === true || /per[ -]?day|daily (?:quota|limit)|\brpd\b|insufficient quota|billing|credit balance/i.test(message);
    const minute = nested.perMinute === true || /per[ -]?minute|\brpm\b|\btpm\b|rate.?limit/i.test(message)
        || ((err.httpStatus === 429 || err.isQuota === true) && retryAfterMs != null);
    const quota = err.isQuota === true || err.httpStatus === 429 || /API_QUOTA_EXHAUSTED|RESOURCE_EXHAUSTED|quota|\b429\b/i.test(message);
    const abort = err.name === 'AbortError' || /abort|cancel/i.test(message);
    const auth = err.isAuth === true || err.httpStatus === 401 || err.httpStatus === 403 || /API_AUTH_FAILED|auth|api key|forbidden|permission/i.test(message);
    const config = err.isConfig === true || /API_MODEL_NOT_FOUND|not configured|not loaded|unsupported|no source/i.test(message);
    const policyBlock = /safety|policy|content blocked|generation blocked/i.test(message);
    const transient = /temporar|timeout|timed out|network|fetch|connection|502|503|504|overload/i.test(message);
    let kind = 'unknown', category = 'unknown', retryable = true, delayMs = 800, quotaScope = 'none';
    if (abort) { kind = 'abort'; category = 'configuration'; retryable = false; delayMs = 0; }
    else if (quota && daily) { kind = 'quota-daily'; category = 'configuration'; retryable = false; delayMs = 0; quotaScope = 'daily'; }
    else if (quota && minute) { kind = 'rate-limit'; category = 'transient'; retryable = true; delayMs = retryAfterMs == null ? 60000 : retryAfterMs; quotaScope = 'minute'; }
    else if (quota) { kind = 'quota-unknown'; category = 'configuration'; retryable = false; delayMs = 0; quotaScope = 'unknown'; }
    else if (auth) { kind = 'auth'; category = 'configuration'; retryable = false; delayMs = 0; }
    else if (config) { kind = 'configuration'; category = 'configuration'; retryable = false; delayMs = 0; }
    else if (policyBlock) { kind = 'policy'; category = 'configuration'; retryable = false; delayMs = 0; }
    else if (transient) { kind = 'network'; category = 'transient'; retryable = true; delayMs = retryAfterMs == null ? 1500 : retryAfterMs; }
    const safe = {
        schemaVersion: 1, kind, category, retryable, quotaScope,
        httpStatus: Number.isFinite(Number(err.httpStatus)) ? Number(err.httpStatus) : null,
        retryAfterMs,
    };
    return { kind, category, retryable, delayMs, quotaScope, httpStatus: safe.httpStatus, retryAfterMs, safe };
};

const _waitForBlueprintProviderRetry = (delayMs, signal) => new Promise((resolve, reject) => {
    let timer = null;
    const cleanup = () => { if (signal) { try { signal.removeEventListener('abort', onAbort); } catch (_) {} } };
    const onAbort = () => {
        if (timer) clearTimeout(timer);
        cleanup();
        const error = new Error('Blueprint generation aborted');
        error.name = 'AbortError';
        error.isFatal = true;
        reject(error);
    };
    if (signal && signal.aborted) return onAbort();
    if (signal) { try { signal.addEventListener('abort', onAbort, { once: true }); } catch (_) {} }
    timer = setTimeout(() => { cleanup(); resolve(); }, Math.max(0, Math.min(120000, Number(delayMs) || 0)));
});

const _isBlueprintTerminalFailure = (error, policy, retryExhausted) => {
    if (!error) return false;
    const resolved = policy || _blueprintProviderFailurePolicy(error);
    if (retryExhausted && resolved.category === 'transient') return true;
    if (['abort', 'auth', 'configuration', 'quota-daily', 'quota-unknown', 'policy'].includes(resolved.kind)) return true;
    return !!(error.isFatal && resolved.category !== 'transient');
};

const executeOneBlueprint = async (blueprint, ctx) => {
    // onStep is ADDITIVE and optional — onResource stays exactly as it was
    // because Throughline's Generate-Unit driver consumes it.
    const { handleGenerate, historyOverride, dna, initialSourceText, onResource, onStep, signal, warnLog, settingsSnapshot, runId, runStartedAt } = ctx || {};
    const emitStep = (payload) => { if (typeof onStep === 'function') { try { onStep(payload); } catch (_) {} } };
    if (!_isBlueprintGenerationMatrixReady()) {
        const blockedRows = getBlueprintResourcePlan(blueprint).map(row => row && row.uiId).filter(Boolean);
        throw _createBlueprintGenerationMatrixError({ matrixUnavailableRows: blockedRows });
    }
    // Blueprint failures used to be INVISIBLE. A row was marked 'failed' purely
    // because handleGenerate returned falsy — no exception, no capture, no log.
    // So a run where every resource failed produced a completely clean console
    // and no way to tell "the model refused" from "the dispatcher never loaded"
    // from "this tool type isn't handled". Diagnostics are not optional here:
    // this is the one path where the app does real work unattended.

    const finalResources = getBlueprintResourcePlan(blueprint);
    const lessonDNA = dna || { grade: "", topic: "", standard: "", concepts: [], keyTerms: [], visualContext: "", essentialQuestion: "" };
    const executionInstructionalContext = _resolveBlueprintInstructionalContext(blueprint, settingsSnapshot, lessonDNA);
    const executionStandardsContext = executionInstructionalContext.standardsContext
        || (settingsSnapshot && settingsSnapshot.standardsContext)
        || (blueprint && blueprint.standardsContext)
        || null;
    // Unit Path and other headless callers historically omitted the snapshot.
    // Build one from the Blueprint/DNA in that case so dispatcher resources do
    // not fall back to the ambient Universal grade.
    const executionSettingsSnapshot = settingsSnapshot || Object.freeze({
        gradeLevel: executionInstructionalContext.instructionalGrade || lessonDNA.grade || '',
        standardsInput: (executionStandardsContext && executionStandardsContext.promptText) || lessonDNA.standard || '',
        standardsContext: executionStandardsContext,
        instructionalContext: executionInstructionalContext,
    });
    // NULL, not "". This is a SENTINEL, not a default.
    //
    // handleGenerate's 4th arg is textOverride, and the dispatcher branches on
    // `if (textToProcess === null)` (generate_dispatcher_source.jsx:1582) to run
    // its own fallback chain: latest analysis originalText, else inputText.
    // An empty STRING is not null, so it skipped that fallback and fell straight
    // into `if (!textToProcess || !textToProcess.trim()) return;` (:1593) — a
    // BARE return, so every resource came back undefined and every row was
    // scored 'failed' with no error, no toast and nothing in the console.
    // A topic-only blueprint (no pasted source) failed all of its steps this way.
    let currentSourceText = initialSourceText || null;
    let currentBlueprintHistory = Array.isArray(historyOverride) ? [...historyOverride] : [];
    const items = [];
    const nulls = [];
    const failedRows = [];
    for (let i = 0; i < finalResources.length; i++) {
        if (signal && signal.aborted) break;
        // Read uiId on its OWN line: the destructure below is pinned
        // byte-for-byte across three copies by blueprint_mode_guardrails.
        const { type, directive: aiDirective = "" } = finalResources[i];
        const stepUiId = finalResources[i] && finalResources[i].uiId;
        const stepInstructionalText = _resolveBlueprintInstructionalText(
            type,
            finalResources[i] && finalResources[i].instructionalText,
            executionInstructionalContext,
            executionSettingsSnapshot.leveledTextLanguage || 'English'
        );
        const reviewedToolOverrides = executionSettingsSnapshot.toolOverrides
            && typeof executionSettingsSnapshot.toolOverrides === 'object'
            ? executionSettingsSnapshot.toolOverrides : {};
        const reviewedToolOverride = reviewedToolOverrides[type];
        const reviewedCustomInstructions = typeof reviewedToolOverride === 'string'
            ? reviewedToolOverride
            : (reviewedToolOverride && typeof reviewedToolOverride === 'object'
                ? reviewedToolOverride.customInstructions : '');
        const executionMatrix = _resolveBlueprintExecutionMatrix(
            finalResources[i], executionSettingsSnapshot, currentBlueprintHistory, currentSourceText, false
        );
        if (!executionMatrix.available) {
            const matrixError = _createBlueprintGenerationMatrixError({
                uiId: stepUiId,
                tool: type,
                matrixUnavailableRows: [stepUiId],
            });
            emitStep({
                uiId: stepUiId, tool: type, status: 'planned', index: i,
                generationMatrixUnavailable: true,
                generationMatrixStatus: 'unavailable',
                blockedReason: matrixError.reasonCode,
                retryable: true,
                resourceId: null,
                resourceIds: [],
                variantResults: [],
            });
            throw matrixError;
        }
        const executionVariants = executionMatrix.variants;
        emitStep({
            uiId: stepUiId, tool: type, status: 'running', index: i,
            instructionalText: stepInstructionalText,
            generationAction: executionMatrix.action,
            generationVariants: executionVariants,
            generationMatrixUnavailable: !executionMatrix.available,
            generationMatrixStatus: 'ready',
            sourceChanged: executionMatrix.sourceChanged === true,
            reviewedSourceFingerprint: executionMatrix.reviewedSourceFingerprint || '',
            currentSourceFingerprint: executionMatrix.currentSourceFingerprint || '',
            resourceId: null,
            resourceIds: [],
            variantResults: []
        });
        const stepConfig = Object.assign({}, executionSettingsSnapshot.generationOptions || {}, {
            customInstructions: [aiDirective, reviewedCustomInstructions]
                .map(value => String(value || '').trim()).filter(Boolean).join(' '),
            toolOverrides: reviewedToolOverrides,
            generationContext: executionSettingsSnapshot.generationContext || {},
            backend: executionSettingsSnapshot.backend || '',
            provider: executionSettingsSnapshot.provider || '',
            model: executionSettingsSnapshot.model || '',
            fallbackModel: executionSettingsSnapshot.fallbackModel || '',
            imageProvider: executionSettingsSnapshot.imageProvider || '',
            imageModel: executionSettingsSnapshot.imageModel || '',
            visionModel: executionSettingsSnapshot.visionModel || '',
            historyOverride: currentBlueprintHistory,
            lessonDNA: lessonDNA,
            standardsContext: executionStandardsContext,
            instructionalContext: executionInstructionalContext,
            instructionalText: stepInstructionalText,
            // A blueprint is already a batch. Without this, a leveled-text step
            // with a differentiation range set entered the dispatcher's per-grade
            // fan-out, whose outer call returns undefined — so the row was marked
            // FAILED while its differentiated texts landed in history. Full Pack
            // sets the same flag for the same reason.
            skipDifferentiation: true,
            // The dispatcher's catch swallows generation errors (toast + banner,
            // no rethrow), which this runner could only record as "returned no
            // resource (it did not throw)" — hiding safety blocks and throttle
            // failures behind copy that guesses "no source text". With this flag
            // the dispatcher rethrows after its own UI handling, so failReason
            // carries the real message.
            rethrowErrors: true
        });
        // Activities redesign (2026-08-16): forward a brainstorm step's activity
        // mode into the dispatcher's configOverride. Guarded on the tool so a
        // stray field on another row type cannot change behavior.
        if (type === 'brainstorm' && finalResources[i].activityMode) {
            stepConfig.activityMode = finalResources[i].activityMode;
            if (finalResources[i].activityConfig) stepConfig.activityConfig = finalResources[i].activityConfig;
        }
        // The standards audit is post-hoc: it audits whatever it can find. Left
        // to itself, selectCurriculumArtifacts GUESSES its own scope — by
        // curriculumId, else a "latest analysis anchor" heuristic, else every
        // eligible item in history, and it emits a warning saying so. But a
        // blueprint run knows EXACTLY what it produced. Hand it that list so the
        // report scopes to this plan (selectionMode: 'explicit artifact IDs')
        // instead of to whatever else happens to be in the workspace.
        const auditScopeIds = (type === 'alignment-report')
            ? items.map(function (it) { return it && it.id; }).filter(Boolean)
            : null;
        if (auditScopeIds && auditScopeIds.length) stepConfig.artifactIds = auditScopeIds;
        let resultItem = null;
        let failReason = null;
        const variantResults = [];
        const generatedRowItems = [];
        const variantFailures = [];
        for (let variantIndex = 0; variantIndex < executionVariants.length; variantIndex++) {
            if (signal && signal.aborted) break;
            const variant = executionVariants[variantIndex] || {};
            const variantId = _blueprintVariantId(variant, stepUiId, variantIndex);
            const reviewedAction = variant.action || executionMatrix.action || 'generate';
            let action = reviewedAction;
            let runtimeReason = null;
            let variantItem = null;
            let variantError = null;
            let variantFailure = null;
            let variantFailurePolicy = null;
            let variantAttempts = 0;
            let variantRetryExhausted = false;
            if (action === 'reuse') {
                variantItem = _findBlueprintArtifact(currentBlueprintHistory, variant.existingArtifactId);
                if (!variantItem) {
                    // The reviewed identity is still useful, but its target may
                    // have been deleted between review and execution. Generate
                    // that exact cell instead of failing the whole row or
                    // silently looking up an ambient replacement.
                    action = 'generate';
                    runtimeReason = 'Reviewed reusable artifact was missing; generated the reviewed variant instead.';
                }
            }
            if (!variantItem && action !== 'reuse') {
                const variantConfig = Object.assign({}, stepConfig, {
                    generationMatrixManaged: executionMatrix.available,
                    generationMatrixUnavailable: !executionMatrix.available,
                    generationIdentity: variant.generationIdentity || null,
                    generationAction: action,
                    generationVariant: Object.assign({}, variant, { action: action, runtimeReason: runtimeReason }),
                    variantKey: variant.variantKey || null,
                    explicitVariantKey: variant.explicitVariantKey || null,
                    variantKeyDerived: variant.variantKeyDerived === true,
                    sourceFingerprint: variant.sourceFingerprint || executionSettingsSnapshot.sourceFingerprint || '',
                    contextFingerprint: variant.contextFingerprint || executionSettingsSnapshot.contextFingerprint || '',
                    contextInputsFingerprint: variant.contextInputsFingerprint || executionSettingsSnapshot.contextInputsFingerprint || '',
                    contextFingerprintDerived: variant.contextFingerprintDerived === true || executionSettingsSnapshot.contextFingerprintDerived === true,
                    generationConfig: variant.generationConfig || finalResources[i].generationConfig || null,
                    generationConfigFingerprint: variant.generationConfigFingerprint || finalResources[i].generationConfigFingerprint || '',
                });
                if (variant.grade) variantConfig.grade = variant.grade;
                const runVariantGeneration = () => handleGenerate(
                    type,
                    variant.language || null,
                    i < finalResources.length - 1 || variantIndex < executionVariants.length - 1,
                    currentSourceText,
                    variantConfig,
                    false,
                    executionSettingsSnapshot
                );
                try {
                    variantAttempts = 1;
                    variantItem = await runVariantGeneration();
                    if (!variantItem) variantFailure = 'handleGenerate returned no resource (it did not throw)';
                } catch (err) {
                    variantError = err;
                    variantFailure = 'threw: ' + ((err && (err.message || err.name)) || String(err));
                    variantFailurePolicy = _blueprintProviderFailurePolicy(err);
                    if (variantFailurePolicy.retryable && variantFailurePolicy.category === 'transient'
                        && !(signal && signal.aborted)) {
                        try {
                            if (typeof warnLog === 'function') warnLog('[Blueprint] retrying provider-transient failure'
                                + ' tool=' + type + ' uiId=' + stepUiId + ' variant=' + variantId
                                + ' afterMs=' + variantFailurePolicy.delayMs + ' kind=' + variantFailurePolicy.kind);
                        } catch (_) {}
                        try {
                            await _waitForBlueprintProviderRetry(variantFailurePolicy.delayMs, signal);
                            variantAttempts = 2;
                            variantItem = await runVariantGeneration();
                            if (!variantItem) variantFailure = 'handleGenerate retry returned no resource (it did not throw)';
                            else {
                                variantError = null;
                                variantFailure = null;
                                variantFailurePolicy = null;
                            }
                        } catch (retryError) {
                            variantAttempts = 2;
                            variantRetryExhausted = true;
                            variantError = retryError;
                            variantFailure = 'threw after retry: ' + ((retryError && (retryError.message || retryError.name)) || String(retryError));
                            variantFailurePolicy = _blueprintProviderFailurePolicy(retryError);
                        }
                    }
                }
            }
            if (variantItem) {
                // Reuse returns the exact stored artifact object. Identity and
                // action belong to the reviewed cell/run record; cloning a
                // reused item breaks workspace linkage without adding data.
                if (action !== 'reuse') {
                    variantItem = Object.assign({}, variantItem, {
                        instructionalText: variantItem.instructionalText || stepInstructionalText,
                        generationIdentity: variant.generationIdentity || variantItem.generationIdentity || null,
                        generationAction: action,
                        variantKey: variant.variantKey || variantItem.variantKey || null,
                        explicitVariantKey: variant.explicitVariantKey || variantItem.explicitVariantKey || null,
                        variantKeyDerived: variant.variantKeyDerived === true,
                        sourceFingerprint: variant.sourceFingerprint || variantItem.sourceFingerprint || executionSettingsSnapshot.sourceFingerprint || '',
                        gradeLevel: variant.grade || variantItem.gradeLevel,
                        language: variant.language || variantItem.language,
                    });
                }
                generatedRowItems.push(variantItem);
                variantResults.push({
                    variantId,
                    generationIdentity: variant.generationIdentity || null,
                    action,
                    reviewedAction,
                    status: 'landed',
                    resourceId: variantItem.id || variantItem.resourceId || variantItem.artifactId || null,
                    artifactId: variantItem.id || variantItem.resourceId || variantItem.artifactId || null,
                    existingArtifactId: variant.existingArtifactId || null,
                    variantKey: variant.variantKey || null,
                    grade: variant.grade || null,
                    language: variant.language || null,
                    reason: runtimeReason || undefined,
                    attempts: variantAttempts,
                });
            } else {
                variantFailurePolicy = variantFailurePolicy || (variantError ? _blueprintProviderFailurePolicy(variantError) : null);
                variantFailures.push({
                    variantId, action, reviewedAction, reason: variantFailure, error: variantError, variant,
                    attempts: variantAttempts,
                    retryExhausted: variantRetryExhausted,
                    failurePolicy: variantFailurePolicy,
                    providerError: variantFailurePolicy && variantFailurePolicy.safe || null,
                });
                variantResults.push({
                    variantId,
                    generationIdentity: variant.generationIdentity || null,
                    action,
                    reviewedAction,
                    status: 'failed',
                    resourceId: null,
                    artifactId: null,
                    existingArtifactId: variant.existingArtifactId || null,
                    variantKey: variant.variantKey || null,
                    grade: variant.grade || null,
                    language: variant.language || null,
                    reason: variantFailure,
                    attempts: variantAttempts,
                    retryable: !!(variantFailurePolicy && variantFailurePolicy.retryable),
                    failureKind: variantFailurePolicy && variantFailurePolicy.kind || 'unknown',
                    quotaScope: variantFailurePolicy && variantFailurePolicy.quotaScope || 'none',
                    providerError: variantFailurePolicy && variantFailurePolicy.safe || null,
                });
            }
        }
        if (variantResults.length < executionVariants.length) {
            const completedVariantCount = variantResults.length;
            executionVariants.slice(completedVariantCount).forEach((variant, offset) => {
                const variantIndex = completedVariantCount + offset;
                variantResults.push({
                    variantId: _blueprintVariantId(variant, stepUiId, variantIndex),
                    generationIdentity: variant && variant.generationIdentity || null,
                    action: variant && (variant.action || executionMatrix.action) || 'generate',
                    reviewedAction: variant && (variant.action || executionMatrix.action) || 'generate',
                    status: 'interrupted',
                    resourceId: null,
                    artifactId: null,
                    existingArtifactId: variant && variant.existingArtifactId || null,
                    variantKey: variant && variant.variantKey || null,
                    grade: variant && variant.grade || null,
                    language: variant && variant.language || null,
                    reason: 'Generation stopped before this variant started.',
                });
            });
        }
        resultItem = generatedRowItems[0] || null;
        failReason = variantFailures.map(f => f.reason).filter(Boolean).join(' | ') || null;
        const runtimeActionRank = { reuse: 0, variant: 1, generate: 2, refresh: 3 };
        const runtimeGenerationAction = variantResults.reduce((selected, cell) =>
            (runtimeActionRank[cell.action] || 0) > (runtimeActionRank[selected] || 0) ? cell.action : selected,
        'reuse');
        if (variantFailures.length) {
            // Name the three things that actually distinguish the causes: which
            // row, why, and whether the dispatcher module is even present (a
            // missing GenDispatcher nulls EVERY row and is otherwise silent).
            let dispatcherLoaded = 'unknown';
            try { dispatcherLoaded = String(!!(typeof window !== 'undefined' && window.AlloModules && window.AlloModules.GenDispatcher)); } catch (_) {}
            variantFailures.forEach((failure) => recordBlueprintResourceFailure({
                tool: type,
                uiId: stepUiId,
                index: i,
                reason: `${failure.reason} [variant ${failure.variantId}]`,
                error: failure.error,
                dispatcherLoaded: dispatcherLoaded,
                sourceTextChars: currentSourceText ? currentSourceText.length : 0,
                runId,
                elapsedMs: Number.isFinite(runStartedAt) ? Math.max(0, Date.now() - runStartedAt) : 0,
            }, warnLog));
        }
        const successfulVariantCount = variantResults.filter(v => v.status === 'landed').length;
        const failedVariantCount = variantResults.filter(v => v.status === 'failed').length;
        const interruptedVariantCount = variantResults.filter(v => v.status === 'interrupted').length;
        emitStep({ uiId: stepUiId, tool: type, index: i,
                   status: resultItem
                       ? ((failedVariantCount || interruptedVariantCount) ? 'partial' : 'landed')
                       : (interruptedVariantCount ? 'interrupted' : 'failed'),
                   resourceId: (resultItem && (resultItem.id || resultItem.resourceId || resultItem.artifactId)) || null,
                   resourceIds: variantResults.map(v => v.resourceId).filter(Boolean),
                   successfulVariantCount,
                   failedVariantCount,
                   interruptedVariantCount,
                   instructionalText: stepInstructionalText,
                   generationAction: runtimeGenerationAction,
                   reviewedGenerationAction: executionMatrix.action,
                   generationVariants: executionVariants,
                   generationMatrixUnavailable: !executionMatrix.available,
                   generationMatrixStatus: 'ready',
                   sourceChanged: executionMatrix.sourceChanged === true,
                   reviewedSourceFingerprint: executionMatrix.reviewedSourceFingerprint || '',
                   currentSourceFingerprint: executionMatrix.currentSourceFingerprint || '',
                   variantResults,
                   // Carried into the run record so the card can SHOW why a row
                   // failed instead of only that it did.
                   failReason: variantFailures.length ? failReason : undefined,
                   // Carried so the run record can answer "which rows does the
                   // current audit actually cover?" — the basis for per-row
                   // staleness once a row is later regenerated.
                   auditScopeIds: (resultItem && auditScopeIds) ? auditScopeIds : undefined });
        if (resultItem) {
            items.push(resultItem);
            if (!_findBlueprintArtifact(currentBlueprintHistory, resultItem.id || resultItem.resourceId || resultItem.artifactId)) {
                currentBlueprintHistory.push(resultItem);
            }
            if (resultItem.data) {
                if (type === 'analysis') {
                    if (resultItem.data.originalText) {
                        currentSourceText = resultItem.data.originalText;
                    }
                    if (Array.isArray(resultItem.data.concepts) && lessonDNA.concepts.length === 0) {
                        lessonDNA.concepts = resultItem.data.concepts.slice(0, 5);
                    }
                }
                if (type === 'glossary' && Array.isArray(resultItem.data) && lessonDNA.keyTerms.length === 0) {
                    lessonDNA.keyTerms = resultItem.data.slice(0, 8).map(t => t.term).filter(Boolean);
                }
                if (type === 'image') {
                    lessonDNA.visualContext = resultItem.data.prompt || resultItem.data.altText || lessonDNA.visualContext;
                }
                if (type === 'lesson-plan' && resultItem.data.essentialQuestion && !lessonDNA.essentialQuestion) {
                    lessonDNA.essentialQuestion = resultItem.data.essentialQuestion;
                }
            }
            if (typeof onResource === 'function') { try { onResource(type, resultItem); } catch (_) {} }
            generatedRowItems.slice(1).forEach((additionalItem) => {
                items.push(additionalItem);
                const additionalId = additionalItem.id || additionalItem.resourceId || additionalItem.artifactId;
                if (!_findBlueprintArtifact(currentBlueprintHistory, additionalId)) currentBlueprintHistory.push(additionalItem);
                _applyBlueprintResultToContext(type, additionalItem, lessonDNA, (text) => { currentSourceText = text; });
                if (typeof onResource === 'function') { try { onResource(type, additionalItem); } catch (_) {} }
            });
        } else {
            // nulls stays a flat tool-name list for the existing toast/callers;
            // failedRows is the row-accurate record ("which image failed").
            variantFailures.forEach((failure) => {
                nulls.push(type);
                failedRows.push({
                    uiId: stepUiId, tool: type, index: i, variantId: failure.variantId,
                    action: failure.action, reason: failure.reason, attempts: failure.attempts,
                    retryable: !!(failure.failurePolicy && failure.failurePolicy.retryable),
                    failureKind: failure.failurePolicy && failure.failurePolicy.kind || 'unknown',
                    quotaScope: failure.failurePolicy && failure.failurePolicy.quotaScope || 'none',
                    providerError: failure.providerError || null,
                });
            });
            // Resource-specific parse/shape failures should not strand the rest
            // of a plan. Preserve abort semantics for errors that make every
            // following step unsafe or impossible: cancellation, auth, quota,
            // safety/policy blocks, missing modules, and explicit fatal errors.
            const terminalFailure = variantFailures.find((failure) => _isBlueprintTerminalFailure(
                failure.error, failure.failurePolicy, failure.retryExhausted
            ));
            if (terminalFailure) throw terminalFailure.error;
        }
        if (resultItem && variantFailures.length) {
            variantFailures.forEach((failure) => {
                nulls.push(type);
                failedRows.push({
                    uiId: stepUiId, tool: type, index: i, variantId: failure.variantId,
                    action: failure.action, reason: failure.reason, attempts: failure.attempts,
                    retryable: !!(failure.failurePolicy && failure.failurePolicy.retryable),
                    failureKind: failure.failurePolicy && failure.failurePolicy.kind || 'unknown',
                    quotaScope: failure.failurePolicy && failure.failurePolicy.quotaScope || 'none',
                    providerError: failure.providerError || null,
                });
            });
            const fatalFailure = variantFailures.find((failure) => _isBlueprintTerminalFailure(
                failure.error, failure.failurePolicy, failure.retryExhausted
            ));
            if (fatalFailure) throw fatalFailure.error;
        }
        if (i < finalResources.length - 1) await new Promise(r => setTimeout(r, 1000));
    }
    return { items: items, dnaOut: lessonDNA, nulls: nulls, failedRows: failedRows, finalSourceText: currentSourceText };
};

// Re-entrancy guard for handleExecuteBlueprint. Was implicit: the handler
// nulled activeBlueprint before running, so a second click found nothing to
// execute. The plan now survives execution (so the teacher can watch its rows),
// which removes that accidental protection.
let _blueprintRunInFlight = false;
// ── Stop button plumbing (2026-07-29) ──
// executeOneBlueprint has accepted a cooperative abort `signal` since Stage 3,
// and its loop checks it between steps — but nothing ever CREATED a controller,
// so the capability was dead. With Cancel correctly disabled mid-run, a teacher
// who started a nine-step plan with the wrong source had NO exit for up to
// ~2 minutes per step. Module-scoped for the same reason as the mutex above:
// this is about THE run in flight, and the card's Stop handler has no access to
// the executing closure.
let _blueprintAbortCtl = null;
const handleStopBlueprintRun = () => {
    // Aborting is safe at any time: between steps the loop breaks; during a
    // step the abort lands after the current resource settles (cooperative),
    // which is why the UI copy says "stopping after this step".
    try { if (_blueprintAbortCtl) _blueprintAbortCtl.abort(); } catch (_) {}
    return !!_blueprintAbortCtl;
};
const handleExecuteBlueprint = async (deps) => {
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, standardsInput, targetStandards, dokLevel, useEmojis, rosterKey, sessionData, user, appId, activeSessionAppId, activeSessionCode, studentNickname, sourceLength, sourceTone, textFormat, differentiationRange, differentiationTypes, differentiationCustomGrades, fullPackTargetGroup, isAutoConfigEnabled, resourceCount, creativeMode, noText, fillInTheBlank, imageGenerationStyle, imageAspectRatio, useLowQualityVisuals, autoRemoveWords, globalPoints, wizardData, isWizardOpen, standardsLookupRegion, standardsLookupGoal, pdfFixResult, showExportPreview, aiStandardQuery, aiStandardRegion, imageRefinementInput, activeBlueprint, ai, webSearchProvider, alloBotRef, pdfPreviewRef, exportPreviewRef, setError, setIsProcessing, setGenerationStep, setGeneratedContent, setHistory, setActiveView, setActiveSessionCode, setActiveSessionAppId, setStudentNickname, setIsWizardOpen, setShowSourceGen, setSourceTopic, setSourceCustomInstructions, setSourceLength, setSourceTone, setTextFormat, setSelectedLanguages, setGradeLevel, setStandardsInput, setTargetStandards, setDokLevel, setStudentInterests, setSuggestedStandards, setIsLookingUpStandards, setStandardsLookupGoal, setStandardsLookupRegion, setExpandedTools, setShowUDLGuide, setUdlMessages, setGuidedFlowState, setIsRefiningImage, setShowImageRefineModal, setIsExecutingBlueprint, setBlueprintExecutionResult, setShowExportPreview, setInputText, setIsTeacherMode, setIsParentMode, setIsIndependentMode, setActiveSidebarTab, setDoc, setSessionData, setShowSessionModal, setImageRefinementInput, setIsFindingStandards, setShowWizard, setSourceLevel, setSourceVocabulary, setIncludeSourceCitations, setLeveledTextLanguage, setActiveBlueprint, setPersistedLessonDNA, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, flyToElement, getDefaultTitle, storageDB, updateDoc, doc, db, playSound, playAdventureEventSound, generateSessionCode, stripUndefined, uploadSessionAssets, safeSetItem, handleGenerateSource, applyDetailedAutoConfig, handleGenerate, fileInputRef } = deps;
  const translationMode = deps && deps.translationMode;
  const universalImageStyle = deps && deps.universalImageStyle;
  const currentGenerationConfigSnapshot = deps && deps.generationConfigSnapshot
    && typeof deps.generationConfigSnapshot === 'object' ? deps.generationConfigSnapshot : {};
  try { if (window._DEBUG_PHASE_O) console.log("[PhaseO] handleExecuteBlueprint fired"); } catch(_) {}
    if (!activeBlueprint) return;
    const finalResources = getBlueprintResourcePlan(activeBlueprint);
    if (finalResources.length === 0) {
        addToast("This blueprint does not include any resources yet.", "error");
        return;
    }
    const _plannedGenerationSummary = finalResources.reduce((summary, row) => {
        const variants = Array.isArray(row && row.generationVariants) && row.generationVariants.length
            ? row.generationVariants : [{ action: row && row.generationAction || 'generate' }];
        summary.variantCount += variants.length;
        variants.forEach((variant) => {
            if (variant && variant.action === 'reuse') summary.reuseCount += 1;
            else summary.expectedCalls += 1;
        });
        return summary;
    }, { rowCount: finalResources.length, variantCount: 0, expectedCalls: 0, reuseCount: 0 });
    // Re-entrancy: nulling activeBlueprint used to BE the guard (a second
    // click found nothing to run). The plan now survives execution so the
    // teacher can watch it, which removes that accidental protection — and the
    // chat's execute path bypasses any disabled button. Guard explicitly.
    // Module-scoped rather than deps.isProcessing: the VALUE isProcessing is not
    // in this handler's deps (only setIsProcessing is), so reading it would be a
    // ReferenceError. A module flag is also the more precise guard — this is
    // about concurrent invocations of THIS handler, not global busy-ness.
    //
    // ORDER IS LOAD-BEARING: this check must precede every host setter below.
    // It used to sit after applyDetailedAutoConfig, which fires ~18 setters, so
    // a REJECTED second click had already overwritten the RUNNING plan's
    // generation config (grade, tone, counts, styles) before it returned. The
    // guard is only a guard if nothing irreversible happens above it.
    if (_blueprintRunInFlight) { addToast(t('blueprint.already_running') || 'That plan is already generating.', 'info'); return; }
    if (!_isBlueprintGenerationMatrixReady()) {
        const blockedAt = new Date().toISOString();
        const blockedRunId = 'blueprint-matrix-waiting-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
        const matrixUnavailableRows = [];
        const blockedRows = {};
        finalResources.forEach((row, index) => {
            const uiId = (row && row.uiId) || (String(row && row.type) + '-' + index);
            matrixUnavailableRows.push(uiId);
            blockedRows[uiId] = {
                uiId,
                tool: row && row.type,
                status: 'planned',
                index,
                generationAction: row && row.generationAction,
                generationVariants: row && Array.isArray(row.generationVariants) ? row.generationVariants.map(cell => ({ ...cell })) : [],
                generationMatrixUnavailable: true,
                generationMatrixStatus: 'unavailable',
                blockedReason: 'generation-matrix-unavailable',
                retryable: true,
                resourceId: null,
                resourceIds: [],
                variantResults: [],
            };
        });
        const blockedRun = {
            runId: blockedRunId,
            status: 'waiting',
            startedAt: blockedAt,
            finishedAt: blockedAt,
            done: true,
            retryable: true,
            reasonCode: 'generation-matrix-unavailable',
            generationMatrixUnavailable: true,
            generationMatrixStatus: 'unavailable',
            generationMatrixGuarantees: { exactDedupe: false, exactFanOut: false, dispatchBlocked: true },
            matrixUnavailableRows,
            generationSummary: Object.assign({}, _plannedGenerationSummary, { exact: false }),
            rows: blockedRows,
        };
        if (typeof setBlueprintExecutionResult === 'function') setBlueprintExecutionResult(blockedRun);
        if (typeof setIsExecutingBlueprint === 'function') setIsExecutingBlueprint(false);
        const loadingMessage = t('blueprint.matrix_unavailable_retry')
            || 'Generation planning is still loading. No resources were generated; choose Generate again to retry.';
        try { if (typeof warnLog === 'function') warnLog('[Blueprint] generation blocked: Generation Matrix module unavailable; no resource calls were made.'); } catch (_) {}
        try { if (typeof addToast === 'function') addToast(loadingMessage, 'warning'); } catch (_) {}
        if (typeof setUdlMessages === 'function') {
            setUdlMessages(prev => [...prev, { role: 'model', text: loadingMessage }]);
        }
        return blockedRun;
    }
    _blueprintRunInFlight = true;
    if (activeBlueprint.globalSettings) {
        if (activeBlueprint.globalSettings.gradeLevel) setGradeLevel(activeBlueprint.globalSettings.gradeLevel);
        if (activeBlueprint.globalSettings.tone) setSourceTone(activeBlueprint.globalSettings.tone);
    }
    applyDetailedAutoConfig(activeBlueprint);
    // React setters above are asynchronous. Freeze the values used by this
    // run so Universal Settings cannot change between plan approval and the
    // first request, or leak into a later request while the run is active.
    const _globalSettings = activeBlueprint.globalSettings || {};
    const _ambientImageGenerationStyle = imageGenerationStyle !== undefined && imageGenerationStyle !== null
        ? imageGenerationStyle : universalImageStyle;
    const _reviewedImageGenerationStyle = _globalSettings.imageGenerationStyle !== undefined && _globalSettings.imageGenerationStyle !== null
        ? _globalSettings.imageGenerationStyle
        : (_globalSettings.universalImageStyle !== undefined && _globalSettings.universalImageStyle !== null
            ? _globalSettings.universalImageStyle : _ambientImageGenerationStyle);
    const _blueprintInstructionalContext = _resolveBlueprintInstructionalContext(activeBlueprint, null, {
        grade: _globalSettings.gradeLevel || gradeLevel,
        standard: activeBlueprint.standards || standardsInput || '',
    });
    const _blueprintStandardsContext = _blueprintInstructionalContext.standardsContext
        || activeBlueprint.standardsContext || null;
    const _reviewedGenerationOptions = _globalSettings.generationOptions
        && typeof _globalSettings.generationOptions === 'object' ? Object.assign({}, _globalSettings.generationOptions) : {};
    const _reviewedToolOverrides = _globalSettings.toolOverrides
        && typeof _globalSettings.toolOverrides === 'object'
        ? Object.fromEntries(Object.entries(_globalSettings.toolOverrides).map(([type, value]) => [type,
            value && typeof value === 'object' ? Object.assign({}, value) : value]))
        : {};
    const _currentProvider = currentGenerationConfigSnapshot.provider
        && typeof currentGenerationConfigSnapshot.provider === 'object'
        ? currentGenerationConfigSnapshot.provider : {};
    const _blueprintSettingsSnapshot = Object.freeze({
        ..._reviewedGenerationOptions,
        gradeLevel: _blueprintInstructionalContext.instructionalGrade || _globalSettings.gradeLevel || gradeLevel,
        primaryLanguage: _globalSettings.primaryLanguage || _globalSettings.language || _globalSettings.leveledTextLanguage || leveledTextLanguage,
        language: _globalSettings.primaryLanguage || _globalSettings.language || _globalSettings.leveledTextLanguage || leveledTextLanguage,
        leveledTextLanguage: _globalSettings.primaryLanguage || _globalSettings.language || _globalSettings.leveledTextLanguage || leveledTextLanguage,
        selectedLanguages: Object.freeze(Array.isArray(_globalSettings.selectedLanguages)
            ? _globalSettings.selectedLanguages.slice()
            : (Array.isArray(selectedLanguages) ? selectedLanguages.slice() : [])),
        translationMode: _globalSettings.translationMode !== undefined ? _globalSettings.translationMode : translationMode,
        currentUiLanguage: _globalSettings.currentUiLanguage !== undefined ? _globalSettings.currentUiLanguage : currentUiLanguage,
        translationTargetChoices: Object.freeze(Array.isArray(_globalSettings.translationTargetChoices) ? _globalSettings.translationTargetChoices.slice() : []),
        resolvedTranslationTarget: _globalSettings.resolvedTranslationTarget === undefined ? null : _globalSettings.resolvedTranslationTarget,
        studentInterests: Array.isArray(_globalSettings.studentInterests)
            ? Object.freeze(_globalSettings.studentInterests.slice())
            : (Array.isArray(studentInterests) ? Object.freeze(studentInterests.slice()) : studentInterests),
        standardsInput: (_blueprintStandardsContext && _blueprintStandardsContext.promptText)
            || activeBlueprint.standards || standardsInput,
        standardsContext: _blueprintStandardsContext,
        standardsFingerprint: (_blueprintInstructionalContext && _blueprintInstructionalContext.standardsFingerprint)
            || _globalSettings.standardsFingerprint || '',
        contextFingerprint: _globalSettings.contextFingerprint || '',
        contextInputsFingerprint: _globalSettings.contextInputsFingerprint || '',
        contextFingerprintDerived: _globalSettings.contextFingerprintDerived === true || !!_globalSettings.contextInputsFingerprint,
        sourceFingerprint: _globalSettings.sourceFingerprint || '',
        sourceArtifactId: _globalSettings.sourceArtifactId || '',
        instructionalContext: _blueprintInstructionalContext,
        targetStandards: Object.freeze(Array.isArray(_globalSettings.targetStandards)
            ? _globalSettings.targetStandards.slice()
            : (Array.isArray(targetStandards) ? targetStandards.slice() : [])),
        dokLevel: _globalSettings.dokLevel || dokLevel,
        useEmojis: _globalSettings.useEmojis === undefined ? useEmojis : _globalSettings.useEmojis,
        textFormat: _globalSettings.textFormat || textFormat,
        imageGenerationStyle: _reviewedImageGenerationStyle,
        universalImageStyle: _reviewedImageGenerationStyle,
        imageAspectRatio: _globalSettings.imageAspectRatio || imageAspectRatio,
        generationOptions: Object.freeze(_reviewedGenerationOptions),
        toolOverrides: Object.freeze(_reviewedToolOverrides),
        generationContext: _globalSettings.generationContext && typeof _globalSettings.generationContext === 'object'
            ? Object.freeze(Object.assign({}, _globalSettings.generationContext)) : Object.freeze({}),
        // Provider/model are special: unlike educator settings, the active
        // runtime cannot safely be forced back to a disconnected provider.
        // Resolve the matrix against what will actually answer this call.
        backend: _currentProvider.backend || _globalSettings.backend || '',
        provider: _currentProvider.provider || _globalSettings.provider || _currentProvider.backend || '',
        model: _currentProvider.model || _globalSettings.model || '',
        fallbackModel: _currentProvider.fallbackModel || _globalSettings.fallbackModel || '',
        imageProvider: _currentProvider.imageProvider || _globalSettings.imageProvider || '',
        imageModel: _currentProvider.imageModel || _globalSettings.imageModel || '',
        visionModel: _currentProvider.visionModel || _globalSettings.visionModel || '',
        differentiationRange: _globalSettings.differentiationRange !== undefined ? _globalSettings.differentiationRange : differentiationRange,
        differentiationGrades: Object.freeze(Array.isArray(_globalSettings.differentiationGrades) ? _globalSettings.differentiationGrades.slice() : []),
        differentiationTypes: Object.freeze(Array.isArray(_globalSettings.differentiationTypes)
            ? _globalSettings.differentiationTypes.slice()
            : (Array.isArray(differentiationTypes) ? differentiationTypes.slice() : [])),
        differentiationCustomGrades: Object.freeze(Array.isArray(_globalSettings.differentiationCustomGrades)
            ? _globalSettings.differentiationCustomGrades.slice()
            : (Array.isArray(differentiationCustomGrades) ? differentiationCustomGrades.slice() : [])),
    });
    const _settingsDrift = [];
    const _sameSetting = (a, b) => JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);
    [
        ['gradeLevel', gradeLevel, _blueprintSettingsSnapshot.gradeLevel],
        ['language', leveledTextLanguage, _blueprintSettingsSnapshot.leveledTextLanguage],
        ['selectedLanguages', Array.isArray(selectedLanguages) ? selectedLanguages : [], _blueprintSettingsSnapshot.selectedLanguages],
        ['studentInterests', Array.isArray(studentInterests) ? studentInterests : studentInterests, _blueprintSettingsSnapshot.studentInterests],
        ['targetStandards', Array.isArray(targetStandards) ? targetStandards : [], _blueprintSettingsSnapshot.targetStandards],
        ['translationMode', translationMode, _blueprintSettingsSnapshot.translationMode],
        ['currentUiLanguage', currentUiLanguage, _blueprintSettingsSnapshot.currentUiLanguage],
        ['differentiationRange', differentiationRange, _blueprintSettingsSnapshot.differentiationRange],
        ['differentiationTypes', Array.isArray(differentiationTypes) ? differentiationTypes : [], _blueprintSettingsSnapshot.differentiationTypes],
        ['differentiationCustomGrades', Array.isArray(differentiationCustomGrades) ? differentiationCustomGrades : [], _blueprintSettingsSnapshot.differentiationCustomGrades],
        ['dokLevel', dokLevel, _blueprintSettingsSnapshot.dokLevel],
        ['useEmojis', useEmojis, _blueprintSettingsSnapshot.useEmojis],
        ['textFormat', textFormat, _blueprintSettingsSnapshot.textFormat],
        ['imageGenerationStyle', _ambientImageGenerationStyle, _blueprintSettingsSnapshot.imageGenerationStyle],
        ['imageAspectRatio', imageAspectRatio, _blueprintSettingsSnapshot.imageAspectRatio],
        ['toolOverrides', currentGenerationConfigSnapshot.canonical?.fields?.toolOverrides || currentGenerationConfigSnapshot.toolOverrides || {}, _blueprintSettingsSnapshot.toolOverrides],
        ['generationOptions', currentGenerationConfigSnapshot.toolOptions || {}, _blueprintSettingsSnapshot.generationOptions],
        ['backend', _currentProvider.backend || '', _globalSettings.backend || ''],
        ['provider', _currentProvider.provider || '', _globalSettings.provider || ''],
        ['model', _currentProvider.model || '', _globalSettings.model || ''],
        ['fallbackModel', _currentProvider.fallbackModel || '', _globalSettings.fallbackModel || ''],
        ['imageProvider', _currentProvider.imageProvider || '', _globalSettings.imageProvider || ''],
        ['imageModel', _currentProvider.imageModel || '', _globalSettings.imageModel || ''],
        ['visionModel', _currentProvider.visionModel || '', _globalSettings.visionModel || ''],
    ].forEach(([field, ambient, reviewed]) => { if (!_sameSetting(ambient, reviewed)) _settingsDrift.push(field); });
    const lessonDNA = {
        grade: _blueprintInstructionalContext.instructionalGrade || activeBlueprint.globalSettings?.gradeLevel || gradeLevel,
        topic: sourceTopic || "",
        standard: (_blueprintStandardsContext && _blueprintStandardsContext.promptText)
            || activeBlueprint.standards || standardsInput || "",
        concepts: Array.isArray(activeBlueprint.lessonDNA?.goldenThread) ? activeBlueprint.lessonDNA.goldenThread : [],
        keyTerms: Array.isArray(activeBlueprint.lessonDNA?.keyTerms) ? activeBlueprint.lessonDNA.keyTerms : [],
        visualContext: "",
        essentialQuestion: activeBlueprint.lessonDNA?.essentialQuestion || "",
    };
    const _latestAnalysis = (Array.isArray(history) ? history : []).slice().reverse()
        .find(h => h && h.type === 'analysis' && h.data && h.data.originalText);
    const _sourceSelection = _resolveBlueprintSourceSelection({
        inputText,
        requestedSourceText: inputText || sourceTopic,
        sourceTopic,
        sourceOrigin: String(inputText || '').trim() ? 'current-editor' : 'current-topic',
        latestAnalysis: _latestAnalysis,
        sourcePolicy: activeBlueprint.sourcePolicy || null,
    });
    // Seed one row per plan entry so the board shows the whole plan as
    // 'planned' immediately, rather than materialising rows as they start.
    const _runRows = {};
    finalResources.forEach((r, i) => {
        const key = (r && r.uiId) || (String(r && r.type) + '-' + i);
        _runRows[key] = {
            uiId: key,
            tool: r && r.type,
            status: 'planned',
            index: i,
            generationAction: r && r.generationAction,
            generationVariants: r && Array.isArray(r.generationVariants) ? r.generationVariants.map(v => ({ ...v })) : [],
            explicitVariantKey: r && r.explicitVariantKey,
            variantKeyDerived: !!(r && r.variantKeyDerived),
            variantCount: r && Array.isArray(r.generationVariants) && r.generationVariants.length ? r.generationVariants.length : 1,
            expectedCalls: r && Array.isArray(r.generationVariants)
                ? r.generationVariants.filter(v => v && v.action !== 'reuse').length
                : (r && r.generationAction === 'reuse' ? 0 : 1),
            generationMatrixUnavailable: false,
            generationMatrixStatus: 'ready',
            resourceId: null,
            resourceIds: [],
            variantResults: [],
            successfulVariantCount: 0,
            failedVariantCount: 0,
            interruptedVariantCount: 0,
            instructionalText: _resolveBlueprintInstructionalText(
                r && r.type,
                r && r.instructionalText,
                _blueprintInstructionalContext,
                _blueprintSettingsSnapshot.leveledTextLanguage
            )
        };
    });
    setIsExecutingBlueprint(true);
    const _blueprintStartedAt = Date.now();
    const _blueprintRunId = 'blueprint-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    setBlueprintExecutionResult({ runId: _blueprintRunId, status: 'running', startedAt: new Date().toISOString(), settingsSnapshot: _blueprintSettingsSnapshot, settingsStale: _settingsDrift.length > 0, staleSettings: _settingsDrift, sourceSelection: _sourceSelection.metadata, generationSummary: Object.assign({}, _plannedGenerationSummary, { exact: true }), generationMatrixUnavailable: false, generationMatrixStatus: 'ready', generationMatrixGuarantees: { exactDedupe: true, exactFanOut: true, dispatchBlocked: false }, matrixUnavailableRows: [], instructionalContext: _blueprintInstructionalContext, rows: _runRows, done: false });
    // The chat panel used to be force-closed here, which threw away the
    // conversation the plan came out of — and, because the guided-flow stage
    // was never cleared, reopening it stranded every later message in the
    // blueprint reviser. Keep it open, report progress in the thread, and
    // retire the stage. The teacher can collapse the panel to a bar to watch
    // the resources land without losing the thread.
    // (tests/blueprint_review_lanes.test.js pins that this module never
    // closes the guide panel — reintroducing that call fails the suite.)
    setGuidedFlowState({ currentStage: null, isFlowActive: false, pendingContext: null });
    setUdlMessages(prev => [...prev, {
        role: 'model',
        text: t('blueprint.execution_started', { count: finalResources.length })
            || `Building your lesson pack now — ${finalResources.length} resource${finalResources.length === 1 ? "" : "s"}. You can minimize this panel to watch them land.`
    }]);
    setIsProcessing(true);
    addToast(`Executing Blueprint: Generating ${finalResources.length} resources...`, "info");
    try {
        let currentSourceText = _sourceSelection.text;
        if (_sourceSelection.metadata && _sourceSelection.metadata.divergentFromLatestAnalysis) {
            try { if (warnLog) warnLog('[Blueprint] current source differs from latest analysis; using current source and rechecking generation identities.'); } catch (_) {}
        }
        // Pre-flight. Nearly every generator needs source text, and without it
        // the dispatcher returns undefined per resource — which the board scores
        // as a whole plan of failures with no stated cause. Say it ONCE, up
        // front, instead of letting the teacher watch nine steps fail. Deliberately
        // does NOT abort: the plan may include a step that supplies the text.
        if (!currentSourceText || !String(currentSourceText).trim()) {
            warnLog('[Blueprint] starting with NO source text (no inputText, no prior analysis with originalText).'
                + ' Steps that require source text will not generate.');
            addToast(t('blueprint.no_source_warning')
                || 'No source text yet, so some resources may not generate. Add or generate a source first for best results.', 'warning');
        }
        // The controller outlives this closure via the module slot so the card's
        // Stop button (which runs in a different call stack) can reach it.
        _blueprintAbortCtl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        const { items: _landedItems, dnaOut, nulls, failedRows } = await executeOneBlueprint(activeBlueprint, {
            handleGenerate,
            warnLog,   // routes step diagnostics through the in-app log, not bare console
            signal: _blueprintAbortCtl ? _blueprintAbortCtl.signal : null,
            historyOverride: [...history],
            dna: lessonDNA,                       // mutated in place — faithful to the original loop
            settingsSnapshot: _blueprintSettingsSnapshot,
            runId: _blueprintRunId,
            runStartedAt: _blueprintStartedAt,
            initialSourceText: currentSourceText,
            onStep: (step) => {
                if (!step || !step.uiId) return;
                setBlueprintExecutionResult(prev => {
                    // If the record was cleared while this run was in flight
                    // (Cancel, or a new plan installed from the chat), do NOT
                    // rebuild it from _runRows in this closure — that resurrects
                    // the dead plan's board and leaves it on screen with
                    // activeBlueprint already null. A cleared record stays clear.
                    if (!prev || prev.runId !== _blueprintRunId || !prev.rows) return prev;
                    const base = prev;
                    const next = Object.assign({}, base, {
                        rows: Object.assign({}, base.rows, {
                            [step.uiId]: Object.assign({}, base.rows[step.uiId], step)
                        })
                    });
                    const matrixUnavailableRows = Object.keys(next.rows).filter(key =>
                        next.rows[key] && next.rows[key].generationMatrixUnavailable === true);
                    next.generationMatrixUnavailable = matrixUnavailableRows.length > 0;
                    next.generationMatrixStatus = matrixUnavailableRows.length ? 'unavailable' : 'ready';
                    next.generationMatrixGuarantees = matrixUnavailableRows.length
                        ? { exactDedupe: false, exactFanOut: false, dispatchBlocked: true }
                        : { exactDedupe: true, exactFanOut: true, dispatchBlocked: false };
                    next.matrixUnavailableRows = matrixUnavailableRows;
                    if (step.retryable === true) {
                        next.retryable = true;
                        next.reasonCode = step.blockedReason || 'generation-matrix-unavailable';
                    }
                    // Promote the audit's scope to the run record. A row is
                    // covered by the current audit iff its resourceId is in
                    // this list — so a row regenerated afterwards drops out of
                    // it automatically, which is exactly per-row staleness.
                    if (Array.isArray(step.auditScopeIds)) {
                        next.audit = {
                            resourceIds: step.auditScopeIds.slice(),
                            reportId: step.resourceId || null,
                            rowUiId: step.uiId,
                        };
                    }
                    return next;
                });
            }
        });
        setPersistedLessonDNA(dnaOut);            // dnaOut === lessonDNA (same object)
        // ── Stopped by the teacher? ──
        // The loop exits QUIETLY on abort (a break, not a throw), so without
        // this branch a stopped run would fall through to the "Done — N
        // resources" message — reporting success for work that never ran. Rows
        // never reached stay 'planned'/'running'; demote them to 'interrupted'
        // exactly like the crash path does, so each gets its Rebuild button
        // instead of a spinner that never resolves.
        const _wasStopped = !!(_blueprintAbortCtl && _blueprintAbortCtl.signal && _blueprintAbortCtl.signal.aborted);
        if (_wasStopped) {
            setBlueprintExecutionResult(prev => {
                if (!prev || prev.runId !== _blueprintRunId || !prev.rows) return prev;
                const rows = {};
                Object.keys(prev.rows).forEach(k => {
                    const r = prev.rows[k];
                    rows[k] = (r && (r.status === 'running' || r.status === 'planned'))
                        ? Object.assign({}, r, { status: 'interrupted' }) : r;
                });
                const stoppedRun = Object.assign({}, prev, { rows: rows, done: true, stopped: true });
                return Object.assign(stoppedRun, { status: 'stopped', finishedAt: new Date().toISOString() });
            });
            // COUNT LANDED ITEMS, not total-minus-failed: rows the stop never
            // reached are in neither list, so `total - nulls.length` would
            // claim unreached rows as finished.
            const _doneCount = Array.isArray(_landedItems) ? _landedItems.length : 0;
            const stopMsg = t('blueprint.run_stopped', { done: _doneCount, total: finalResources.length })
                || `Stopped. ${_doneCount} of ${finalResources.length} resources were finished before the stop — the rest show Rebuild so you can run them individually or restart the plan.`;
            addToast(stopMsg, 'info');
            setUdlMessages(prev => [...prev, { role: 'model', text: stopMsg }]);
        } else if (Array.isArray(nulls) && nulls.length > 0) {
            // Name the ROW, not just the tool. `nulls` is a flat list of tool
            // names, so a plan with two image steps reported "image, image" and
            // the teacher could not tell which one to rebuild. failedRows
            // carries the plan position; fall back to nulls if it is absent
            // (older callers of executeOneBlueprint).
            const rowsFailed = Array.isArray(failedRows) && failedRows.length ? failedRows : null;
            const describe = rowsFailed
                ? rowsFailed.slice(0, 3).map(r => `${r.tool} (step ${r.index + 1})`)
                : nulls.slice(0, 3);
            const total = rowsFailed ? rowsFailed.length : nulls.length;
            const failedList = describe.join(", ");
            const extra = total > 3 ? ` and ${total - 3} more` : "";
            const warnMsg = `Blueprint finished, but ${total} resource${total === 1 ? "" : "s"} did not generate: ${failedList}${extra}.`;
            // A run where EVERY row failed is a different event from a run where
            // one did: it means something systemic (module not loaded, no key,
            // auth, quota), not a bad directive. Say so once, loudly, with the
            // distinct reasons collected — otherwise the only signal is a toast
            // that reads like partial success.
            if (rowsFailed && total === finalResources.length && total > 1) {
                const reasons = [];
                rowsFailed.forEach(r => { const x = r && r.reason; if (x && reasons.indexOf(x) === -1) reasons.push(x); });
                warnLog('[Blueprint] ALL ' + total + ' steps failed — this is systemic, not per-resource.'
                    + ' Distinct reasons: ' + (reasons.length ? reasons.join(' | ') : '(none captured)'));
            }
            setBlueprintExecutionResult(prev => prev && prev.runId === _blueprintRunId ? Object.assign({}, prev, { status: 'partial', finishedAt: new Date().toISOString() }) : prev);
            addToast(warnMsg, "warning");
            setUdlMessages(prev => [...prev, { role: 'model', text: warnMsg }]);
        } else {
            setBlueprintExecutionResult(prev => prev && prev.runId === _blueprintRunId ? Object.assign({}, prev, { status: 'completed', finishedAt: new Date().toISOString() }) : prev);
            addToast(t('blueprint.execution_complete'), "success");
            setUdlMessages(prev => [...prev, {
                role: 'model',
                text: t('blueprint.execution_complete_chat', { count: finalResources.length })
                    || `Done — ${finalResources.length} resource${finalResources.length === 1 ? "" : "s"} are in your lesson. Tell me what to refine, or ask me anything about them.`
            }]);
        }
    } catch (e) {
        if (e && e.code === 'BLUEPRINT_GENERATION_MATRIX_UNAVAILABLE') {
            const loadingMessage = t('blueprint.matrix_unavailable_retry')
                || 'Generation planning is still loading. No additional resources were generated; choose Generate again to retry.';
            try { if (typeof warnLog === 'function') warnLog('[Blueprint] generation paused: Generation Matrix resolution unavailable; retry is safe.', e); } catch (_) {}
            try { if (typeof addToast === 'function') addToast(loadingMessage, 'warning'); } catch (_) {}
            if (typeof setUdlMessages === 'function') setUdlMessages(prev => [...prev, { role: 'model', text: loadingMessage }]);
            setBlueprintExecutionResult(prev => {
                if (!prev || prev.runId !== _blueprintRunId || !prev.rows) return prev;
                const rows = {};
                Object.keys(prev.rows).forEach(k => {
                    const r = prev.rows[k];
                    rows[k] = (r && (r.status === 'running' || r.status === 'planned'))
                        ? Object.assign({}, r, {
                            status: 'planned',
                            generationMatrixUnavailable: true,
                            generationMatrixStatus: 'unavailable',
                            blockedReason: 'generation-matrix-unavailable',
                            retryable: true,
                        }) : r;
                });
                const matrixUnavailableRows = Object.keys(rows).filter(k =>
                    rows[k] && rows[k].generationMatrixUnavailable === true);
                return Object.assign({}, prev, {
                    rows,
                    done: true,
                    status: 'waiting',
                    finishedAt: new Date().toISOString(),
                    retryable: true,
                    reasonCode: 'generation-matrix-unavailable',
                    generationMatrixUnavailable: true,
                    generationMatrixStatus: 'unavailable',
                    generationMatrixGuarantees: { exactDedupe: false, exactFanOut: false, dispatchBlocked: true },
                    matrixUnavailableRows,
                });
            });
        } else {
        warnLog("Unhandled error:", e);
        addToast(t('blueprint.execution_error'), "error");
        setUdlMessages(prev => [...prev, { role: 'model', text: t('blueprint.execution_error') }]);
        // An interrupted run must not leave rows frozen at 'running' forever —
        // unbuildable and undismissable. Mark them interrupted so the board can
        // offer a retry instead of a spinner that never resolves.
        setBlueprintExecutionResult(prev => {
            if (!prev || prev.runId !== _blueprintRunId || !prev.rows) return prev;
            const rows = {};
            Object.keys(prev.rows).forEach(k => {
                const r = prev.rows[k];
                rows[k] = (r && (r.status === 'running' || r.status === 'planned'))
                    ? Object.assign({}, r, { status: 'interrupted' }) : r;
            });
            return Object.assign({}, prev, { rows: rows, done: true, status: 'failed', finishedAt: new Date().toISOString() });
        });
        }
    } finally {
        _blueprintRunInFlight = false;
        _blueprintAbortCtl = null;   // a Stop pressed after this is a harmless no-op
        setIsProcessing(false);
        setIsExecutingBlueprint(false);
        setBlueprintExecutionResult(prev => prev && prev.runId === _blueprintRunId ? Object.assign({}, prev, { done: true, status: prev.status || 'completed', finishedAt: prev.finishedAt || new Date().toISOString() }) : prev);
    }
};

window.AlloModules = window.AlloModules || {};
// Stage 5 — rebuild ONE plan row.
//
// Possible only because of the Stage 2 join key: the row is addressed by uiId,
// so this cannot regenerate the wrong resource even on a reordered plan, and
// two rows of the same tool stay distinguishable. Uses the same handleGenerate
// call shape the executor uses, so a rebuilt row is indistinguishable from an
// originally-generated one.
//
// The new resourceId is the staleness signal: audit coverage is tested by
// resourceId, so a rebuilt row drops out of run.audit.resourceIds on its own
// and its badge flips to "Not in audit". No invalidation bookkeeping.
const handleRebuildBlueprintStep = async (deps, uiId) => {
  const { activeBlueprint, blueprintExecutionResult, persistedLessonDNA, history,
          setBlueprintExecutionResult, handleGenerate, addToast, t, warnLog } = deps;
  if (!uiId) return null;
  const plan = (activeBlueprint && Array.isArray(activeBlueprint.resourcePlan)) ? activeBlueprint.resourcePlan : [];
  const row = plan.filter(function (r) { return r && (r.uiId || r.stepId) === uiId; })[0];
  if (!row) { try { addToast(t('blueprint.rebuild_missing') || 'That step is no longer in the plan.', 'warning'); } catch (_) {} return null; }
  // Same guard as a full run: a rebuild during an execution would interleave
  // history writes with the executor's own loop.
  if (_blueprintRunInFlight) {
    try { addToast(t('blueprint.already_running') || 'That plan is already generating.', 'info'); } catch (_) {}
    return null;
  }
  if (!_isBlueprintGenerationMatrixReady()) {
    setBlueprintExecutionResult(function (prev) {
      if (!prev || !prev.rows || !prev.rows[uiId]) return prev;
      const matrixUnavailableRows = Array.from(new Set([
        ...(Array.isArray(prev.matrixUnavailableRows) ? prev.matrixUnavailableRows : []),
        uiId,
      ]));
      return Object.assign({}, prev, {
        status: 'waiting',
        done: true,
        retryable: true,
        reasonCode: 'generation-matrix-unavailable',
        generationMatrixUnavailable: true,
        generationMatrixStatus: 'unavailable',
        generationMatrixGuarantees: { exactDedupe: false, exactFanOut: false, dispatchBlocked: true },
        matrixUnavailableRows,
        rows: Object.assign({}, prev.rows, {
          [uiId]: Object.assign({}, prev.rows[uiId], {
            generationMatrixUnavailable: true,
            generationMatrixStatus: 'unavailable',
            blockedReason: 'generation-matrix-unavailable',
            retryable: true,
          })
        })
      });
    });
    const loadingMessage = t('blueprint.matrix_unavailable_retry')
      || 'Generation planning is still loading. This step was not rebuilt; choose Rebuild again to retry.';
    try { if (typeof warnLog === 'function') warnLog('[Blueprint] rebuild blocked: Generation Matrix module unavailable; no resource call was made.'); } catch (_) {}
    try { addToast(loadingMessage, 'warning'); } catch (_) {}
    return null;
  }
  _blueprintRunInFlight = true;
  const _existingRunId = blueprintExecutionResult && blueprintExecutionResult.runId;
  const _rebuildRunId = _existingRunId || ('blueprint-rebuild-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8));
  const patch = (fields) => setBlueprintExecutionResult(function (prev) {
    if (!prev || prev.runId !== _rebuildRunId || !prev.rows || !prev.rows[uiId]) return prev;
    const rows = Object.assign({}, prev.rows, {
      [uiId]: Object.assign({}, prev.rows[uiId], { uiId: uiId, tool: row.tool }, fields)
    });
    const next = Object.assign({}, prev, { rows });
    if (fields && typeof fields.generationMatrixUnavailable === 'boolean') {
      const matrixUnavailableRows = Object.keys(rows).filter(key =>
        rows[key] && rows[key].generationMatrixUnavailable === true);
      next.generationMatrixUnavailable = matrixUnavailableRows.length > 0;
      next.generationMatrixStatus = matrixUnavailableRows.length ? 'unavailable' : 'ready';
      next.generationMatrixGuarantees = matrixUnavailableRows.length
        ? { exactDedupe: false, exactFanOut: false, dispatchBlocked: true }
        : { exactDedupe: true, exactFanOut: true, dispatchBlocked: false };
      next.matrixUnavailableRows = matrixUnavailableRows;
      if (!matrixUnavailableRows.length) {
        next.retryable = false;
        next.reasonCode = null;
        if (next.status === 'waiting') next.status = 'completed';
      }
    }
    return next;
  });
  // Stamp legacy records with a run ID once, but only if the exact record that
  // launched this rebuild is still current. All later writes require that ID.
  setBlueprintExecutionResult(function (prev) {
    if (!prev || !prev.rows || !prev.rows[uiId]) return prev;
    if (_existingRunId ? prev.runId !== _existingRunId : prev !== blueprintExecutionResult) return prev;
    return Object.assign({}, prev, {
      runId: _rebuildRunId,
      rows: Object.assign({}, prev.rows, {
        [uiId]: Object.assign({}, prev.rows[uiId], {
          uiId: uiId, tool: row.tool, status: 'running',
          resourceId: null, resourceIds: [], variantResults: [],
          successfulVariantCount: 0, failedVariantCount: 0, interruptedVariantCount: 0,
        })
      })
    });
  });
  try {
    const rebuildSettingsSnapshot = (blueprintExecutionResult && blueprintExecutionResult.settingsSnapshot) || null;
    const rebuildInstructionalContext = _resolveBlueprintInstructionalContext(activeBlueprint, rebuildSettingsSnapshot, persistedLessonDNA);
    const rebuildGlobals = activeBlueprint && activeBlueprint.globalSettings && typeof activeBlueprint.globalSettings === 'object'
      ? activeBlueprint.globalSettings : {};
    const rebuildDispatchSnapshot = rebuildSettingsSnapshot || Object.freeze(Object.assign({}, rebuildGlobals, {
      gradeLevel: rebuildInstructionalContext.instructionalGrade || rebuildGlobals.gradeLevel || '',
      language: rebuildGlobals.primaryLanguage || rebuildGlobals.language || rebuildGlobals.leveledTextLanguage || '',
      leveledTextLanguage: rebuildGlobals.primaryLanguage || rebuildGlobals.language || rebuildGlobals.leveledTextLanguage || '',
      standardsContext: rebuildInstructionalContext.standardsContext || null,
      standardsFingerprint: rebuildInstructionalContext.standardsFingerprint || rebuildGlobals.standardsFingerprint || '',
      instructionalContext: rebuildInstructionalContext,
    }));
    const rebuildInstructionalText = _resolveBlueprintInstructionalText(
      row.tool,
      row.instructionalText,
      rebuildInstructionalContext,
      rebuildSettingsSnapshot && rebuildSettingsSnapshot.leveledTextLanguage
    );
    const rebuildConfig = {
      customInstructions: row.directive || '',
      historyOverride: Array.isArray(history) ? history.slice() : [],
      lessonDNA: persistedLessonDNA || null,
      standardsContext: rebuildInstructionalContext.standardsContext || null,
      instructionalContext: rebuildInstructionalContext,
      instructionalText: rebuildInstructionalText,
    };
    // Activities redesign (2026-08-16): rebuilds honor the plan row's activity
    // mode, so a discussion/jigsaw step rebuilds as the same kind of activity.
    if (row.tool === 'brainstorm' && typeof row.activityMode === 'string') {
      rebuildConfig.activityMode = row.activityMode;
      if (row.activityConfig && typeof row.activityConfig === 'object') rebuildConfig.activityConfig = row.activityConfig;
    }
    const rebuildMatrix = _resolveBlueprintExecutionMatrix(
      Object.assign({ type: row.tool }, row), rebuildDispatchSnapshot,
      Array.isArray(history) ? history : [], null, true
    );
    if (!rebuildMatrix.available) {
      throw _createBlueprintGenerationMatrixError({ uiId, tool: row.tool, matrixUnavailableRows: [uiId] });
    }
    const rebuiltItems = [];
    const variantResults = [];
    for (let variantIndex = 0; variantIndex < rebuildMatrix.variants.length; variantIndex++) {
      const variant = rebuildMatrix.variants[variantIndex] || {};
      const variantId = _blueprintVariantId(variant, uiId, variantIndex);
      const variantConfig = Object.assign({}, rebuildConfig, {
        skipDifferentiation: true,
        generationMatrixManaged: rebuildMatrix.available,
        generationMatrixUnavailable: !rebuildMatrix.available,
        generationIdentity: variant.generationIdentity || null,
        generationAction: 'refresh',
        generationVariant: Object.assign({}, variant, { action: 'refresh' }),
        variantKey: variant.variantKey || null,
        explicitVariantKey: variant.explicitVariantKey || null,
        variantKeyDerived: variant.variantKeyDerived === true,
        sourceFingerprint: variant.sourceFingerprint || rebuildDispatchSnapshot.sourceFingerprint || '',
        contextFingerprint: variant.contextFingerprint || rebuildDispatchSnapshot.contextFingerprint || '',
        contextInputsFingerprint: variant.contextInputsFingerprint || rebuildDispatchSnapshot.contextInputsFingerprint || '',
        contextFingerprintDerived: variant.contextFingerprintDerived === true || rebuildDispatchSnapshot.contextFingerprintDerived === true,
        generationConfig: variant.generationConfig || row.generationConfig || null,
        generationConfigFingerprint: variant.generationConfigFingerprint || row.generationConfigFingerprint || '',
      });
      if (variant.grade) variantConfig.grade = variant.grade;
      let item = null;
      let variantFailure = null;
      try {
        item = await handleGenerate(row.tool, variant.language || null, false, null, variantConfig, false, rebuildDispatchSnapshot);
        if (!item) variantFailure = 'handleGenerate returned no resource (it did not throw)';
      } catch (variantError) {
        variantFailure = 'threw: ' + ((variantError && (variantError.message || variantError.name)) || String(variantError));
        try { if (warnLog) warnLog(`[Blueprint] rebuild variant failed uiId=${uiId} variant=${variantId}: ${variantFailure}`); } catch (_) {}
      }
      if (item) {
        item = Object.assign({}, item, {
          instructionalText: item.instructionalText || rebuildInstructionalText,
          generationIdentity: variant.generationIdentity || item.generationIdentity || null,
          generationAction: 'refresh',
          variantKey: variant.variantKey || item.variantKey || null,
          explicitVariantKey: variant.explicitVariantKey || item.explicitVariantKey || null,
          variantKeyDerived: variant.variantKeyDerived === true,
          sourceFingerprint: variant.sourceFingerprint || item.sourceFingerprint || rebuildDispatchSnapshot.sourceFingerprint || '',
          gradeLevel: variant.grade || item.gradeLevel,
          language: variant.language || item.language,
        });
        rebuiltItems.push(item);
      }
      variantResults.push({
        variantId,
        generationIdentity: variant.generationIdentity || null,
        action: 'refresh',
        status: item ? 'landed' : 'failed',
        resourceId: item && (item.id || item.resourceId || item.artifactId) || null,
        artifactId: item && (item.id || item.resourceId || item.artifactId) || null,
        existingArtifactId: variant.existingArtifactId || null,
        variantKey: variant.variantKey || null,
        grade: variant.grade || null,
        language: variant.language || null,
        reason: variantFailure || undefined,
      });
    }
    const failedVariantCount = variantResults.filter(v => v.status === 'failed').length;
    const successfulVariantCount = variantResults.filter(v => v.status === 'landed').length;
    const resultItem = rebuiltItems[0] || null;
    patch({ status: resultItem ? (failedVariantCount ? 'partial' : 'landed') : 'failed',
            resourceId: (resultItem && (resultItem.id || resultItem.resourceId || resultItem.artifactId)) || null,
            resourceIds: variantResults.map(v => v.resourceId).filter(Boolean),
            successfulVariantCount,
            failedVariantCount,
            interruptedVariantCount: 0,
            generationAction: 'refresh',
            generationVariants: rebuildMatrix.variants,
            generationMatrixUnavailable: !rebuildMatrix.available,
            generationMatrixStatus: 'ready',
            variantResults,
            instructionalText: rebuildInstructionalText,
            rebuilt: true });
    return resultItem || null;
  } catch (e) {
    if (e && e.code === 'BLUEPRINT_GENERATION_MATRIX_UNAVAILABLE') {
      warnLog && warnLog('[Blueprint] rebuild paused: Generation Matrix resolution unavailable; retry is safe.');
      patch({
        status: 'planned',
        generationMatrixUnavailable: true,
        generationMatrixStatus: 'unavailable',
        blockedReason: 'generation-matrix-unavailable',
        retryable: true,
        resourceId: null,
        rebuilt: false,
      });
      try { addToast(t('blueprint.matrix_unavailable_retry') || 'Generation planning is still loading. This step was not rebuilt; choose Rebuild again to retry.', 'warning'); } catch (_) {}
    } else {
      warnLog && warnLog('[Blueprint] rebuild failed:', e && e.message ? e.message : e);
      patch({ status: 'failed', resourceId: null, rebuilt: true });
    }
    return null;
  } finally {
    _blueprintRunInFlight = false;
  }
};

window.AlloModules.PhaseOHandlers = {
  startClassSession,
  handleRefineImage,
  handleFindStandards,
  handleWizardComplete,
  handleWizardStandardLookup,
  handleExecuteBlueprint,
  handleRebuildBlueprintStep,
  handleStopBlueprintRun,   // aborts the in-flight run's controller; no-op between runs
  executeOneBlueprint,   // exposed for the Generate-Unit driver (runs it once per lesson)
};
