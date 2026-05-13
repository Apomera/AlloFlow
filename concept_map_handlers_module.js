(function() {
'use strict';
if (window.AlloModules && window.AlloModules.CmapHandlersModule) { console.log('[CDN] CmapHandlersModule already loaded, skipping'); return; }
// concept_map_handlers_source.jsx - Phase I.3 of CDN modularization.
// 6 mid-tier handlers covering concept-map init/layout, batch roster
// generation, lesson plans, source auto-correct, and visual panel refine.

const handleInitializeMap = async (deps) => {
  const { generatedContent, conceptMapNodes, conceptMapEdges, mapContainerRef, hasAutoLayoutRunRef, setConceptMapNodes, setConceptMapEdges, setIsConceptMapReady, parseFlowChartData, handleAutoLayout, warnLog } = deps;
  try { if (window._DEBUG_CMAP_HANDLERS) console.log("[CmapHandlers] handleInitializeMap fired"); } catch(_) {}
      try {
          if (!generatedContent?.data) return;
          const { main, branches, structureType } = generatedContent?.data;
          if (structureType === 'Venn Diagram') {
              const newNodes = [];
              const colors = ['yellow', 'green', 'blue', 'orange', 'purple', 'pink', 'teal', 'rose'];
              if (Array.isArray(branches)) {
                  branches.forEach((branch, bIdx) => {
                      if (Array.isArray(branch.items)) {
                          branch.items.forEach((item, iIdx) => {
                              const itemId = `venn-${bIdx}-${iIdx}`;
                              newNodes.push({
                                  id: itemId,
                                  x: 50 + Math.random() * 700,
                                  y: 520 + Math.random() * 60,
                                  text: item,
                                  type: 'venn-token',
                                  colorVariant: colors[Math.floor(Math.random() * colors.length)]
                              });
                          });
                      }
                  });
              }
              setConceptMapNodes(newNodes);
              setConceptMapEdges([]);
              setIsConceptMapReady(true);
              return;
          }
          if (structureType === 'Flow Chart' || structureType === 'Process Flow / Sequence') {
              const flowData = parseFlowChartData(generatedContent?.data);
              setConceptMapNodes(flowData.nodes);
              setConceptMapEdges(flowData.edges);
              setIsConceptMapReady(true);
              hasAutoLayoutRunRef.current = true;
              return;
          }
          if (structureType === 'Cause and Effect') {
              const newNodes = [];
              const newEdges = [];
              const canvasWidth = mapContainerRef.current ? mapContainerRef.current.offsetWidth : 800;
              const canvasHeight = mapContainerRef.current ? mapContainerRef.current.offsetHeight : 600;
              const leftZoneX = canvasWidth * 0.25;
              const rightZoneX = canvasWidth * 0.75;
              const centerX = canvasWidth / 2;
              // Place main topic as a central banner
              const rootId = 'root';
              newNodes.push({
                  id: rootId,
                  x: centerX,
                  y: 50,
                  text: main,
                  type: 'ce-main',
              });
              if (Array.isArray(branches)) {
                  let causeCount = 0;
                  let effectCount = 0;
                  branches.forEach((branch, bIdx) => {
                      const titleLower = branch.title.toLowerCase();
                      const isCause = titleLower.includes('cause');
                      const isEffect = titleLower.includes('effect') || titleLower.includes('consequence');
                      const isChain = titleLower.includes('chain') || titleLower.includes('sequence');
                      if (isCause || (!isEffect && !isChain && bIdx === 0)) {
                          // Place cause items in left zone
                          if (Array.isArray(branch.items)) {
                              branch.items.forEach((item, iIdx) => {
                                  const itemId = `cause-${bIdx}-${iIdx}`;
                                  newNodes.push({
                                      id: itemId,
                                      x: leftZoneX + (Math.random() * 60 - 30),
                                      y: 150 + (causeCount * 80),
                                      text: item,
                                      type: 'cause-node'
                                  });
                                  newEdges.push({ id: `e-${rootId}-${itemId}`, fromId: rootId, toId: itemId });
                                  causeCount++;
                              });
                          }
                      } else if (isEffect || (!isCause && !isChain)) {
                          // Place effect items in right zone
                          if (Array.isArray(branch.items)) {
                              branch.items.forEach((item, iIdx) => {
                                  const itemId = `effect-${bIdx}-${iIdx}`;
                                  newNodes.push({
                                      id: itemId,
                                      x: rightZoneX + (Math.random() * 60 - 30),
                                      y: 150 + (effectCount * 80),
                                      text: item,
                                      type: 'effect-node'
                                  });
                                  effectCount++;
                              });
                          }
                      } else if (isChain) {
                          // Place chain items along the center
                          if (Array.isArray(branch.items)) {
                              branch.items.forEach((item, iIdx) => {
                                  const itemId = `chain-${bIdx}-${iIdx}`;
                                  newNodes.push({
                                      id: itemId,
                                      x: centerX,
                                      y: 200 + (iIdx * 100),
                                      text: item,
                                      type: 'chain-node'
                                  });
                                  if (iIdx > 0) {
                                      newEdges.push({ id: `e-chain-${bIdx}-${iIdx-1}-${iIdx}`, fromId: `chain-${bIdx}-${iIdx-1}`, toId: itemId });
                                  }
                              });
                          }
                      }
                  });
                  // Auto-link causes to effects
                  const causeNodes = newNodes.filter(n => n.type === 'cause-node');
                  const effectNodes = newNodes.filter(n => n.type === 'effect-node');
                  if (causeNodes.length > 0 && effectNodes.length > 0) {
                      causeNodes.forEach(cn => {
                          effectNodes.forEach(en => {
                              newEdges.push({ id: `e-${cn.id}-${en.id}`, fromId: cn.id, toId: en.id, style: 'dashed' });
                          });
                      });
                  }
              }
              setConceptMapNodes(newNodes);
              setConceptMapEdges(newEdges);
              setIsConceptMapReady(true);
              hasAutoLayoutRunRef.current = true;
              return;
          }
          if (structureType === 'Problem Solution') {
              const newNodes = [];
              const newEdges = [];
              const canvasWidth = mapContainerRef.current ? mapContainerRef.current.offsetWidth : 800;
              const canvasHeight = mapContainerRef.current ? mapContainerRef.current.offsetHeight : 600;
              const centerX = canvasWidth / 2;
              // Problem node at top
              const rootId = 'root';
              newNodes.push({
                  id: rootId,
                  x: centerX,
                  y: 70,
                  text: main,
                  type: 'ps-problem',
              });
              if (Array.isArray(branches)) {
                  const outcomeIdx = branches.findIndex(b =>
                      b.title.toLowerCase().includes('outcome') ||
                      b.title.toLowerCase().includes('result') ||
                      b.title.toLowerCase().includes('evaluation')
                  );
                  const outcomeBranch = outcomeIdx !== -1 ? branches[outcomeIdx] : null;
                  const solutionBranches = branches.filter((_, i) => i !== outcomeIdx);
                  const solCount = solutionBranches.length;
                  const solSlice = canvasWidth / Math.max(1, solCount + 1);
                  solutionBranches.forEach((branch, bIdx) => {
                      const branchId = `sol-${bIdx}`;
                      const bx = solSlice * (bIdx + 1);
                      const by = 220;
                      newNodes.push({
                          id: branchId,
                          x: bx,
                          y: by,
                          text: branch.title,
                          type: 'ps-solution'
                      });
                      newEdges.push({ id: `e-${rootId}-${branchId}`, fromId: rootId, toId: branchId });
                      // Solution sub-items
                      if (Array.isArray(branch.items)) {
                          branch.items.forEach((item, iIdx) => {
                              const itemId = `sol-item-${bIdx}-${iIdx}`;
                              newNodes.push({
                                  id: itemId,
                                  x: bx + (Math.random() * 40 - 20),
                                  y: by + 100 + (iIdx * 70),
                                  text: item,
                                  type: 'ps-solution-item'
                              });
                              newEdges.push({ id: `e-${branchId}-${itemId}`, fromId: branchId, toId: itemId });
                          });
                      }
                  });
                  // Outcome node at bottom
                  const outcomeId = 'outcome';
                  const outcomeText = outcomeBranch ? outcomeBranch.title : 'Outcome';
                  const maxY = Math.max(...newNodes.map(n => n.y), 400);
                  newNodes.push({
                      id: outcomeId,
                      x: centerX,
                      y: maxY + 120,
                      text: outcomeText,
                      type: 'ps-outcome'
                  });
                  // Connect solutions to outcome
                  solutionBranches.forEach((_, bIdx) => {
                      const branchId = `sol-${bIdx}`;
                      newEdges.push({ id: `e-${branchId}-${outcomeId}`, fromId: branchId, toId: outcomeId });
                  });
                  // Outcome sub-items
                  if (outcomeBranch && Array.isArray(outcomeBranch.items)) {
                      outcomeBranch.items.forEach((item, iIdx) => {
                          const itemId = `outcome-item-${iIdx}`;
                          newNodes.push({
                              id: itemId,
                              x: centerX + (iIdx * 160) - ((outcomeBranch.items.length - 1) * 80),
                              y: maxY + 220,
                              text: item,
                              type: 'ps-outcome-item'
                          });
                          newEdges.push({ id: `e-${outcomeId}-${itemId}`, fromId: outcomeId, toId: itemId });
                      });
                  }
              }
              setConceptMapNodes(newNodes);
              setConceptMapEdges(newEdges);
              setIsConceptMapReady(true);
              hasAutoLayoutRunRef.current = true;
              return;
          }
          if (structureType === 'Structured Outline') {
              const newNodes = [];
              const newEdges = [];
              const canvasWidth = mapContainerRef.current ? mapContainerRef.current.offsetWidth : 800;
              const centerX = canvasWidth / 2;
              const rootId = 'root';
              newNodes.push({
                  id: rootId,
                  x: centerX,
                  y: 50,
                  text: main,
                  type: 'outline-main',
              });
              if (Array.isArray(branches)) {
                  const branchCount = branches.length;
                  const slice = canvasWidth / Math.max(1, branchCount);
                  branches.forEach((branch, bIdx) => {
                      const branchId = `b-${bIdx}`;
                      const bx = (slice * bIdx) + (slice / 2);
                      const by = 200;
                      newNodes.push({
                          id: branchId,
                          x: bx,
                          y: by,
                          text: branch.title,
                          type: 'outline-branch'
                      });
                      newEdges.push({ id: `e-${rootId}-${branchId}`, fromId: rootId, toId: branchId });
                      if (Array.isArray(branch.items)) {
                          branch.items.forEach((item, iIdx) => {
                              const itemId = `i-${bIdx}-${iIdx}`;
                              newNodes.push({
                                  id: itemId,
                                  x: bx,
                                  y: by + 120 + (iIdx * 100),
                                  text: item,
                                  type: 'outline-item'
                              });
                              newEdges.push({ id: `e-${branchId}-${itemId}`, fromId: branchId, toId: itemId });
                          });
                      }
                  });
              }
              setConceptMapNodes(newNodes);
              setConceptMapEdges(newEdges);
              setIsConceptMapReady(true);
              hasAutoLayoutRunRef.current = true;
              return;
          }
          const newNodes = [];
          const newEdges = [];
          const rootId = 'root';
          newNodes.push({
              id: rootId,
              x: 350,
              y: 50,
              text: main,
              type: 'main',
          });
          if (Array.isArray(branches)) {
              branches.forEach((branch, bIdx) => {
                  const branchId = `b-${bIdx}`;
                  const bx = 50 + (bIdx * 200) % 700;
                  const by = 200 + Math.floor(bIdx / 4) * 150;
                  newNodes.push({
                      id: branchId,
                      x: bx,
                      y: by,
                      text: branch.title,
                      type: 'branch'
                  });
                  newEdges.push({ id: `e-${rootId}-${branchId}`, fromId: rootId, toId: branchId });
                  if (Array.isArray(branch.items)) {
                      branch.items.forEach((item, iIdx) => {
                          const itemId = `i-${bIdx}-${iIdx}`;
                          newNodes.push({
                              id: itemId,
                              x: bx + (Math.random() * 40 - 20),
                              y: by + 120 + (iIdx * 60),
                              text: item,
                              type: 'item'
                          });
                          newEdges.push({ id: `e-${branchId}-${itemId}`, fromId: branchId, toId: itemId });
                      });
                  }
              });
          }
          setConceptMapNodes(newNodes);
          setConceptMapEdges(newEdges);
          await handleAutoLayout(newNodes, newEdges, deps);
          setIsConceptMapReady(true);
      } catch (e) { warnLog("Unhandled error in handleInitializeMap:", e); }
};

const handleAutoLayout = async (nodesInput, edgesInput, deps) => {
  const { generatedContent, conceptMapNodes, conceptMapEdges, isFullscreen, isTeacherMode, mapContainerRef, setConceptMapNodes, setIsProcessing, setGenerationStep, calculateFlowLayout, callGemini, safeJsonParse, t, addToast, playSound, warnLog } = deps;
  try { if (window._DEBUG_CMAP_HANDLERS) console.log("[CmapHandlers] handleAutoLayout fired"); } catch(_) {}
      const currentNodes = Array.isArray(nodesInput) ? nodesInput : conceptMapNodes;
      const currentEdges = Array.isArray(edgesInput) ? edgesInput : conceptMapEdges;
      if (currentNodes.length === 0) return;
      const isFlowChart = generatedContent?.data?.structureType === 'Flow Chart' || generatedContent?.data?.structureType === 'Process Flow / Sequence';
      let width = 1000;
      let height = 800;
      if (mapContainerRef.current) {
          width = mapContainerRef.current.offsetWidth;
          height = mapContainerRef.current.offsetHeight;
      } else {
          const isWide = isFullscreen || !isTeacherMode;
          const availableWidth = window.innerWidth * (isWide ? 0.9 : 0.6);
          width = Math.floor(availableWidth);
          height = Math.floor(window.innerHeight * 0.75);
      }
      if (isFlowChart) {
          const layoutNodes = calculateFlowLayout(currentNodes, width);
          setConceptMapNodes(layoutNodes);
          addToast(t('concept_map.auto_layout.toast_flow_applied'), "success");
          return;
      }
      setIsProcessing(true);
      setGenerationStep(t('concept_map.auto_layout.analyzing'));
      addToast(t('concept_map.auto_layout.toast_organizing'), "info");
      const centerX = Math.floor(width / 2);
      const centerY = Math.floor(height / 2);
      try {
          const nodesJson = JSON.stringify(currentNodes.map(n => ({ id: n.id, text: n.text, type: n.type })));
          const edgesJson = JSON.stringify(currentEdges);
          const prompt = `
            You are an expert Information Designer and Graph Layout Engine.
            Goal: Analyze the semantic relationships in the provided Concept Map data and determine the optimal 2D spatial arrangement for the nodes.
            Canvas Dimensions: ${width}px width x ${height}px height.
            Center Point: ${centerX}, ${centerY}.
            Input Data:
            Nodes: ${nodesJson}
            Edges: ${edgesJson}
            Instructions:
            1. Analyze the content. Determine the logical structure (Hierarchy, Hub-and-Spoke, Process Flow, or Cluster).
            2. Assign (x, y) coordinates to every node ID to create a visually balanced, non-overlapping layout.
            3. Rules:
               - Keep the main/root topic near the top (y=50-100) or center (y=${centerY}) depending on the structure.
               - Space nodes out to avoid crowding (minimum 150px distance).
               - Keep within bounds: x (50-${width-50}), y (50-${height-50}).
            Return ONLY a JSON object mapping Node IDs to coordinates:
            {
                "node_id_1": { "x": 100, "y": 200 },
                "node_id_2": { "x": 350, "y": 400 }
            }
          `;
          const result = await callGemini(prompt, true);
          let layoutMap = safeJsonParse(result);
          if (!layoutMap) {
             warnLog("Auto-layout JSON parse failed. Attempting AI repair...");
             const repairPrompt = `
                The following JSON is malformed (likely missing commas or braces). Fix the syntax and return valid JSON.
                ${result}
             `;
             const repairResult = await callGemini(repairPrompt, true);
             layoutMap = safeJsonParse(repairResult);
          }
          if (!layoutMap) {
              throw new Error("Could not parse layout coordinates.");
          }
          setConceptMapNodes(prev => prev.map(node => {
              if (layoutMap[node.id]) {
                  return {
                      ...node,
                      x: Math.max(50, Math.min(width - 50, layoutMap[node.id].x)),
                      y: Math.max(50, Math.min(height - 50, layoutMap[node.id].y))
                  };
              }
              return node;
          }));
          addToast(t('concept_map.auto_layout.toast_optimized'), "success");
          if (playSound) playSound('reveal');
      } catch (e) {
          warnLog("Auto-layout failed", e);
          addToast(t('concept_map.auto_layout.toast_failed'), "error");
      } finally {
          setIsProcessing(false);
      }
};

const handleBatchGenerateForRoster = async (resourceTypes = ['simplified'], deps) => {
  const { rosterKey, history, inputText, gradeLevel, leveledTextLanguage, studentInterests, dokLevel, leveledTextCustomInstructions, selectedLanguages, targetStandards, useEmojis, textFormat, setGradeLevel, setLeveledTextLanguage, setStudentInterests, setDokLevel, setLeveledTextCustomInstructions, setSelectedLanguages, setTargetStandards, setStandardInputValue, setUseEmojis, setTextFormat, setIsProcessing, setGenerationStep, addToast, t, warnLog, handleGenerate } = deps;
  try { if (window._DEBUG_CMAP_HANDLERS) console.log("[CmapHandlers] handleBatchGenerateForRoster fired"); } catch(_) {}
      if (!rosterKey?.groups || Object.keys(rosterKey.groups).length === 0) {
          addToast(t('roster.no_groups_to_generate') || 'Add groups to your roster key first', 'warning');
          return;
      }
      const textToProcess = (() => {
          const latestAnalysis = history.slice().reverse().find(h => h && h.type === 'analysis');
          if (latestAnalysis?.data?.originalText) {
              const raw = latestAnalysis.data.originalText;
              const sep = "### Accuracy Check References";
              return raw.includes(sep) ? raw.split(sep)[0].trim() : raw;
          }
          return inputText;
      })();
      if (!textToProcess || !textToProcess.trim()) {
          addToast(t('process.enter_text') || 'Please enter or paste text first', 'warning');
          return;
      }
      const groupEntries = Object.entries(rosterKey.groups);
      const totalSteps = groupEntries.length * resourceTypes.length;
      setIsProcessing(true);
      let successCount = 0;
      let currentStep = 0;
      try {
          for (let i = 0; i < groupEntries.length; i++) {
              const [groupId, group] = groupEntries[i];
              const profile = group.profile || {};
              const saved = {
                  grade: gradeLevel, lang: leveledTextLanguage,
                  interests: studentInterests, dok: dokLevel,
                  custom: leveledTextCustomInstructions,
                  selectedLangs: selectedLanguages,
                  standards: targetStandards,
                  emojis: useEmojis,
                  fmt: textFormat
              };
              if (profile.gradeLevel) setGradeLevel(profile.gradeLevel);
              if (profile.leveledTextLanguage) setLeveledTextLanguage(profile.leveledTextLanguage);
              if (profile.studentInterests) {
                  const interests = Array.isArray(profile.studentInterests) ? profile.studentInterests : profile.studentInterests.split(',').map(s => s.trim()).filter(Boolean);
                  setStudentInterests(interests);
              }
              if (profile.dokLevel) setDokLevel(profile.dokLevel);
              if (profile.leveledTextCustomInstructions) setLeveledTextCustomInstructions(profile.leveledTextCustomInstructions);
              if (profile.selectedLanguages && Array.isArray(profile.selectedLanguages)) setSelectedLanguages(profile.selectedLanguages);
              if (profile.targetStandards && Array.isArray(profile.targetStandards)) { setTargetStandards(profile.targetStandards); setStandardInputValue(''); }
              if (profile.useEmojis !== undefined) setUseEmojis(profile.useEmojis);
              if (profile.textFormat) setTextFormat(profile.textFormat);
              await new Promise(r => setTimeout(r, 100));
              for (let j = 0; j < resourceTypes.length; j++) {
                  const type = resourceTypes[j];
                  currentStep++;
                  const isLast = currentStep === totalSteps;
                  const typeLabel = type === 'simplified' ? 'Adapted Text' : type === 'glossary' ? 'Glossary' : type === 'quiz' ? 'Quiz' : type === 'sentence-frames' ? 'Sentence Frames' : type;
                  setGenerationStep(`${typeLabel} for "${group.name}" (${currentStep}/${totalSteps})`);
                  await handleGenerate(type, profile.leveledTextLanguage || null, !isLast, textToProcess, {
                      grade: profile.gradeLevel || gradeLevel,
                      rosterGroupId: groupId,
                      rosterGroupName: group.name,
                      rosterGroupColor: group.color || '#4F46E5'
                  }, false);
                  successCount++;
                  if (!isLast) await new Promise(r => setTimeout(r, 1000));
              }
              setGradeLevel(saved.grade);
              setLeveledTextLanguage(saved.lang);
              setStudentInterests(saved.interests);
              setDokLevel(saved.dok);
              setLeveledTextCustomInstructions(saved.custom);
              setSelectedLanguages(saved.selectedLangs);
              setTargetStandards(saved.standards);
              setUseEmojis(saved.emojis);
              setTextFormat(saved.fmt);
          }
          addToast(`Generated ${successCount} resources for ${groupEntries.length} groups!`, 'success');
      } catch (e) {
          warnLog("Roster batch generation error:", e);
          addToast(t('roster.batch_failed') || 'Batch generation failed', 'error');
      } finally {
          setIsProcessing(false);
          setGenerationStep('');
      }
};

const handleGenerateLessonPlan = async (switchView = true, deps) => {
  const { inputText, gradeLevel, isIndependentMode, isParentMode, currentUiLanguage, lessonCustomAdditions, history, alloBotRef, setIsProcessing, setGenerationStep, setGeneratedContent, setActiveView, setHistory, setError, addToast, t, callGemini, cleanJson, safeJsonParse, warnLog, getLessonContext, getAssetManifest, buildStudyGuidePrompt, buildParentGuidePrompt, buildLessonPlanPrompt, flyToElement } = deps;
  try { if (window._DEBUG_CMAP_HANDLERS) console.log("[CmapHandlers] handleGenerateLessonPlan fired"); } catch(_) {}
        if (!inputText.trim()) return;
        setIsProcessing(true);
        if (alloBotRef.current) {
             const feedback = t('bot_events.feedback_lesson_generic').replace('{grade}', gradeLevel || "general");
             alloBotRef.current.speak(feedback);
        }
        let stepLabelKey = 'lesson_plan.status_synthesizing';
        if (isIndependentMode) stepLabelKey = 'lesson_plan.status_creating_study';
        else if (isParentMode) stepLabelKey = 'lesson_plan.status_creating_family';
        setGenerationStep(t(stepLabelKey));
        let startToastKey = 'lesson_plan.toast_drafting_plan';
        if (isIndependentMode) startToastKey = 'lesson_plan.toast_drafting_study';
        else if (isParentMode) startToastKey = 'lesson_plan.toast_drafting_family';
        addToast(t(startToastKey), "info");
        try {
            const context = getLessonContext();
            const assetManifest = getAssetManifest(history);
            let prompt;
            if (isIndependentMode) {
                prompt = buildStudyGuidePrompt(context, currentUiLanguage);
            } else if (isParentMode) {
                prompt = buildParentGuidePrompt(context, currentUiLanguage);
            } else {
                prompt = buildLessonPlanPrompt(context, assetManifest, currentUiLanguage, lessonCustomAdditions);
            }
            const result = await callGemini(prompt, true);
            let content;
            try {
                content = safeJsonParse(result);
                if (!content) {
                     const cleaned = cleanJson(result);
                     content = JSON.parse(cleaned);
                }
            } catch (parseErr) {
                warnLog("Lesson Plan Parse Error:", parseErr);
                throw new Error("Failed to parse Lesson Plan JSON. The AI response was not valid.");
            }
            if (!content.extensions) content.extensions = [];
            if (!Array.isArray(content.extensions)) {
                if (content.extensions) {
                    content.extensions = [content.extensions];
                } else {
                    content.extensions = [];
                }
            }
            const newItem = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                type: 'lesson-plan',
                data: content,
                meta: `${gradeLevel} - ${isIndependentMode ? t('common.study_guide') : (isParentMode ? t('common.family_guide') : t('common.udl_aligned'))}`,
                title: isIndependentMode ? t('common.study_guide') : (isParentMode ? t('common.family_learning_guide') : t('common.udl_lesson_plan')),
                timestamp: new Date(),
                config: {}
            };
            if (switchView) {
                setGeneratedContent({ type: 'lesson-plan', data: content, id: newItem.id });
                setActiveView('lesson-plan');
            }
            setHistory(prev => [...prev, newItem]);
            let successToastKey = 'lesson_plan.success_plan';
            if (isIndependentMode) successToastKey = 'lesson_plan.success_study';
            else if (isParentMode) successToastKey = 'lesson_plan.success_family';
            addToast(t(successToastKey), "success");
            flyToElement('tour-tool-lesson-plan');
        } catch (e) {
            warnLog("Unhandled error:", e);
            setError(t('lesson_plan.error_gen_failed'));
            addToast(t('lesson_plan.toast_gen_failed'), "error");
        } finally {
            setIsProcessing(false);
        }
};

const handleAutoCorrectSource = async (deps) => {
  const { generatedContent, selectedDiscrepancies, inputText, setIsProcessing, setGenerationStep, setInputText, setError, addToast, t, callGemini, warnLog, chunkText, handleGenerate } = deps;
  try { if (window._DEBUG_CMAP_HANDLERS) console.log("[CmapHandlers] handleAutoCorrectSource fired"); } catch(_) {}
      if (!generatedContent || !generatedContent?.data || !generatedContent?.data.accuracy?.discrepancies) return;
      const allDiscrepancies = generatedContent?.data.accuracy.discrepancies;
      const discrepanciesToFix = allDiscrepancies.filter((_, index) => selectedDiscrepancies.has(index));
      if (discrepanciesToFix.length === 0) {
          addToast(t('process.select_error'), "info");
          return;
      }
      const sourceText = generatedContent?.data.originalText || inputText;
      setIsProcessing(true);
      setGenerationStep(t('process.correcting'));
      addToast(t('process.fixing', { count: discrepanciesToFix.length }), "info");
      try {
          const chunks = chunkText(sourceText, 8000);
          let correctedParts = [];
          for (let i = 0; i < chunks.length; i++) {
              setGenerationStep(`${t('process.correcting')} (${i+1}/${chunks.length})...`);
              const chunk = chunks[i];
              const fixPrompt = `
                You are an expert educational editor.
                Task: Review the following text segment (${i+1}/${chunks.length}) and correct factual errors based strictly on the list below.
                List of Known Discrepancies to Fix:
                ${discrepanciesToFix.map(d => `- ${d}`).join('\n')}
                Text Segment to Review:
                "${chunk}",
                Instructions:
                1. Check if any of the "Discrepancies" appear in this specific text segment.
                2. If found, rewrite the specific sentence/paragraph to be factually accurate.
                3. If NO discrepancies are found in this segment, return the text EXACTLY as is.
                4. Preserve original markdown formatting, citations [⁽¹⁾](url), and structure.
                5. Do NOT add conversational filler ("Here is the fixed text"). Return ONLY the text content.
              `;
              const partResult = await callGemini(fixPrompt);
              correctedParts.push(partResult || chunk);
              if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 500));
          }
          const finalCorrectedText = correctedParts.map(p => p.trim()).join('\n\n');
          setInputText(finalCorrectedText);
          addToast(t('process.correction_success'), "success");
          await handleGenerate('analysis', null, false, finalCorrectedText);
      } catch (e) {
          warnLog("Auto-correct failed", e);
          setError(t('process.correction_failed_msg'));
          addToast(t('process.correction_error'), "error");
          setIsProcessing(false);
      }
};

