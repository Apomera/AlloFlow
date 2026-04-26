(function(){"use strict";
if(window.AlloModules&&window.AlloModules.PhaseOHandlersModule){console.log("[CDN] PhaseOHandlersModule already loaded, skipping"); return;}
// phase_o_misc_handlers_source.jsx -- Phase O of CDN modularization.
// 6 misc handlers across class sessions, image refinement, standards
// lookup, wizard flow, blueprint execution.

const startClassSession = async (deps) => {
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, standardsInput, targetStandards, dokLevel, rosterKey, sessionData, user, appId, activeSessionAppId, activeSessionCode, studentNickname, sourceLength, sourceTone, textFormat, fullPackTargetGroup, isAutoConfigEnabled, resourceCount, creativeMode, noText, fillInTheBlank, imageGenerationStyle, imageAspectRatio, useLowQualityVisuals, autoRemoveWords, globalPoints, wizardData, isWizardOpen, standardsLookupRegion, standardsLookupGoal, pdfFixResult, showExportPreview, aiStandardQuery, aiStandardRegion, imageRefinementInput, activeBlueprint, ai, alloBotRef, pdfPreviewRef, exportPreviewRef, setError, setIsProcessing, setGenerationStep, setGeneratedContent, setHistory, setActiveView, setActiveSessionCode, setActiveSessionAppId, setStudentNickname, setIsWizardOpen, setShowSourceGen, setSourceTopic, setSourceCustomInstructions, setSourceLength, setSourceTone, setTextFormat, setSelectedLanguages, setGradeLevel, setStandardsInput, setTargetStandards, setDokLevel, setStudentInterests, setSuggestedStandards, setIsLookingUpStandards, setStandardsLookupGoal, setStandardsLookupRegion, setExpandedTools, setShowUDLGuide, setUdlMessages, setGuidedFlowState, setIsRefiningImage, setShowImageRefineModal, setIsExecutingBlueprint, setBlueprintExecutionResult, setShowExportPreview, setInputText, setIsTeacherMode, setIsParentMode, setIsIndependentMode, setActiveSidebarTab, setDoc, setSessionData, setShowSessionModal, setImageRefinementInput, setIsFindingStandards, setShowWizard, setSourceLevel, setSourceVocabulary, setIncludeSourceCitations, setLeveledTextLanguage, setActiveBlueprint, setPersistedLessonDNA, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, flyToElement, getDefaultTitle, storageDB, updateDoc, doc, db, playSound, playAdventureEventSound, generateSessionCode, stripUndefined, uploadSessionAssets, safeSetItem, handleGenerateSource, applyDetailedAutoConfig, handleGenerate, fileInputRef } = deps;
  try { if (window._DEBUG_PHASE_O) console.log("[PhaseO] startClassSession fired"); } catch(_) {}
    if (history.length === 0) {
        addToast(t('session.error_no_resources'), "error");
        return;
    }
    const code = generateSessionCode();
    addToast(t('session.creating', { code }), "info");
    try {
        const resourcesToUpload = history.filter(h => h.id);
        const lightweightResources = await uploadSessionAssets(appId, resourcesToUpload);
        const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', code);
        const sessionPayload = {
            resources: lightweightResources,
            mode: 'sync',
            currentResourceId: null,
            createdAt: new Date().toISOString(),
            hostId: user?.uid,
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
                roster: {},
                groups: {},
                democracy: { isActive: false, phase: 'idle', votingContext: 'custom', activeOptions: [], votes: {}, suggestions: {} },
                quizState: { isActive: false, mode: 'live-pulse', currentQuestionIndex: 0, phase: 'idle', responses: {}, bossStats: { maxHP: 1000, currentHP: 1000, classHP: 100, name: "The Knowledge Keeper", lastDamage: 0 }, teams: {} }
            }));
            setActiveSessionCode(code);
            setShowSessionModal(true);
            setActiveSidebarTab('history');
            addToast(t('session.local_mode_warning') || "⚠️ Running in local preview mode (Firebase unavailable)", "warning");
        } else {
            addToast(t('session.error_generic'), "error");
        }
    }
};

