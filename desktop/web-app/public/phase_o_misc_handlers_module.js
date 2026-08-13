(function(){"use strict";
if(window.AlloModules&&window.AlloModules.PhaseOHandlersModule){console.log("[CDN] PhaseOHandlersModule already loaded, skipping"); return;}
// phase_o_misc_handlers_source.jsx -- Phase O of CDN modularization.
// 6 misc handlers across class sessions, image refinement, standards
// lookup, wizard flow, blueprint execution.

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
                data: r.data
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
const getBlueprintResourcePlan = (blueprint) => {
    const toolDirectives = (blueprint && blueprint.toolDirectives) || {};
    const rawPlan = Array.isArray(blueprint?.resourcePlan) && blueprint.resourcePlan.length > 0
        ? blueprint.resourcePlan
        : ((blueprint && blueprint.recommendedResources) || []);
    return rawPlan.map((item, idx) => {
        const type = typeof item === 'string' ? item : (item && (item.tool || item.type || item.id));
        if (!type) return null;
        return {
            type,
            // Stable row identity minted by the contract layer. Falls back to
            // the positional form only for plans built outside it.
            uiId: (typeof item === 'object' && item && (item.uiId || item.stepId)) || (String(type) + '-' + idx),
            directive: typeof item === 'string'
                ? (toolDirectives[type] || "")
                : (item.directive || item.instructions || item.customInstructions || toolDirectives[type] || "")
        };
    }).filter(Boolean);
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

const executeOneBlueprint = async (blueprint, ctx) => {
    // onStep is ADDITIVE and optional — onResource stays exactly as it was
    // because Throughline's Generate-Unit driver consumes it.
    const { handleGenerate, historyOverride, dna, initialSourceText, onResource, onStep, signal, warnLog, settingsSnapshot, runId, runStartedAt } = ctx || {};
    const emitStep = (payload) => { if (typeof onStep === 'function') { try { onStep(payload); } catch (_) {} } };
    // Blueprint failures used to be INVISIBLE. A row was marked 'failed' purely
    // because handleGenerate returned falsy — no exception, no capture, no log.
    // So a run where every resource failed produced a completely clean console
    // and no way to tell "the model refused" from "the dispatcher never loaded"
    // from "this tool type isn't handled". Diagnostics are not optional here:
    // this is the one path where the app does real work unattended.

    const finalResources = getBlueprintResourcePlan(blueprint);
    const lessonDNA = dna || { grade: "", topic: "", standard: "", concepts: [], keyTerms: [], visualContext: "", essentialQuestion: "" };
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
        emitStep({ uiId: stepUiId, tool: type, status: 'running', index: i });
        const stepConfig = {
            customInstructions: aiDirective,
            historyOverride: currentBlueprintHistory,
            lessonDNA: lessonDNA,
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
        };
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
        let threw = null;
        try {
            resultItem = await handleGenerate(type, null, i < finalResources.length - 1, currentSourceText, stepConfig, false, settingsSnapshot || null);
            if (!resultItem) failReason = 'handleGenerate returned no resource (it did not throw)';
        } catch (err) {
            threw = err;
            failReason = 'threw: ' + ((err && (err.message || err.name)) || String(err));
        }
        if (!resultItem) {
            // Name the three things that actually distinguish the causes: which
            // row, why, and whether the dispatcher module is even present (a
            // missing GenDispatcher nulls EVERY row and is otherwise silent).
            let dispatcherLoaded = 'unknown';
            try { dispatcherLoaded = String(!!(typeof window !== 'undefined' && window.AlloModules && window.AlloModules.GenDispatcher)); } catch (_) {}
            recordBlueprintResourceFailure({
                tool: type,
                uiId: stepUiId,
                index: i,
                reason: failReason,
                error: threw,
                dispatcherLoaded: dispatcherLoaded,
                sourceTextChars: currentSourceText ? currentSourceText.length : 0,
                runId,
                elapsedMs: Number.isFinite(runStartedAt) ? Math.max(0, Date.now() - runStartedAt) : 0,
            }, warnLog);
        }
        emitStep({ uiId: stepUiId, tool: type, index: i,
                   status: resultItem ? 'landed' : 'failed',
                   resourceId: (resultItem && resultItem.id) || null,
                   // Carried into the run record so the card can SHOW why a row
                   // failed instead of only that it did.
                   failReason: resultItem ? undefined : failReason,
                   // Carried so the run record can answer "which rows does the
                   // current audit actually cover?" — the basis for per-row
                   // staleness once a row is later regenerated.
                   auditScopeIds: (resultItem && auditScopeIds) ? auditScopeIds : undefined });
        if (resultItem) {
            items.push(resultItem);
            currentBlueprintHistory.push(resultItem);
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
        } else {
            // nulls stays a flat tool-name list for the existing toast/callers;
            // failedRows is the row-accurate record ("which image failed").
            nulls.push(type);
            failedRows.push({ uiId: stepUiId, tool: type, index: i, reason: failReason });
            // Resource-specific parse/shape failures should not strand the rest
            // of a plan. Preserve abort semantics for errors that make every
            // following step unsafe or impossible: cancellation, auth, quota,
            // safety/policy blocks, missing modules, and explicit fatal errors.
            const message = threw && String(threw.message || threw.name || threw);
            const fatal = !!(threw && (threw.isFatal || threw.isAuth
                || threw.name === 'AbortError'
                || /abort|cancel|auth|api key|quota|permission|forbidden|not loaded|safety|policy|blocked|no source/i.test(message)));
            if (threw && fatal) throw threw;
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
  try { if (window._DEBUG_PHASE_O) console.log("[PhaseO] handleExecuteBlueprint fired"); } catch(_) {}
    if (!activeBlueprint) return;
    const finalResources = getBlueprintResourcePlan(activeBlueprint);
    if (finalResources.length === 0) {
        addToast("This blueprint does not include any resources yet.", "error");
        return;
    }
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
    const _blueprintSettingsSnapshot = Object.freeze({
        gradeLevel: _globalSettings.gradeLevel || gradeLevel,
        leveledTextLanguage: _globalSettings.language || _globalSettings.leveledTextLanguage || leveledTextLanguage,
        selectedLanguages: Array.isArray(selectedLanguages) ? selectedLanguages.slice() : selectedLanguages,
        studentInterests: Array.isArray(studentInterests) ? studentInterests.slice() : studentInterests,
        standardsInput,
        targetStandards: Array.isArray(targetStandards) ? targetStandards.slice() : targetStandards,
        dokLevel: _globalSettings.dokLevel || dokLevel,
        useEmojis: _globalSettings.useEmojis === undefined ? useEmojis : _globalSettings.useEmojis,
        textFormat: _globalSettings.textFormat || textFormat,
        differentiationRange,
        differentiationTypes: Array.isArray(differentiationTypes) ? differentiationTypes.slice() : differentiationTypes,
        differentiationCustomGrades: Array.isArray(differentiationCustomGrades) ? differentiationCustomGrades.slice() : differentiationCustomGrades,
    });
    const lessonDNA = {
        grade: activeBlueprint.globalSettings?.gradeLevel || gradeLevel,
        topic: sourceTopic || "",
        standard: standardsInput || "",
        concepts: Array.isArray(activeBlueprint.lessonDNA?.goldenThread) ? activeBlueprint.lessonDNA.goldenThread : [],
        keyTerms: Array.isArray(activeBlueprint.lessonDNA?.keyTerms) ? activeBlueprint.lessonDNA.keyTerms : [],
        visualContext: "",
        essentialQuestion: activeBlueprint.lessonDNA?.essentialQuestion || "",
    };
    // Seed one row per plan entry so the board shows the whole plan as
    // 'planned' immediately, rather than materialising rows as they start.
    const _runRows = {};
    finalResources.forEach((r, i) => {
        const key = (r && r.uiId) || (String(r && r.type) + '-' + i);
        _runRows[key] = { uiId: key, tool: r && r.type, status: 'planned', index: i };
    });
    setIsExecutingBlueprint(true);
    const _blueprintStartedAt = Date.now();
    const _blueprintRunId = 'blueprint-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    setBlueprintExecutionResult({ runId: _blueprintRunId, status: 'running', startedAt: new Date().toISOString(), settingsSnapshot: _blueprintSettingsSnapshot, rows: _runRows, done: false });
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
        let currentSourceText = inputText;
        const existingAnalysis = history.slice().reverse().find(h => h && h.type === 'analysis');
        if (existingAnalysis?.data?.originalText) {
            currentSourceText = existingAnalysis.data.originalText;
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
  _blueprintRunInFlight = true;
  const _existingRunId = blueprintExecutionResult && blueprintExecutionResult.runId;
  const _rebuildRunId = _existingRunId || ('blueprint-rebuild-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8));
  const patch = (fields) => setBlueprintExecutionResult(function (prev) {
    if (!prev || prev.runId !== _rebuildRunId || !prev.rows || !prev.rows[uiId]) return prev;
    return Object.assign({}, prev, {
      rows: Object.assign({}, prev.rows, {
        [uiId]: Object.assign({}, prev.rows[uiId], { uiId: uiId, tool: row.tool }, fields)
      })
    });
  });
  // Stamp legacy records with a run ID once, but only if the exact record that
  // launched this rebuild is still current. All later writes require that ID.
  setBlueprintExecutionResult(function (prev) {
    if (!prev || !prev.rows || !prev.rows[uiId]) return prev;
    if (_existingRunId ? prev.runId !== _existingRunId : prev !== blueprintExecutionResult) return prev;
    return Object.assign({}, prev, {
      runId: _rebuildRunId,
      rows: Object.assign({}, prev.rows, {
        [uiId]: Object.assign({}, prev.rows[uiId], { uiId: uiId, tool: row.tool, status: 'running' })
      })
    });
  });
  try {
    const resultItem = await handleGenerate(row.tool, null, false, null, {
      customInstructions: row.directive || '',
      historyOverride: Array.isArray(history) ? history.slice() : [],
      lessonDNA: persistedLessonDNA || null,
    }, false, (blueprintExecutionResult && blueprintExecutionResult.settingsSnapshot) || null);
    patch({ status: resultItem ? 'landed' : 'failed',
            resourceId: (resultItem && resultItem.id) || null,
            rebuilt: true });
    return resultItem || null;
  } catch (e) {
    warnLog && warnLog('[Blueprint] rebuild failed:', e && e.message ? e.message : e);
    patch({ status: 'failed', resourceId: null, rebuilt: true });
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
window.AlloModules.PhaseOHandlersModule = true;
console.log("[PhaseOHandlers] 7 handlers registered");
})();