const handleRefinePanel = async (panelIdx, editInstruction, deps) => {
  const { generatedContent, setIsProcessing, setGenerationStep, setGeneratedContent, setHistory, addToast, t, warnLog, callGeminiImageEdit } = deps;
  try { if (window._DEBUG_CMAP_HANDLERS) console.log("[CmapHandlers] handleRefinePanel fired"); } catch(_) {}
      if (!generatedContent?.data?.visualPlan) return;
      const plan = generatedContent?.data.visualPlan;
      const panel = plan.panels[panelIdx];
      if (!panel?.imageUrl) return;
      setIsProcessing(true);
      setGenerationStep(t('visual_director.refining_panel') || 'Refining panel...');
      try {
          const rawBase64 = panel.imageUrl.split(',')[1];
          const refinedUrl = await callGeminiImageEdit(editInstruction, rawBase64);
          if (refinedUrl) {
              const updatedPanels = [...plan.panels];
              updatedPanels[panelIdx] = { ...panel, imageUrl: refinedUrl };
              const updatedPlan = { ...plan, panels: updatedPanels };
              const updatedContent = {
                  ...generatedContent,
                  data: { ...generatedContent?.data, visualPlan: updatedPlan, imageUrl: updatedPanels[0].imageUrl }
              };
              setGeneratedContent(updatedContent);
              setHistory(prev => prev.map(item => item.id === generatedContent.id ? updatedContent : item));
              addToast(t('visual_director.panel_refined') || 'Panel refined!', 'success');
          }
      } catch (e) {
          warnLog('[ArtDirector] Panel refinement failed:', e);
          addToast(t('visual_director.refine_failed') || 'Refinement failed', 'error');
      } finally {
          setIsProcessing(false);
      }
};

window.AlloModules = window.AlloModules || {};
window.AlloModules.CmapHandlers = {
  handleInitializeMap,
  handleAutoLayout,
  handleBatchGenerateForRoster,
  handleGenerateLessonPlan,
  handleAutoCorrectSource,
  handleRefinePanel,
};

window.AlloModules.CmapHandlersModule = true;
console.log('[CmapHandlers] 6 handlers registered');
})();