const handleRefineImage = async (deps) => {
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, standardsInput, targetStandards, dokLevel, rosterKey, sessionData, user, appId, activeSessionAppId, activeSessionCode, studentNickname, sourceLength, sourceTone, textFormat, fullPackTargetGroup, isAutoConfigEnabled, resourceCount, creativeMode, noText, fillInTheBlank, imageGenerationStyle, imageAspectRatio, useLowQualityVisuals, autoRemoveWords, globalPoints, wizardData, isWizardOpen, standardsLookupRegion, standardsLookupGoal, pdfFixResult, showExportPreview, aiStandardQuery, aiStandardRegion, imageRefinementInput, activeBlueprint, ai, alloBotRef, pdfPreviewRef, exportPreviewRef, setError, setIsProcessing, setGenerationStep, setGeneratedContent, setHistory, setActiveView, setActiveSessionCode, setActiveSessionAppId, setStudentNickname, setIsWizardOpen, setShowSourceGen, setSourceTopic, setSourceCustomInstructions, setSourceLength, setSourceTone, setTextFormat, setSelectedLanguages, setGradeLevel, setStandardsInput, setTargetStandards, setDokLevel, setStudentInterests, setSuggestedStandards, setIsLookingUpStandards, setStandardsLookupGoal, setStandardsLookupRegion, setExpandedTools, setShowUDLGuide, setUdlMessages, setGuidedFlowState, setIsRefiningImage, setShowImageRefineModal, setIsExecutingBlueprint, setBlueprintExecutionResult, setShowExportPreview, setInputText, setIsTeacherMode, setIsParentMode, setIsIndependentMode, setActiveSidebarTab, setDoc, setSessionData, setShowSessionModal, setImageRefinementInput, setIsFindingStandards, setShowWizard, setSourceLevel, setSourceVocabulary, setIncludeSourceCitations, setLeveledTextLanguage, setActiveBlueprint, setPersistedLessonDNA, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, flyToElement, getDefaultTitle, storageDB, updateDoc, doc, db, playSound, playAdventureEventSound, generateSessionCode, stripUndefined, uploadSessionAssets, safeSetItem, handleGenerateSource, applyDetailedAutoConfig, handleGenerate, fileInputRef } = deps;
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
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, standardsInput, targetStandards, dokLevel, rosterKey, sessionData, user, appId, activeSessionAppId, activeSessionCode, studentNickname, sourceLength, sourceTone, textFormat, fullPackTargetGroup, isAutoConfigEnabled, resourceCount, creativeMode, noText, fillInTheBlank, imageGenerationStyle, imageAspectRatio, useLowQualityVisuals, autoRemoveWords, globalPoints, wizardData, isWizardOpen, standardsLookupRegion, standardsLookupGoal, pdfFixResult, showExportPreview, aiStandardQuery, aiStandardRegion, imageRefinementInput, activeBlueprint, ai, alloBotRef, pdfPreviewRef, exportPreviewRef, setError, setIsProcessing, setGenerationStep, setGeneratedContent, setHistory, setActiveView, setActiveSessionCode, setActiveSessionAppId, setStudentNickname, setIsWizardOpen, setShowSourceGen, setSourceTopic, setSourceCustomInstructions, setSourceLength, setSourceTone, setTextFormat, setSelectedLanguages, setGradeLevel, setStandardsInput, setTargetStandards, setDokLevel, setStudentInterests, setSuggestedStandards, setIsLookingUpStandards, setStandardsLookupGoal, setStandardsLookupRegion, setExpandedTools, setShowUDLGuide, setUdlMessages, setGuidedFlowState, setIsRefiningImage, setShowImageRefineModal, setIsExecutingBlueprint, setBlueprintExecutionResult, setShowExportPreview, setInputText, setIsTeacherMode, setIsParentMode, setIsIndependentMode, setActiveSidebarTab, setDoc, setSessionData, setShowSessionModal, setImageRefinementInput, setIsFindingStandards, setShowWizard, setSourceLevel, setSourceVocabulary, setIncludeSourceCitations, setLeveledTextLanguage, setActiveBlueprint, setPersistedLessonDNA, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, flyToElement, getDefaultTitle, storageDB, updateDoc, doc, db, playSound, playAdventureEventSound, generateSessionCode, stripUndefined, uploadSessionAssets, safeSetItem, handleGenerateSource, applyDetailedAutoConfig, handleGenerate, fileInputRef } = deps;
  try { if (window._DEBUG_PHASE_O) console.log("[PhaseO] handleFindStandards fired"); } catch(_) {}
      if (!aiStandardQuery.trim()) return;
            const effectiveGrade = (typeof gradeContext === 'string' && gradeContext) ? gradeContext : gradeLevel;
      const regionText = aiStandardRegion ? `Constraint (Region or Framework): ${aiStandardRegion}` : "Context: General/US";
      setIsFindingStandards(true);
      setSuggestedStandards([]);
      try {
          const isLocalBackend = ai?.backend === 'ollama' || ai?.backend === 'localai';
          let textToParse = "";

          if (isLocalBackend) {
              const searchQuery = `${aiStandardRegion || 'CCSS'} ${effectiveGrade} "${aiStandardQuery}" educational standard`;
              let searchContext = '';
              try {
                  const searchResults = await webSearchProvider.search(searchQuery);
                  if (searchResults && searchResults.length > 0) {
                      searchContext = searchResults.slice(0, 5).map((r, i) =>
                          `[${i+1}] ${r.title}\n${r.snippet}\nURL: ${r.url}`
                      ).join('\n\n');
                  }
              } catch (searchErr) {
                  warnLog('[Standards] Web search failed:', searchErr.message);
              }
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
              const result = await callGemini(prompt, false, true);
              if (typeof result === 'object' && result.text) {
                  textToParse = result.text;
              } else if (typeof result === 'string') {
                  textToParse = result;
              }
          }

          const parsed = safeJsonParse(textToParse);
          if (Array.isArray(parsed)) {
              const standards = parsed;
              setSuggestedStandards(standards);
              if (standards.length === 0) {
                  addToast(t('toasts.no_standards_found'), "info");
              } else {
                  addToast(`Found ${standards.length} verified standards.`, "success");
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
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, standardsInput, targetStandards, dokLevel, rosterKey, sessionData, user, appId, activeSessionAppId, activeSessionCode, studentNickname, sourceLength, sourceTone, textFormat, fullPackTargetGroup, isAutoConfigEnabled, resourceCount, creativeMode, noText, fillInTheBlank, imageGenerationStyle, imageAspectRatio, useLowQualityVisuals, autoRemoveWords, globalPoints, wizardData, isWizardOpen, standardsLookupRegion, standardsLookupGoal, pdfFixResult, showExportPreview, aiStandardQuery, aiStandardRegion, imageRefinementInput, activeBlueprint, ai, alloBotRef, pdfPreviewRef, exportPreviewRef, setError, setIsProcessing, setGenerationStep, setGeneratedContent, setHistory, setActiveView, setActiveSessionCode, setActiveSessionAppId, setStudentNickname, setIsWizardOpen, setShowSourceGen, setSourceTopic, setSourceCustomInstructions, setSourceLength, setSourceTone, setTextFormat, setSelectedLanguages, setGradeLevel, setStandardsInput, setTargetStandards, setDokLevel, setStudentInterests, setSuggestedStandards, setIsLookingUpStandards, setStandardsLookupGoal, setStandardsLookupRegion, setExpandedTools, setShowUDLGuide, setUdlMessages, setGuidedFlowState, setIsRefiningImage, setShowImageRefineModal, setIsExecutingBlueprint, setBlueprintExecutionResult, setShowExportPreview, setInputText, setIsTeacherMode, setIsParentMode, setIsIndependentMode, setActiveSidebarTab, setDoc, setSessionData, setShowSessionModal, setImageRefinementInput, setIsFindingStandards, setShowWizard, setSourceLevel, setSourceVocabulary, setIncludeSourceCitations, setLeveledTextLanguage, setActiveBlueprint, setPersistedLessonDNA, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, flyToElement, getDefaultTitle, storageDB, updateDoc, doc, db, playSound, playAdventureEventSound, generateSessionCode, stripUndefined, uploadSessionAssets, safeSetItem, handleGenerateSource, applyDetailedAutoConfig, handleGenerate, fileInputRef } = deps;
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
    } else if (finalData.sourceMode === 'url' || finalData.sourceMode === 'search') {
      if (finalData.fetchedContent) {
          setInputText(finalData.fetchedContent);
      }
      const topic = finalData.searchQuery || finalData.topic;
      if (topic) setSourceTopic(topic);
      setExpandedTools(prev => prev.includes('source-input') ? prev : [...prev, 'source-input']);
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
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, standardsInput, targetStandards, dokLevel, rosterKey, sessionData, user, appId, activeSessionAppId, activeSessionCode, studentNickname, sourceLength, sourceTone, textFormat, fullPackTargetGroup, isAutoConfigEnabled, resourceCount, creativeMode, noText, fillInTheBlank, imageGenerationStyle, imageAspectRatio, useLowQualityVisuals, autoRemoveWords, globalPoints, wizardData, isWizardOpen, standardsLookupRegion, standardsLookupGoal, pdfFixResult, showExportPreview, aiStandardQuery, aiStandardRegion, imageRefinementInput, activeBlueprint, ai, alloBotRef, pdfPreviewRef, exportPreviewRef, setError, setIsProcessing, setGenerationStep, setGeneratedContent, setHistory, setActiveView, setActiveSessionCode, setActiveSessionAppId, setStudentNickname, setIsWizardOpen, setShowSourceGen, setSourceTopic, setSourceCustomInstructions, setSourceLength, setSourceTone, setTextFormat, setSelectedLanguages, setGradeLevel, setStandardsInput, setTargetStandards, setDokLevel, setStudentInterests, setSuggestedStandards, setIsLookingUpStandards, setStandardsLookupGoal, setStandardsLookupRegion, setExpandedTools, setShowUDLGuide, setUdlMessages, setGuidedFlowState, setIsRefiningImage, setShowImageRefineModal, setIsExecutingBlueprint, setBlueprintExecutionResult, setShowExportPreview, setInputText, setIsTeacherMode, setIsParentMode, setIsIndependentMode, setActiveSidebarTab, setDoc, setSessionData, setShowSessionModal, setImageRefinementInput, setIsFindingStandards, setShowWizard, setSourceLevel, setSourceVocabulary, setIncludeSourceCitations, setLeveledTextLanguage, setActiveBlueprint, setPersistedLessonDNA, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, flyToElement, getDefaultTitle, storageDB, updateDoc, doc, db, playSound, playAdventureEventSound, generateSessionCode, stripUndefined, uploadSessionAssets, safeSetItem, handleGenerateSource, applyDetailedAutoConfig, handleGenerate, fileInputRef } = deps;
  try { if (window._DEBUG_PHASE_O) console.log("[PhaseO] handleWizardStandardLookup fired"); } catch(_) {}
      try {
          const regionText = region ? `Constraint (Region or Framework): ${region}` : "Context: General/US";
          const isLocalBackend = ai?.backend === 'ollama' || ai?.backend === 'localai';

          if (isLocalBackend) {
              const searchQuery = `${region || 'CCSS'} ${grade} "${goal}" educational standard`;
              let searchContext = '';
              try {
                  const searchResults = await webSearchProvider.search(searchQuery);
                  if (searchResults && searchResults.length > 0) {
                      searchContext = searchResults.slice(0, 5).map((r, i) =>
                          `[${i+1}] ${r.title}\n${r.snippet}\nURL: ${r.url}`
                      ).join('\n\n');
                  }
              } catch (searchErr) {
                  warnLog('[Standards] Web search failed, LLM will use training data:', searchErr.message);
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
              return Array.isArray(parsed) ? parsed : [];
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
          const result = await callGemini(prompt, false, true);
          let textToParse = "";
          if (typeof result === 'object' && result.text) {
              textToParse = result.text;
          } else {
              textToParse = String(result || "");
          }
          const parsed = safeJsonParse(textToParse);
          return Array.isArray(parsed) ? parsed : [];
      } catch (e) { warnLog("Unhandled error in handleWizardStandardLookup:", e); }
};

const handleExecuteBlueprint = async (deps) => {
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, standardsInput, targetStandards, dokLevel, rosterKey, sessionData, user, appId, activeSessionAppId, activeSessionCode, studentNickname, sourceLength, sourceTone, textFormat, fullPackTargetGroup, isAutoConfigEnabled, resourceCount, creativeMode, noText, fillInTheBlank, imageGenerationStyle, imageAspectRatio, useLowQualityVisuals, autoRemoveWords, globalPoints, wizardData, isWizardOpen, standardsLookupRegion, standardsLookupGoal, pdfFixResult, showExportPreview, aiStandardQuery, aiStandardRegion, imageRefinementInput, activeBlueprint, ai, alloBotRef, pdfPreviewRef, exportPreviewRef, setError, setIsProcessing, setGenerationStep, setGeneratedContent, setHistory, setActiveView, setActiveSessionCode, setActiveSessionAppId, setStudentNickname, setIsWizardOpen, setShowSourceGen, setSourceTopic, setSourceCustomInstructions, setSourceLength, setSourceTone, setTextFormat, setSelectedLanguages, setGradeLevel, setStandardsInput, setTargetStandards, setDokLevel, setStudentInterests, setSuggestedStandards, setIsLookingUpStandards, setStandardsLookupGoal, setStandardsLookupRegion, setExpandedTools, setShowUDLGuide, setUdlMessages, setGuidedFlowState, setIsRefiningImage, setShowImageRefineModal, setIsExecutingBlueprint, setBlueprintExecutionResult, setShowExportPreview, setInputText, setIsTeacherMode, setIsParentMode, setIsIndependentMode, setActiveSidebarTab, setDoc, setSessionData, setShowSessionModal, setImageRefinementInput, setIsFindingStandards, setShowWizard, setSourceLevel, setSourceVocabulary, setIncludeSourceCitations, setLeveledTextLanguage, setActiveBlueprint, setPersistedLessonDNA, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, flyToElement, getDefaultTitle, storageDB, updateDoc, doc, db, playSound, playAdventureEventSound, generateSessionCode, stripUndefined, uploadSessionAssets, safeSetItem, handleGenerateSource, applyDetailedAutoConfig, handleGenerate, fileInputRef } = deps;
  try { if (window._DEBUG_PHASE_O) console.log("[PhaseO] handleExecuteBlueprint fired"); } catch(_) {}
    if (!activeBlueprint) return;
    const finalResources = activeBlueprint.recommendedResources;
    if (activeBlueprint.globalSettings) {
        if (activeBlueprint.globalSettings.gradeLevel) setGradeLevel(activeBlueprint.globalSettings.gradeLevel);
        if (activeBlueprint.globalSettings.tone) setSourceTone(activeBlueprint.globalSettings.tone);
    }
    applyDetailedAutoConfig(activeBlueprint);
    const lessonDNA = {
        grade: activeBlueprint.globalSettings?.gradeLevel || gradeLevel,
        topic: sourceTopic || "",
        standard: standardsInput || "",
        concepts: Array.isArray(activeBlueprint.lessonDNA?.goldenThread) ? activeBlueprint.lessonDNA.goldenThread : [],
        keyTerms: Array.isArray(activeBlueprint.lessonDNA?.keyTerms) ? activeBlueprint.lessonDNA.keyTerms : [],
        visualContext: "",
        essentialQuestion: activeBlueprint.lessonDNA?.essentialQuestion || "",
    };
    setActiveBlueprint(null);
    setShowUDLGuide(false);
    setIsProcessing(true);
    addToast(`Executing Blueprint: Generating ${finalResources.length} resources...`, "info");
    try {
        let currentSourceText = inputText;
        const existingAnalysis = history.slice().reverse().find(h => h && h.type === 'analysis');
        if (existingAnalysis?.data?.originalText) {
            currentSourceText = existingAnalysis.data.originalText;
        }
        let currentBlueprintHistory = [...history];
        for (let i = 0; i < finalResources.length; i++) {
            const type = finalResources[i];
            const aiDirective = activeBlueprint.toolDirectives?.[type] || "";
            const resultItem = await handleGenerate(type, null, i < finalResources.length - 1, currentSourceText, {
                customInstructions: aiDirective,
                historyOverride: currentBlueprintHistory,
                lessonDNA: lessonDNA
            }, false);
            if (resultItem) {
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
            }
            if (i < finalResources.length - 1) await new Promise(r => setTimeout(r, 1000));
        }
        setPersistedLessonDNA(lessonDNA);
        addToast(t('blueprint.execution_complete'), "success");
    } catch (e) {
        warnLog("Unhandled error:", e);
        addToast(t('blueprint.execution_error'), "error");
    } finally {
        setIsProcessing(false);
    }
};

window.AlloModules = window.AlloModules || {};
window.AlloModules.PhaseOHandlers = {
  startClassSession,
  handleRefineImage,
  handleFindStandards,
  handleWizardComplete,
  handleWizardStandardLookup,
  handleExecuteBlueprint,
};

window.AlloModules.PhaseOHandlersModule = true;
console.log("[PhaseOHandlers] 6 handlers registered");
})();
