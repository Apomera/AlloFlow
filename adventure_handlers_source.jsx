// adventure_handlers_source.jsx - 7 adventure interaction handlers extracted
// from AlloFlowANTI.txt 2026-04-25 (Phase F of CDN modularization).
//
// Each handler takes (args..., deps) where `deps` carries all closure-
// captured React state, setters, refs, and utility functions.
// Destructured at top; body is byte-identical to the original monolith.
//
// A try/catch wrapper at each handler entry surfaces runtime errors to
// console.error before re-throwing — Phase E learned that swallowed
// errors masquerade as a generic "Sorry" toast and are murder to debug.

const getAssistedKnowledgeContext = (state) => {
  const learned = Array.isArray(state?.assistedKnowledge)
    ? state.assistedKnowledge.map(entry => String(entry || '').trim()).filter(Boolean).slice(-8)
    : [];
  if (!learned.length) return '';
  return `\n--- GUIDING HAND KNOWLEDGE (ASSISTED, NOT DEMONSTRATED MASTERY) ---\n${learned.map((entry, index) => `${index + 1}. ${entry}`).join('\n')}\nUse this knowledge when it is relevant in later scenes, but never treat it as evidence that the student independently demonstrated the concept.\n`;
};

let activeAdventureEstablishingShot = null;
const cancelAdventureEstablishingShot = () => {
  const request = activeAdventureEstablishingShot;
  if (!request) return false;
  request.cancelled = true;
  if (request.timeoutId != null) clearTimeout(request.timeoutId);
  if (activeAdventureEstablishingShot === request) activeAdventureEstablishingShot = null;
  return true;
};

const scheduleAdventureEstablishingShot = ({ prompt, callImagen, setAdventureState, warnLog, delayMs = 250 }) => {
  cancelAdventureEstablishingShot();
  const request = { cancelled: false, timeoutId: null };
  activeAdventureEstablishingShot = request;
  request.timeoutId = setTimeout(async () => {
      request.timeoutId = null;
      if (request.cancelled) return;
      try {
          const url = await callImagen(prompt);
          if (request.cancelled || !url) return;
          setAdventureState(prev => prev.isReviewingCharacters
              ? { ...prev, sceneImage: url, isImageLoading: false }
              : prev);
      } catch (establishingErr) {
          if (!request.cancelled) warnLog('Adventure establishing shot failed; waiting for the confirmed cast image.', establishingErr);
      } finally {
          if (activeAdventureEstablishingShot === request) activeAdventureEstablishingShot = null;
      }
  }, Math.max(0, Number(delayMs) || 0));
  return request;
};

const executeStartAdventure = async (contextOverride = null, deps) => {
  const { adventureState, adventureTextInput, adventureInputMode, adventureLanguageMode, adventureChanceMode, adventureConsistentCharacters, adventureArtStyle, adventureCustomArtStyle, adventureCustomInstructions, adventureFreeResponseEnabled, history, inputText, sourceTopic, gradeLevel, standardsInput, studentInterests, isIndependentMode, isTeacherMode, factionResourceMode, enableFactionResources, selectedLanguages, currentUiLanguage, apiKey, appId, activeSessionAppId, activeSessionCode, globalPoints, sessionData, user, alloBotRef, lastTurnSnapshot, lastReadTurnRef, pdfPreviewRef, exportPreviewRef, setActiveView, setAdventureState, setAdventureTextInput, setDiceResult, setFailedAdventureAction, setGeneratedContent, setGenerationStep, setHasSavedAdventure, setHistory, setIsResumingAdventure, setPendingAdventureUpdate, setShowDice, setShowGlobalLevelUp, setShowNewGameSetup, callGemini, callGeminiVision, callImagen, addToast, t, warnLog, debugLog, cleanJson, archiveAdventureImage, SafetyContentChecker, handleAiSafetyFlag, playAdventureEventSound, handleScoreUpdate, getAdventureGlossaryTerms, generateAdventureImage, generateNarrativeLedger, generatePixelArtItem, detectClimaxArchetype, flyToElement, resilientJsonParse, storageDB, updateDoc, doc, db, ADVENTURE_GUARDRAIL, DEBATE_INVISIBLE_INSTRUCTIONS, INVISIBLE_NARRATOR_INSTRUCTIONS, NARRATIVE_GUARDRAILS, SYSTEM_INVISIBLE_INSTRUCTIONS, SYSTEM_STATE_EXAMPLES, aiBotsActive, narrativeLedger, isAdventureStoryMode, isImmersiveMode, isReviewingCharacters, isShopOpen, isSocialStoryMode, debateTopic, socialStoryFocus, stopPlayback, playSound, resetDebate } = deps;
  try { if (window._DEBUG_ADVENTURE) console.log("[Adventure] executeStartAdventure fired"); } catch(_) {}
    const latestAnalysis = history.slice().reverse().find(h => h && h.type === 'analysis');
    const sourceText = (latestAnalysis && latestAnalysis.data && latestAnalysis.data.originalText)
        ? latestAnalysis.data.originalText
        : inputText;
    if (!sourceText.trim()) {
        addToast(t('adventure.no_text_error'), "error");
        return;
    }
    stopPlayback();
    lastReadTurnRef.current = 0;
    setGenerationStep('Initializing simulation parameters...');
    setActiveView('adventure');
    let initialGold = 0;
    if (activeSessionCode && sessionData?.roster) {
        const students = Object.values(sessionData.roster);
        if (students.length > 0) {
            const totalClassXP = students.reduce((sum, s) => sum + (s.xp || 0), 0);
            const avgXP = totalClassXP / students.length;
            initialGold = 50 + Math.floor(avgXP / 50);
            addToast(t('session.toast_economy_active', {
                gold: initialGold,
                xp: Math.round(avgXP)
            }), "success");
        } else {
            initialGold = 50;
        }
    } else {
        initialGold = Math.floor(globalPoints / 2);
    }
    const isSequel = Boolean(contextOverride);
    const startingLevel = isSequel ? Math.max(1, Number(adventureState.level) || 1) : 1;
    const startingXp = isSequel ? Math.max(0, Number(adventureState.xp) || 0) : 0;
    const startingXpToNext = isSequel ? Math.max(1, Number(adventureState.xpToNextLevel) || 100) : 100;
    setAdventureState(prev => ({
      ...prev,
      history: [],
      currentScene: null,
      isLoading: true,
      isGameOver: false,
      turnCount: 0,
      level: startingLevel,
      xp: startingXp,
      xpToNextLevel: startingXpToNext,
      energy: 100,
      sceneImage: null,
      sceneImagePreview: null,
      isImageLoading: false,
      imagePolishStage: null,
      loadingStage: 'Building your opening scene…',
      inventory: [],
      voiceMap: {},
      gold: initialGold,
      isShopOpen: true,
      activeRollModifier: 0,
      activeXpMultiplier: 1,
      activeGoldBuff: false,
      activeGoldBuffTurns: 0,
      narrativeLedger: '',
      assistedKnowledge: [],
      lastKeyItemTurn: 0,
      debateMomentum: 50,
      debateTopic: null,
      debatePhase: 'setup',
      stats: {
        successes: 0,
        failures: 0,
        decisions: 0,
        conceptsFound: []
      },
      climax: {
          isActive: false,
          archetype: 'Auto',
          masteryScore: 0,
          attempts: 0
      },
      missionReportDismissed: false,
      canStartSequel: false
    }));
    lastReadTurnRef.current = 0;
    setAdventureTextInput('');
    addToast(adventureInputMode === 'debate' ? t('adventure.status_messages.initiating_debate') : t('adventure.status_messages.starting'), "info");
    try {
      if (adventureInputMode !== 'debate' && adventureInputMode !== 'system') {
          detectClimaxArchetype(sourceText, adventureCustomInstructions).then(archetype => {
              debugLog("Adventure Archetype Detected:", archetype);
              setAdventureState(prev => ({
                  ...prev,
                  climax: { ...prev.climax, archetype: archetype }
              }));
          });
      }
      const keyTerms = getAdventureGlossaryTerms(history, adventureLanguageMode);
      const analysisItem = history.slice().reverse().find(h => h && h.type === 'analysis');
      const keyConcepts = analysisItem ? analysisItem.data.concepts.join(', ') : '';
      const effectiveInstructions = contextOverride
          ? `${contextOverride}\n\n${adventureCustomInstructions}`
          : adventureCustomInstructions;
      let langInstruction = "Language: English.";
      if (adventureLanguageMode !== 'English') {
          if (adventureLanguageMode === 'All + English') {
               langInstruction = `Language: Multilingual mix of ${selectedLanguages.join(', ')}. CRITICAL: Provide English translations for ALL narrative text and choices.`;
          } else if (adventureLanguageMode.endsWith(' + English')) {
               const targetLang = adventureLanguageMode.replace(' + English', '');
               langInstruction = `Language: ${targetLang}. CRITICAL: Provide English translations for ALL narrative text and choices immediately following the target language text.`;
          } else {
               langInstruction = `Language: ${adventureLanguageMode}. Do NOT provide English translations.`;
          }
          langInstruction += ` STRICT DIALECT ADHERENCE: If a specific dialect is named (e.g. 'Brazilian Portuguese' vs 'European Portuguese'), explicitly use that region's vocabulary, spelling, and grammar conventions.`;
      }
      const toneInstruction = isAdventureStoryMode
          ? "TONE: Story Time Mode (Family Friendly). Focus on exploration, mystery, and puzzles. Avoid combat or intense danger."
          : "TONE: Standard Adventure. Balance exploration with risk and consequences.";
      const independentInstruction = isIndependentMode
          ? "CONTEXT: The user is an independent learner (Self-Study). Encourage reflection."
          : "";
      const socialStoryInstruction = isSocialStoryMode
          ? `FOCUS: Social Story Mode (SEL). The narrative MUST focus on social-emotional learning, conflict resolution, and understanding perspectives. ${socialStoryFocus ? `CORE THEME: The story must specifically address the skill/concept of: "${socialStoryFocus}".` : ''} Scenarios should be realistic or metaphorical but centered on social dynamics.`
          : "";
      const interactionInstruction = adventureFreeResponseEnabled
          ? "INTERACTION: Free Text. The student will type their own response. Return an empty 'options' array: []. CRITICAL: The opening scene MUST END with a concrete, unresolved problem or decision the student must respond to (a direct question, an obstacle, an urgent situation) — never end on pure description; the last 1-2 sentences present the challenge."
          : "INTERACTION: Multiple Choice. Provide 6 distinct options.";
      const jsonOptionsExample = adventureFreeResponseEnabled
          ? "[]"
          : `["Choice 1", "Choice 2", "Choice 3", "Choice 4", "Choice 5", "Choice 6"]`;
            if (adventureInputMode === 'debate') {
          prompt = `
            You are a Debate Moderator setting up an educational debate simulation.
            Source Material Context: "${sourceText.substring(0, 1500)}..."
            Debate Topic: "${sourceTopic || "The provided text"}"
            Target Audience: ${gradeLevel} students.
            ${langInstruction}
            ${independentInstruction}
            Task:
            1. Analyze the topic and identify 3 distinct, defensible positions or perspectives suitable for a student to argue.
               - Position A: Strong Affirmative / Pro.
               - Position B: Strong Negative / Con.
               - Position C: Nuanced / Middle Ground / Alternative Perspective.
            2. Write a brief, engaging introduction welcoming the student to the debate arena and stating the topic.
            Return ONLY JSON:
            {
                "text": "Welcome to the debate on [Topic]. [Brief context]. Which position will you defend?",
                "options": ["Defend [Perspective A]", "Argue [Perspective B]", "Explore [Perspective C]"],
                "voices": { "Moderator": "Leda" },
                "soundParams": {
                    "atmosphere": "One of: Tense, Calm, Ethereal, Dark, Joyful",
                    "element": "One of: Fire, Water, Wind, Machinery, Nature, Silence"
                }
            }
          `;
      } else if (adventureInputMode === 'system') {
          prompt = `
            You are a System Simulation Engine (Civilization/Macro-Scale).
            Source Material Context: "${sourceText.substring(0, 3000)}"
            Target Audience: ${gradeLevel} students.
            ${langInstruction}
            ${independentInstruction}
            ${effectiveInstructions ? `Custom Instructions: ${effectiveInstructions}` : ''}
            ${studentInterests.length > 0 ? `Theme: ${studentInterests.join(', ')}` : ''}
            ${interactionInstruction}
            Task: Initialize a "Systems Thinking" simulation.
            1. Define the Collective Unit the student controls based on the topic (e.g. "The Ecosystem", "The Roman Senate", "The Immune System", "The Urban Planning Committee").
            2. Present a macro-level challenge or event derived from the source text.
            MECHANICS MAPPING (FOR YOUR REFERENCE, do NOT describe these values in the narrative):
            - "Energy" = System Stability / Resources (tracked in UI, starts at 100).
            - "XP" = System Development / Evolution Level (tracked in UI).
            - "Inventory" = Active Policies, Technologies, or Key Assets.
            CRITICAL: Initialize system variables with realistic starting values (e.g. Trust: 50%, Budget: 1000) instead of 0 if appropriate for the scenario.
            CRITICAL: Do NOT include numeric values like "Energy: 100" or "Stability: 100%" in the narrative text. These are displayed in the game UI.
            ${!adventureFreeResponseEnabled ? `CRITICAL: Provide exactly 6 distinct policy choices or macro-actions:
            - 1 Optimal Systemic Solution (High Sustainability)
            - 2 Standard/Status Quo Actions
            - 1 Neutral/Wait Action
            - 1 Short-term Fix with Long-term Cost (Risk)
            - 1 Systemic Failure/Collapse Choice (Bad)` : ''}
            Return ONLY JSON:
            {
              "text": "You are [Role]. [Describe the situation and context]...nn**Alert:** [Event Description]...",
              "options": ${jsonOptionsExample},
              "inventoryUpdate": { "add": { "name": "Initial Asset/Policy", "type": "permanent" } } OR null,
              "systemStateUpdate": { "add": [{ "name": "Variable", "quantity": 50, "unit": "%", "icon": "emoji" }] } OR null,
              "voices": { "Advisor/System Voice": "VoiceName" },
              "soundParams": {
                  "atmosphere": "One of: Tense, Calm, Ethereal, Dark, Joyful",
                  "element": "One of: Fire, Water, Wind, Machinery, Nature, Silence"
              }${adventureConsistentCharacters ? `,
              "characters": [
                {"name": "Protagonist Name", "role": "Protagonist", "appearance": "Age, hair color, clothing, distinguishing features"},
                {"name": "Advisor Name", "role": "Mentor/Advisor", "appearance": "Age, hair, clothing, distinguishing traits"},
                {"name": "Rival or Obstacle", "role": "Antagonist", "appearance": "Distinguishing visual traits"}
              ]` : ''}
            }
            ${adventureConsistentCharacters ? `CHARACTERS: Generate 2-4 named characters with distinct visual appearances.
              - ALWAYS include the Protagonist (the student's in-story character).
              - Include at least one supporting character (mentor, companion, rival, or antagonist).
              - Each character MUST have a unique, detailed visual description (hair, clothing, build, distinguishing features) for image generation consistency.` : ''}
          `;
      } else {
          prompt = `
            You are a dungeon master running a "Choose Your Own Adventure" educational simulation.
            Source Material: "${sourceText.substring(0, 3000)}"
            --- SETTINGS ---
            Target Audience: ${gradeLevel} students.
            ${langInstruction}
            ${toneInstruction}
            ${independentInstruction}
            ${studentInterests.length > 0 ? `Theme/Interests: Integrate elements of "${studentInterests.join(', ')}" to engage the student.` : ''}
            ${effectiveInstructions ? `Custom Instructions: ${effectiveInstructions}` : ''}
            --- LEARNING GOALS ---
            ${keyTerms ? `Key Vocabulary to Reinforce: ${keyTerms}` : ''}
            ${keyConcepts ? `Key Concepts to Explore: ${keyConcepts}` : ''}
            ${standardsInput ? `Target Standard: ${standardsInput}` : ''}
            ${interactionInstruction}
            ${socialStoryInstruction}
            Task: Create the OPENING SCENE of an interactive story that helps the student explore the concepts in the source text.
            - Put the student in a role related to the topic (e.g., if History, they are a historical figure; if Science, they are a researcher or an electron).
            - The story should be engaging but educational.
            - If defined, use the student interests as a narrative vehicle (e.g. explain physics using soccer metaphors).
            - CRITICAL: Do NOT list the choices in the 'text' narrative. Only describe the situation. The choices will be displayed as buttons.
            ${!adventureFreeResponseEnabled ? (isSocialStoryMode ? `CRITICAL: Provide exactly 4-6 distinct choices reflecting different social approaches:
            - 1 Cooperative/Prosocial Choice
            - 1 Assertive/Boundary-Setting Choice
            - 1 Passive/Avoidant Choice
            - 1 Aggressive/Impulsive Choice (to show consequences)
            - 1 Creative/Alternative Solution` : `CRITICAL: Provide exactly 6 distinct choices for what to do next, randomly ordered:
            - 1 Very Strong/Smart Option (Demonstrates mastery)
            - 2 Mildly Good Options (Acceptable but standard)
            - 1 Neutral Option (Irrelevant or passive)
            - 1 Risky Option (High reward/high failure chance)
            - 1 Bad Option (Shows misunderstanding)`) : ''}
            Return ONLY JSON:
            {
              "text": "You are [Role]. [Describe the situation]... What do you do?",
              "options": ${jsonOptionsExample},
              "inventoryUpdate": { "add": { "name": "Key Item Name", "type": "permanent", "description": "Short description" } } OR null,
              "voices": { "Narrator": "Allo" },
              "soundParams": {
                  "atmosphere": "One of: Tense, Calm, Ethereal, Dark, Joyful",
                  "element": "One of: Fire, Water, Wind, Machinery, Nature, Silence"
              }${adventureConsistentCharacters ? `,
              "characters": [
                {"name": "Protagonist Name", "role": "Protagonist", "appearance": "Age, hair color, clothing, distinguishing features"},
                {"name": "Supporting Character", "role": "Companion/Mentor", "appearance": "Age, hair, clothing, distinguishing traits"},
                {"name": "Third Character", "role": "Antagonist/Rival", "appearance": "Distinguishing visual traits"}
              ]` : ''}
            }
            ${adventureConsistentCharacters ? `CHARACTERS: Generate 2-4 named characters with distinct visual appearances.
              - ALWAYS include the Protagonist (the student's in-story character).
              - Include at least one supporting character (mentor, companion, rival, or antagonist).
              - Each character MUST have a unique, detailed visual description (hair, clothing, build, distinguishing features) for image generation consistency.` : ''}
          `;
      }
      const result = await callGemini(prompt, true);
      let sceneData;
      try {
          sceneData = JSON.parse(cleanJson(result));
      } catch (parseErr) {
          warnLog("Adventure Parse Error:", parseErr);
          setAdventureState(prev => ({ ...prev, isLoading: false, loadingStage: null }));
          addToast(t('toasts.adventure_start_failed_retry'), "error");
          return;
      }
      let initialInventory = [];
      let inventoryPromises = [];
      if (sceneData.inventoryUpdate && sceneData.inventoryUpdate.add) {
          const rawAdd = sceneData.inventoryUpdate.add;
          const itemsToAdd = Array.isArray(rawAdd) ? rawAdd : [rawAdd];
          itemsToAdd.forEach(itemData => {
              const newItemName = typeof itemData === 'object' ? itemData.name : itemData;
              const itemType = typeof itemData === 'object' ? itemData.type : 'consumable';
              const newItemDesc = typeof itemData === 'object' ? itemData.description : null;
              const newItem = {
                  id: Date.now() + Math.random(),
                  name: newItemName,
                  image: null,
                  isLoading: true,
                  effectType: itemType === 'permanent' ? 'key_item' : 'energy',
                  description: newItemDesc || (itemType === 'permanent' ? t('adventure.defaults.key_item_desc') : t('adventure.defaults.energy_desc')),
                  genContext: newItemDesc
              };
              initialInventory.push(newItem);
              const promise = generatePixelArtItem(newItemName, newItemDesc).then(url => {
                  setAdventureState(prev => ({
                      ...prev,
                      inventory: prev.inventory.map(i => i.id === newItem.id ? { ...i, image: url || null, isLoading: false } : i)
                  }));
              });
              inventoryPromises.push(promise);
          });
          const names = itemsToAdd.map(i => typeof i === 'object' ? i.name : i).join(', ');
          addToast(`Obtained: ${names}`, "success");
      }
      let initialSystemResources = [];
      if (sceneData.systemStateUpdate && sceneData.systemStateUpdate.add) {
          const rawAdd = sceneData.systemStateUpdate.add;
          const resourcesToAdd = Array.isArray(rawAdd) ? rawAdd : [rawAdd];
          resourcesToAdd.forEach(res => {
               initialSystemResources.push({
                  id: Date.now() + Math.random(),
                  name: res.name,
                  icon: res.icon || '📊',
                  quantity: res.quantity || 1,
                  type: res.type || 'strategic',
                  unit: res.unit || ''
               });
          });
          const resNames = initialSystemResources.map(r => `${r.name} (${r.quantity}${r.unit})`).join(', ');
          addToast(`Initial State: ${resNames}`, "success");
      }
      let sceneCharacters = [];
      if (adventureConsistentCharacters) {
          if (Array.isArray(sceneData.characters) && sceneData.characters.length > 0) {
              sceneCharacters = sceneData.characters.map(c => ({ ...c, portrait: null, isGenerating: false }));
          } else {
              const sceneText = sceneData.text || '';
              try {
                  const extractionResult = await callGemini(`
From this opening scene, extract 2–4 characters as JSON.
Return ONLY a JSON array in this exact shape: [{"name":"...","role":"...","appearance":"..."}]
Each appearance must be a concise, visual description suitable for keeping the character consistent in illustrations.
Opening scene: ${sceneText.substring(0, 1200)}
                  `, true);
                  const cleanedExtraction = cleanJson(extractionResult);
                  const extractedData = await resilientJsonParse(cleanedExtraction);
                  const extractedCharacters = Array.isArray(extractedData) ? extractedData : extractedData?.characters;
                  if (Array.isArray(extractedCharacters)) {
                      sceneCharacters = extractedCharacters
                          .filter(c => c && String(c.name || '').trim())
                          .slice(0, 4)
                          .map(c => ({
                              name: String(c.name).trim(),
                              role: String(c.role || 'Character').trim(),
                              appearance: String(c.appearance || c.role || c.name).trim(),
                              portrait: null,
                              isGenerating: false,
                          }));
                  }
              } catch (characterRetryErr) {
                  warnLog('Structured character extraction retry failed; using text fallback.', characterRetryErr);
              }
              if (sceneCharacters.length === 0) {
              const nameMatches = sceneText.match(/(?:named?\s+|called\s+|meet\s+|,\s*)([A-Z][a-z]{2,}(?:\s[A-Z][a-z]+)?)/g) || [];
              const roleMatches = sceneText.match(/(?:the\s+)((?:wise|old|young|brave|mighty|clever|kind|ancient|mysterious)\s+[a-z]+)/gi) || [];
              const extracted = new Set();
              nameMatches.forEach(m => {
                  const name = m.replace(/^(?:named?\s+|called\s+|meet\s+|,\s*)/i, '').trim();
                  if (name.length > 2 && name.length < 30) extracted.add(name);
              });
              roleMatches.forEach(m => {
                  const role = m.replace(/^the\s+/i, '').trim();
                  if (role.length > 3) extracted.add(role);
              });
              const youAreMatch = sceneText.match(/You are (?:a |an |the )?([A-Za-z\s]+?)(?:\.|,|!|\band\b)/i);
              if (youAreMatch) {
                  const protagonist = youAreMatch[1].trim();
                  if (protagonist.length > 2 && protagonist.length < 40) {
                      sceneCharacters.push({ name: 'Protagonist', role: protagonist, appearance: protagonist, portrait: null, isGenerating: false });
                  }
              }
              extracted.forEach(name => {
                  sceneCharacters.push({ name, role: 'Character', appearance: name, portrait: null, isGenerating: false });
              });
              if (sceneCharacters.length === 0) {
                  const gradeMap = {
                      'Kindergarten': '5 year old child', '1st Grade': '6 year old child', '2nd Grade': '7 year old child',
                      '3rd Grade': '8 year old child', '4th Grade': '9 year old child', '5th Grade': '10 year old child',
                      '6th Grade': '11 year old child', '7th Grade': '12 year old child', '8th Grade': '13 year old teen',
                  };
                  const ageDesc = gradeMap[gradeLevel] || 'young student';
                  sceneCharacters.push({ name: 'Your Character', role: 'Protagonist', appearance: `A friendly ${ageDesc}, the main character of this adventure`, portrait: null, isGenerating: false });
              }
              }
          }
      }
      setAdventureState(prev => ({
        ...prev,
        history: [],
        currentScene: sceneData,
        isLoading: false,
        isGameOver: false,
        turnCount: 1,
        level: startingLevel,
        xp: startingXp,
        xpToNextLevel: startingXpToNext,
        sceneImage: null,
        sceneImagePreview: null,
        isImageLoading: true,
        imagePolishStage: 'generating',
        loadingStage: sceneCharacters.length > 0 ? 'Preparing cast review…' : 'Painting scene art…',
        inventory: [...prev.inventory, ...initialInventory],
        systemResources: initialSystemResources,
        voiceMap: sceneData.voices || {},
        characters: sceneCharacters,
        isReviewingCharacters: sceneCharacters.length > 0,
      }));
      if (adventureConsistentCharacters && sceneCharacters.length > 0) {
          const establishingStyle = adventureArtStyle === 'custom' && adventureCustomArtStyle
              ? `Art style: ${adventureCustomArtStyle}.`
              : (adventureArtStyle && adventureArtStyle !== 'auto' ? `Art style: ${adventureArtStyle}.` : '');
          const establishingPrompt = `Wide establishing shot introducing this setting: ${String(sceneData.text || '').substring(0, 600)}. Scenic environment only, absolutely no people, no characters, no text. ${establishingStyle}`;
          scheduleAdventureEstablishingShot({
              prompt: establishingPrompt,
              callImagen,
              setAdventureState,
              warnLog,
          });
      }
      const newAdventureItem = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          type: 'adventure',
          title: sourceTopic ? `Adventure: ${sourceTopic}` : 'Interactive Adventure',
          meta: `Level ${startingLevel} - ${adventureInputMode === 'debate' ? 'Debate' : 'Simulation'}`,
          timestamp: new Date(),
          data: {
              snapshot: {
                  currentScene: sceneData,
                  history: [],
                  level: startingLevel,
                  xp: startingXp,
                  xpToNextLevel: startingXpToNext,
                  energy: 100,
                  gold: initialGold,
                  inventory: initialInventory,
                  systemResources: initialSystemResources,
                  voiceMap: sceneData.voices || {},
                  turnCount: 1,
                  isGameOver: false,
              }
          },
          config: {}
      };
      setHistory(prev => [...prev, newAdventureItem]);
      setGeneratedContent(newAdventureItem);
      setGenerationStep('Rendering scene visual...');
      if (!adventureConsistentCharacters || sceneCharacters.length === 0) {
          generateAdventureImage(sceneData.text, 1);
      }
      flyToElement('tour-tool-adventure');
    } catch (error) {
      warnLog("Adventure Start Error:", error);
      addToast(t('toasts.adventure_start_failed'), "error");
      setAdventureState(prev => ({ ...prev, isLoading: false, loadingStage: null }));
    }
};

const handleStartAdventure = (deps) => {
  const { adventureState, adventureTextInput, adventureInputMode, adventureLanguageMode, adventureChanceMode, adventureConsistentCharacters, adventureCustomInstructions, adventureFreeResponseEnabled, history, inputText, sourceTopic, gradeLevel, standardsInput, studentInterests, isIndependentMode, isTeacherMode, factionResourceMode, enableFactionResources, selectedLanguages, currentUiLanguage, apiKey, appId, activeSessionAppId, activeSessionCode, globalPoints, sessionData, user, alloBotRef, lastTurnSnapshot, lastReadTurnRef, pdfPreviewRef, exportPreviewRef, setActiveView, setAdventureState, setAdventureTextInput, setDiceResult, setFailedAdventureAction, setGeneratedContent, setGenerationStep, setHasSavedAdventure, setHistory, setIsResumingAdventure, setPendingAdventureUpdate, setShowDice, setShowGlobalLevelUp, setShowNewGameSetup, callGemini, callGeminiVision, addToast, t, warnLog, debugLog, cleanJson, archiveAdventureImage, SafetyContentChecker, handleAiSafetyFlag, playAdventureEventSound, handleScoreUpdate, getAdventureGlossaryTerms, generateAdventureImage, generateNarrativeLedger, generatePixelArtItem, detectClimaxArchetype, flyToElement, resilientJsonParse, storageDB, updateDoc, doc, db, ADVENTURE_GUARDRAIL, DEBATE_INVISIBLE_INSTRUCTIONS, INVISIBLE_NARRATOR_INSTRUCTIONS, NARRATIVE_GUARDRAILS, SYSTEM_INVISIBLE_INSTRUCTIONS, SYSTEM_STATE_EXAMPLES, aiBotsActive, narrativeLedger, isAdventureStoryMode, isImmersiveMode, isReviewingCharacters, isShopOpen, isSocialStoryMode, debateTopic, socialStoryFocus, stopPlayback, playSound, resetDebate } = deps;
  try { if (window._DEBUG_ADVENTURE) console.log("[Adventure] handleStartAdventure fired"); } catch(_) {}
      if (alloBotRef.current) {
          alloBotRef.current.speak(t('bot_events.feedback_adventure_start'), 'happy');
      }
      const latestAnalysis = history.slice().reverse().find(h => h && h.type === 'analysis');
      const sourceText = (latestAnalysis && latestAnalysis.data && latestAnalysis.data.originalText)
          ? latestAnalysis.data.originalText
          : inputText;
      if (!sourceText.trim()) {
          addToast(t('adventure.no_text_error'), "error");
          return;
      }
      setActiveView('adventure');
      setAdventureState(prev => ({
          ...prev,
          history: [],
          currentScene: null,
          isLoading: false
      }));
      setShowNewGameSetup(true);
      setHasSavedAdventure(false);
};

const handleResumeAdventure = async (deps) => {
  const { adventureState, adventureTextInput, adventureInputMode, adventureLanguageMode, adventureChanceMode, adventureConsistentCharacters, adventureCustomInstructions, adventureFreeResponseEnabled, history, inputText, sourceTopic, gradeLevel, standardsInput, studentInterests, isIndependentMode, isTeacherMode, factionResourceMode, enableFactionResources, selectedLanguages, currentUiLanguage, apiKey, appId, activeSessionAppId, activeSessionCode, globalPoints, sessionData, user, alloBotRef, lastTurnSnapshot, lastReadTurnRef, pdfPreviewRef, exportPreviewRef, setActiveView, setAdventureState, setAdventureTextInput, setDiceResult, setFailedAdventureAction, setGeneratedContent, setGenerationStep, setHasSavedAdventure, setHistory, setIsResumingAdventure, setPendingAdventureUpdate, setShowDice, setShowGlobalLevelUp, setShowNewGameSetup, setAdventureDifficulty, setAdventureInputMode, setAdventureLanguageMode, setAdventureChanceMode, setAdventureFreeResponseEnabled, setAdventureConsistentCharacters, setIsAdventureStoryMode, setIsSocialStoryMode, setSocialStoryFocus, setAdventureArtStyle, setAdventureCustomArtStyle, setUseLowQualityVisuals, setEnableFactionResources, setFactionResourceMode, callGemini, callGeminiVision, addToast, t, warnLog, debugLog, cleanJson, archiveAdventureImage, SafetyContentChecker, handleAiSafetyFlag, playAdventureEventSound, handleScoreUpdate, getAdventureGlossaryTerms, generateAdventureImage, generateNarrativeLedger, generatePixelArtItem, detectClimaxArchetype, flyToElement, resilientJsonParse, storageDB, adventureImageDB, updateDoc, doc, db, ADVENTURE_GUARDRAIL, DEBATE_INVISIBLE_INSTRUCTIONS, INVISIBLE_NARRATOR_INSTRUCTIONS, NARRATIVE_GUARDRAILS, SYSTEM_INVISIBLE_INSTRUCTIONS, SYSTEM_STATE_EXAMPLES, aiBotsActive, narrativeLedger, isAdventureStoryMode, isImmersiveMode, isReviewingCharacters, isShopOpen, isSocialStoryMode, debateTopic, socialStoryFocus, stopPlayback, playSound, resetDebate } = deps;
  try { if (window._DEBUG_ADVENTURE) console.log("[Adventure] handleResumeAdventure fired"); } catch(_) {}
      setIsResumingAdventure(true);
      try {
          const savedRecord = await storageDB.get('allo_adventure_save');
          if (!savedRecord) {
              addToast(t('toasts.no_save_file'), "error");
              setHasSavedAdventure(false);
              return;
          }
          const { _adventureConfig: savedConfig = {}, ...parsed } = savedRecord;
          if (typeof setAdventureDifficulty === 'function' && savedConfig.difficulty) setAdventureDifficulty(savedConfig.difficulty);
          if (typeof setAdventureInputMode === 'function' && savedConfig.inputMode) setAdventureInputMode(savedConfig.inputMode);
          if (typeof setAdventureLanguageMode === 'function' && savedConfig.languageMode) setAdventureLanguageMode(savedConfig.languageMode);
          if (typeof setAdventureChanceMode === 'function' && savedConfig.chanceMode !== undefined) setAdventureChanceMode(!!savedConfig.chanceMode);
          if (typeof setAdventureFreeResponseEnabled === 'function' && savedConfig.freeResponse !== undefined) setAdventureFreeResponseEnabled(!!savedConfig.freeResponse);
          if (typeof setAdventureConsistentCharacters === 'function' && savedConfig.consistentCharacters !== undefined) setAdventureConsistentCharacters(!!savedConfig.consistentCharacters);
          if (typeof setIsAdventureStoryMode === 'function' && savedConfig.storyMode !== undefined) setIsAdventureStoryMode(!!savedConfig.storyMode);
          if (typeof setIsSocialStoryMode === 'function' && savedConfig.socialStoryMode !== undefined) setIsSocialStoryMode(!!savedConfig.socialStoryMode);
          if (typeof setSocialStoryFocus === 'function' && savedConfig.socialStoryFocus !== undefined) setSocialStoryFocus(savedConfig.socialStoryFocus || '');
          if (typeof setAdventureArtStyle === 'function' && savedConfig.artStyle) setAdventureArtStyle(savedConfig.artStyle);
          if (typeof setAdventureCustomArtStyle === 'function' && savedConfig.customArtStyle !== undefined) setAdventureCustomArtStyle(savedConfig.customArtStyle || '');
          if (typeof setUseLowQualityVisuals === 'function' && savedConfig.lowQualityVisuals !== undefined) setUseLowQualityVisuals(!!savedConfig.lowQualityVisuals);
          if (typeof setEnableFactionResources === 'function' && savedConfig.enableFactionResources !== undefined) setEnableFactionResources(!!savedConfig.enableFactionResources);
          if (typeof setFactionResourceMode === 'function' && savedConfig.factionResourceMode) setFactionResourceMode(savedConfig.factionResourceMode);
          const safeState = {
              ...parsed,
              energy: (typeof parsed.energy === 'number' && !isNaN(parsed.energy)) ? parsed.energy : 100,
              xp: (typeof parsed.xp === 'number' && !isNaN(parsed.xp)) ? parsed.xp : 0,
              level: (typeof parsed.level === 'number' && !isNaN(parsed.level)) ? parsed.level : 1,
              gold: (typeof parsed.gold === 'number' && !isNaN(parsed.gold)) ? parsed.gold : 0,
              isShopOpen: parsed.isShopOpen || false,
              narrativeLedger: parsed.narrativeLedger || '',
              assistedKnowledge: Array.isArray(parsed.assistedKnowledge) ? parsed.assistedKnowledge.filter(Boolean).slice(-12) : [],
              activeXpMultiplier: parsed.activeXpMultiplier || 1,
              activeGoldBuff: false,
              activeGoldBuffTurns: parsed.activeGoldBuffTurns || 0,
              lastKeyItemTurn: (typeof parsed.lastKeyItemTurn === 'number' && !isNaN(parsed.lastKeyItemTurn)) ? parsed.lastKeyItemTurn : 0,
              isImmersiveMode: parsed.isImmersiveMode || false,
              climax: parsed.climax || { isActive: false, archetype: 'Auto', masteryScore: 0, attempts: 0 },
              characters: parsed.characters || [],
              isReviewingCharacters: false
          };
          let restoredSceneImage = null;
          try {
              if (adventureImageDB && typeof adventureImageDB.getImage === 'function') {
                  restoredSceneImage = await adventureImageDB.getImage(safeState.turnCount);
              }
          } catch (imageError) {
              warnLog("Adventure Image Restore Error", imageError);
          }
          setAdventureState({
              ...safeState,
              sceneImage: restoredSceneImage || null,
              isImageLoading: false,
              imageCache: []
          });
          setActiveView('adventure');
          addToast(`Resumed Adventure (Level ${safeState.level})`, "success");
      } catch (e) {
          warnLog("Failed to resume", e);
          addToast(t('toasts.save_load_failed'), "error");
      } finally {
          setIsResumingAdventure(false);
      }
};

const handleAdventureTextSubmit = async (overrideInput = null, deps) => {
  const { adventureState, adventureTextInput, adventureInputMode, adventureLanguageMode, adventureChanceMode, adventureConsistentCharacters, adventureCustomInstructions, adventureFreeResponseEnabled, history, inputText, sourceTopic, gradeLevel, standardsInput, studentInterests, isIndependentMode, isTeacherMode, factionResourceMode, enableFactionResources, selectedLanguages, currentUiLanguage, apiKey, appId, activeSessionAppId, activeSessionCode, globalPoints, sessionData, user, alloBotRef, lastTurnSnapshot, lastReadTurnRef, pdfPreviewRef, exportPreviewRef, setActiveView, setAdventureState, setAdventureTextInput, setDiceResult, setFailedAdventureAction, setGeneratedContent, setGenerationStep, setHasSavedAdventure, setHistory, setIsResumingAdventure, setPendingAdventureUpdate, setShowDice, setShowGlobalLevelUp, setShowNewGameSetup, callGemini, callGeminiVision, addToast, t, warnLog, debugLog, cleanJson, archiveAdventureImage, SafetyContentChecker, handleAiSafetyFlag, playAdventureEventSound, handleScoreUpdate, getAdventureGlossaryTerms, generateAdventureImage, generateNarrativeLedger, generatePixelArtItem, detectClimaxArchetype, flyToElement, resilientJsonParse, storageDB, updateDoc, doc, db, ADVENTURE_GUARDRAIL, DEBATE_INVISIBLE_INSTRUCTIONS, INVISIBLE_NARRATOR_INSTRUCTIONS, NARRATIVE_GUARDRAILS, SYSTEM_INVISIBLE_INSTRUCTIONS, SYSTEM_STATE_EXAMPLES, aiBotsActive, narrativeLedger, isAdventureStoryMode, isImmersiveMode, isReviewingCharacters, isShopOpen, isSocialStoryMode, debateTopic, socialStoryFocus, stopPlayback, playSound, resetDebate } = deps;
  try { if (window._DEBUG_ADVENTURE) console.log("[Adventure] handleAdventureTextSubmit fired"); } catch(_) {}
    const currentInput = overrideInput || adventureTextInput;
    if (!currentInput.trim() || adventureState.isLoading) return;
    if (!isTeacherMode && activeSessionCode) {
        addToast(t('adventure.status_messages.teacher_control') || "Teacher controls the adventure in live sessions.", "info");
        return;
    }
    SafetyContentChecker.aiCheck(currentInput, 'adventure', apiKey, handleAiSafetyFlag);
    lastTurnSnapshot.current = structuredClone(adventureState);
    stopPlayback();
    setAdventureState(prev => ({ ...prev, isLoading: true, pendingChoice: currentInput, loadingStage: 'Interpreting your response…' }));
    let archivedImageId = null;
    if (adventureState.sceneImage) {
        try {
            archivedImageId = await archiveAdventureImage(adventureState.sceneImage);
        } catch (archiveError) {
            warnLog("Adventure Image Archive Error", archiveError);
        }
    }
    setAdventureState(prev => ({
        ...prev,
        history: [
            ...prev.history,
            {
                type: 'scene',
                text: prev.currentScene.text,
                imageId: archivedImageId,
            },
            { type: 'choice', text: currentInput, source: 'freetext' }
        ],
        currentScene: null,
        sceneImage: null,
        sceneImagePreview: null,
        imagePolishStage: null,
        isLoading: true,
        loadingStage: 'Interpreting your response…',
        pendingChoice: currentInput,
    }));
    if (!overrideInput) setAdventureTextInput('');
    addToast(adventureInputMode === 'debate' ? t('adventure.status_messages.initiating_debate') : t('adventure.status_messages.starting'), "info");
    try {
          const keyTerms = getAdventureGlossaryTerms(history, adventureLanguageMode);
          const analysisItem = history.slice().reverse().find(h => h && h.type === 'analysis');
          const keyConcepts = analysisItem ? analysisItem.data.concepts.join(', ') : '';
          const sourceText = (analysisItem && analysisItem.data && analysisItem.data.originalText)
              ? analysisItem.data.originalText
              : inputText;
          const maxTurns = adventureState.climaxMinTurns || 20;
          const isLastTurn = !adventureState.enableAutoClimax && adventureState.turnCount >= maxTurns;
          const turnsSinceLastDrop = adventureState.turnCount - (adventureState.lastKeyItemTurn || 0);
          const currentInventoryNames = adventureState.inventory.map(i => i.name).join(', ');
          let langInstruction = "Language: English.";
          if (adventureLanguageMode !== 'English') {
              if (adventureLanguageMode === 'All + English') {
                  langInstruction = `Language: Multilingual mix of ${selectedLanguages.join(', ')}. CRITICAL: Provide English translations for ALL narrative text and choices.`;
              } else if (adventureLanguageMode.endsWith(' + English')) {
                  const targetLang = adventureLanguageMode.replace(' + English', '');
                  langInstruction = `Language: ${targetLang}. CRITICAL: Provide English translations for ALL narrative text and choices.`;
              } else {
                  langInstruction = `Language: ${adventureLanguageMode}. Do NOT provide English translations.`;
              }
              langInstruction += ` STRICT DIALECT ADHERENCE: If a specific dialect is named (e.g. 'Brazilian Portuguese' vs 'European Portuguese'), explicitly use that region's vocabulary, spelling, and grammar conventions.`;
          }
          const socialStoryInstruction = isSocialStoryMode
              ? `FOCUS: Social Story Mode. Continue the narrative focusing on "${socialStoryFocus || 'Social Skills'}". Evaluate the user's choice: "${currentInput}" based on its social impact. Show the consequences (positive or negative) on relationships and feelings.
                 CRITICAL: The options generated must represent different social approaches (e.g., Aggressive, Passive, Assertive/Prosocial, Cooperative).`
              : "";
          const optionsInstruction = !adventureFreeResponseEnabled ? (isSocialStoryMode ? `
            CRITICAL: Provide exactly 4-6 distinct choices reflecting different social approaches:
            - 1 Cooperative/Prosocial Choice
            - 1 Assertive/Boundary-Setting Choice
            - 1 Passive/Avoidant Choice
            - 1 Aggressive/Impulsive Choice (to show consequences)
            - 1 Creative/Alternative Solution
          ` : `
            CRITICAL: Provide exactly 6 distinct choices for the NEXT scene options, randomly ordered:
            - 1 Very Strong/Smart Option (Demonstrates mastery)
            - 2 Mildly Good Options (Acceptable but standard)
            - 1 Neutral Option (Irrelevant or passive)
            - 1 Mildly Bad Option (Minor misconception or risky)
            - 1 Very Bad Option (Major misconception or failure)
          `) : `
            CRITICAL (FREE-RESPONSE MODE): DRIVE THE STORY FORWARD every turn.
            After showing the consequence of the student's action, the scene MUST END with a NEW
            concrete, unresolved problem, obstacle, or decision that demands the student's next
            action — a direct question from a character, a danger closing in, a device or clue that
            must be dealt with, a choice that cannot be postponed. Make it specific enough that the
            student knows exactly what they are responding to.
            NEVER end on pure reaction, praise, calm resolution, or summary — the last 1-2 sentences
            must present the new challenge. Return an empty 'options' array: []
          `;
          const jsonOptionsExample = adventureFreeResponseEnabled
              ? "[]"
              : `["Choice 1", "Choice 2", "Choice 3", "Choice 4", "Choice 5", "Choice 6"]`;
          const chanceRoll = adventureChanceMode ? Math.floor(Math.random() * 20) + 1 : null;
          const rollModifier = adventureState.activeRollModifier || 0;
          const effectiveRoll = chanceRoll ? chanceRoll + rollModifier : null;
          const mechanicsInstruction = adventureChanceMode
            ? `SYSTEM: CHANCE MODE ACTIVE. Raw D20 Roll: ${chanceRoll}${rollModifier > 0 ? ` + ${rollModifier} Luck Bonus = ${effectiveRoll}` : ''}.
               1. Analyze the strategy of the action on a scale of 1 (Terrible) to 20 (Genius).
               2. Calculate Total = ${effectiveRoll || chanceRoll} (Roll${rollModifier > 0 ? ' + Luck Bonus' : ''}) + Strategy Rating.
               3. Compare Total against DCs: < 16 (Fail), 16-21 (Partial), 22-27 (Success), 28+ (Critical).
               4. Return "d20": ${chanceRoll} and "total": [Calculated Sum] in the JSON.`
            : `SYSTEM: DETERMINISTIC MODE. Analyze action quality. Assign a Performance Score on a d20 scale (1-20).
               - 1-5: Critical Failure
               - 6-10: Failure/Partial
               - 11-15: Success
               - 16-20: Critical Success
               CRITICAL: You MUST set "d20" and "total" in the JSON to this 1-20 score. Do NOT use a 1-5 star rating.`;
          const toneInstruction = isAdventureStoryMode
              ? "TONE: Story Time Mode (Family Friendly). Continue with exploration, mystery, and puzzles. Avoid combat or intense danger."
              : "";
          const taggingInstruction = `
            OUTCOME TAGGING (REQUIRED): Return "outcomeType" as exactly one of
            "strategic_success", "partial_success", "misconception", or "neutral".
            If the response demonstrates a source concept, return it in "conceptsUsed".
          `;
          let climaxInstruction = '';
          if (adventureState.climax?.isActive) {
              const currentScore = Number(adventureState.climax.masteryScore) || 50;
              climaxInstruction = `CLIMAX ACTIVE. Current mastery progress: ${currentScore}/100.
                Apply a progress shift of +20 critical success, +10 success, -5 partial/neutral,
                -15 failure, or -25 critical failure. Return the new "masteryScore".
                Return "climaxResult":"victory" at 100+, "failure" at 0-, otherwise null,
                and make the scene a clear continuation of the active climax.`;
          }
          const outcomeJsonFields = `
                "outcomeType": "strategic_success | partial_success | misconception | neutral",
                "conceptsUsed": ["Concept Name"],
                "climaxResult": "victory | failure | null",
                "masteryScore": number,
          `;
          let historyContext = "";
          if (adventureState.narrativeLedger) {
              const recentHistory = adventureState.history.slice(-5);
              const recentText = recentHistory.map(h => `${h.type.toUpperCase()}: ${h.text}`).join('\n');
              historyContext = `--- PREVIOUS STORY SUMMARY (NARRATIVE LEDGER) ---\n${adventureState.narrativeLedger}\n\n--- RECENT LOG (Last 5 Turns) ---\n${recentText}\n`;
          } else {
              const fullText = adventureState.history.map(h => `${h.type.toUpperCase()}: ${h.text}`).join('\n');
              historyContext = `--- FULL ADVENTURE LOG ---\n${fullText}\n`;
          }
          historyContext += getAssistedKnowledgeContext(adventureState);
          let prompt = '';
      if (adventureInputMode === 'debate') {
          prompt = `
            You are a Debate Moderator and Opponent.
            ${historyContext}
            ${DEBATE_INVISIBLE_INSTRUCTIONS}
            Source Material Context: "${sourceText.substring(0, 1500)}..."
            Current Scenario: "${adventureState.currentScene?.text}"
            Current Debate Momentum: ${adventureState.debateMomentum}/100
            Current Debate Topic: "${adventureState.debateTopic || sourceTopic}",
            --- USER INPUT START ---
            Student's Argument: "${currentInput}"
            --- USER INPUT END ---
            ${ADVENTURE_GUARDRAIL}
            ${langInstruction}
            ${toneInstruction}
            ${adventureCustomInstructions ? `Custom Instructions: ${adventureCustomInstructions}` : ''}
            ${mechanicsInstruction}
            ${taggingInstruction}
            ${climaxInstruction}
            Task: Analyze argument, Assign Strategy Rating (1-20), Calculate Total Score.
            CRITICAL: CALCULATE MOMENTUM CHANGE
            Based on the "Total Score" (1-20 Scale), determine "debateMomentumChange":
            - Critical Success (Score 18-20): +15 (Dominating point)
            - Success (Score 14-17): +10 (Strong point)
            - Moderate (Score 10-13): +5 (Valid point)
            - Weak/Neutral (Score 6-9): -5 (Unconvincing or stalled)
            - Failure (Score 1-5): -15 (Major fallacy or poor argument)
            Note: If the Student's Argument is "I give up" or similar, set "resetDebate": true.
            ${NARRATIVE_GUARDRAILS}
            Return ONLY JSON:
            {
                ${outcomeJsonFields}
                "debateMomentumChange": number (e.g. 10, -5, 15),
                "resetDebate": boolean,
                "newTopic": "String",
                "evaluation": "Feedback...",
                "xpAwarded": number,
                "energyChange": -5,
                "rollDetails": { "strategyRating": number, "d20": ${chanceRoll || "Score_1_to_20"}, "total": number, "outcomeType": "String" },
                "voices": { "Opponent": "VoiceName" },
                "scene": { "text": "Rebuttal...", "options": ${jsonOptionsExample} },
                "soundParams": {
                    "atmosphere": "One of: Tense, Calm, Ethereal, Dark, Joyful",
                    "element": "One of: Fire, Water, Wind, Machinery, Nature, Silence"
                }
            }
          `;
      } else if (adventureInputMode === 'system') {
          const currentStates = adventureState.systemResources || [];
          let stateContext = '';
          let stateInstruction = '';
          let stateJsonField = '';
          if (enableFactionResources) {
              if (factionResourceMode === 'ai') {
                  const examplesList = Object.values(SYSTEM_STATE_EXAMPLES)
                      .map(ex => `${ex.label}: ${ex.states.map(s => `${s.icon}${s.name}`).join(', ')}`)
                      .join(' | ');
                  stateContext = currentStates.length > 0
                      ? `\nCurrent System State (dynamic, AI-managed):\n${currentStates.map(s => `  ${s.icon} ${s.name}: ${s.quantity}${s.unit || ''}`).join('\n')}\n`
                      : `\nSystem State (AI-managed): None yet - CREATE 3-4 thematic state variables on first turn.\n`;
                  stateInstruction = `\nSYSTEM STATE CREATION & MANAGEMENT (AI Mode):
- If no state variables exist, CREATE 3-4 thematic state variables that FIT THE NARRATIVE CONTEXT.
- CRITICAL: State variables must be THEMATICALLY APPROPRIATE to the source material and scenario.
  * For dreams/psychology: Use states like Lucidity, Anxiety, Memory Clarity, Inner Peace
  * For ecosystems: Use states like Biodiversity, Water Quality, Pollution, Community Support
  * For politics: Use states like Public Opinion, Tension, Trust, Reform Progress
  * For sci-fi: Use states like Hull Integrity, Crew Morale, Research Progress, Life Support
  * AVOID generic resources (Gold, Food, Supplies) unless the scenario is explicitly about economics/survival
- Example themes: ${examplesList}
- Update states using "systemStateUpdate" when decisions affect them.
- Each state needs: name, emoji icon, quantity (0-100), unit (e.g., %, people, days), type (strategic|critical|consumable).
- Use "unit" to give context to the quantity (e.g., "75%", "1200 people", "14 days").\n`;
                  stateJsonField = `"systemStateUpdate": { "add": [{ "name": "StateName", "icon": "emoji", "quantity": number, "unit": "% or people or days etc", "type": "strategic|critical|consumable" }], "remove": [{ "name": "StateName", "quantity": number }] } OR null,
                    `;
              } else {
                  stateContext = currentStates.length > 0
                      ? `\nSystem State (user-defined, DO NOT add new states):\n${currentStates.map(s => `  ${s.icon} ${s.name}: ${s.quantity}${s.unit || ''}`).join('\n')}\n`
                      : '';
                  stateInstruction = currentStates.length > 0
                      ? `\nSYSTEM STATE MANAGEMENT (Manual Mode): Only modify quantities of existing state variables. Do NOT create new states. Preserve existing units.\n`
                      : '';
                  stateJsonField = currentStates.length > 0
                      ? `"systemStateUpdate": { "add": [{ "name": "ExistingStateName", "quantity": number }], "remove": [{ "name": "ExistingStateName", "quantity": number }] } OR null,
                    `
                      : '';
              }
          }
          prompt = `
            You are a Strategy Advisor running a faction/collective-scale simulation.
                ${historyContext}
                ${SYSTEM_INVISIBLE_INSTRUCTIONS}
                Source Material Context: "${sourceText.substring(0, 1500)}..."
                Current Scenario: "${adventureState.currentScene?.text}"
                ${stateContext}
                --- USER INPUT START ---
                User's Policy Decision: "${currentInput}"
                --- USER INPUT END ---
                ${ADVENTURE_GUARDRAIL}
                Current Stability: ${adventureState.energy}/100 (tracked in UI - do NOT mention in narrative)
                Standard Inventory: [${currentInventoryNames}]
                ${stateInstruction}
                ${langInstruction}
                ${toneInstruction}
                ${adventureCustomInstructions ? `Custom Instructions: ${adventureCustomInstructions}` : ''}
                ${mechanicsInstruction}
                ${taggingInstruction}
                ${climaxInstruction}
                ${optionsInstruction}
                CRITICAL: Do NOT include status displays (Health, Stability, XP, Level, etc.) in the scene text. These are tracked in the UI.
                The scene text should be pure narrative describing what happens as a result of the policy decision.
                Task: Interpret policy decision, Assign Strategy Rating (1-20), Calculate Stability Change.
                ${NARRATIVE_GUARDRAILS}
                Return ONLY JSON:
                {
                    ${outcomeJsonFields}
                    "evaluation": "Effect of the policy decision...", "xpAwarded": number, "energyChange": number,
                    "rollDetails": { "strategyRating": number, "d20": ${chanceRoll || "Score_1_to_20"}, "total": number, "outcomeType": "String" },
                    "inventoryUpdate": { "add": [{ "name": "Policy", "type": "permanent" }] } OR { "remove": "Policy" } OR null,
                    ${stateJsonField}"voices": { "Advisor": "VoiceName" },
                    "scene": { "text": "Narrative describing new state of the faction/system...", "options": ${jsonOptionsExample} },
                    "soundParams": {
                        "atmosphere": "One of: Tense, Calm, Ethereal, Dark, Joyful",
                        "element": "One of: Fire, Water, Wind, Machinery, Nature, Silence"
                    }
                }
              `;
          } else {
              let characterManifest = '';
              if (adventureConsistentCharacters && adventureState.characters?.length > 0) {
                  const charList = adventureState.characters.map(c =>
                      `- "${c.name}" (${c.role}): ${c.appearance}`
                  ).join('\n');
                  characterManifest = `
--- CONSISTENT CAST ---
${charList}
INSTRUCTIONS: Refer to these characters by name. Keep their descriptions consistent.
Return "charactersInScene": ["Name1", "Name2"] listing ONLY the characters visually present in this scene.
The Protagonist should appear in most scenes unless it is a cutaway.
Do NOT force all characters into every scene — let the narrative decide naturally.
`;
              }
              prompt = `
                You are a Dungeon Master.
                ${historyContext}
                ${INVISIBLE_NARRATOR_INSTRUCTIONS}
                Source Material: "${sourceText.substring(0, 1500)}..."
                Current Scenario: "${adventureState.currentScene?.text}",
                ${characterManifest}
                --- USER INPUT START ---
                Student's Action: "${currentInput}"
                --- USER INPUT END ---
                ${ADVENTURE_GUARDRAIL}
                Inventory: [${currentInventoryNames}]
                Energy: ${adventureState.energy}/100
                ${langInstruction}
                ${toneInstruction}
                ${adventureCustomInstructions ? `Custom Instructions: ${adventureCustomInstructions}` : ''}
                ${socialStoryInstruction}
                ${mechanicsInstruction}
                ${taggingInstruction}
                ${climaxInstruction}
                ${optionsInstruction}
                Task: Analyze action, Assign Strategy Rating (1-20), Calculate Total Score. Determine Outcome.
                ${turnsSinceLastDrop >= 6 ? '- KEY ITEM OPPORTUNITY: If Score High, award Key Item.' : ''}
                CRITICAL INSTRUCTIONS:
                1. INVENTORY SYNC: If your narrative text describes finding an item, loot, or object, you MUST include it in the 'inventoryUpdate' JSON field. Do not hallucinate items in text without adding them to data.
                2. REWARDS: Award 'goldAwarded' (10-50) frequently for successful actions, exploration, or smart decisions. Don't be stingy.
                ${NARRATIVE_GUARDRAILS}
                Return ONLY JSON:
                {
                    ${outcomeJsonFields}
                    "evaluation": "Feedback...", "xpAwarded": number, "energyChange": number, "goldAwarded": number,
                    "rollDetails": { "strategyRating": number, "d20": ${chanceRoll || "Score_1_to_20"}, "total": number, "outcomeType": "String" },
                    "inventoryUpdate": { "add": [{ "name": "Item", "type": "permanent" }] } OR { "remove": "Item Name" } OR null,
                    "voices": { "Char": "VoiceName" },
                    "scene": { "text": "Outcome...", "options": ${isLastTurn ? "[]" : jsonOptionsExample} },
                    "soundParams": {
                        "atmosphere": "One of: Tense, Calm, Ethereal, Dark, Joyful",
                        "element": "One of: Fire, Water, Wind, Machinery, Nature, Silence"
                    }${adventureConsistentCharacters && adventureState.characters?.length > 0 ? `,
                    "charactersInScene": ["Protagonist Name", "Other Character Present"]` : ''}
                }
              `;
          }
          const result = await callGemini(prompt, true);
          let data;
          try {
              data = await resilientJsonParse(result);
          } catch (finalErr) {
              warnLog("Critical Adventure Failure (Auto-Repair failed):", finalErr);
              data = {
                  evaluation: "System anomaly detected.",
                  scene: {
                      text: "The simulation encountered a data stream error (Time distortion detected). You shake it off and prepare to move forward...",
                      options: ["Continue", "Check Inventory", "Look Around", "Wait"]
                  },
                  feedback: "System anomaly detected and bypassed.",
                  xpAwarded: 0,
                  energyChange: 0,
                  goldAwarded: 0,
                  rollDetails: { total: 10, d20: 10, outcomeType: "neutral" },
                  inventoryUpdate: null,
                  voices: {}
              };
              addToast(t('toasts.auto_repair_fallback'), "warning");
          }
          if (!data.scene || typeof data.scene !== 'object') {
              data.scene = { text: t('adventure.status_messages.continue') || 'The adventure continues.', options: [] };
          }
          data.scene.text = String(data.scene.text || (t('adventure.status_messages.continue') || 'The adventure continues.'));
          if (!Array.isArray(data.scene.options)) data.scene.options = [];
          if (!data.feedback && !data.evaluation) data.evaluation = t('adventure.status_messages.turn_complete') || 'Turn complete.';
          let xpVal = data.xpAwarded !== undefined ? data.xpAwarded : (data.xpChange || 0);
          xpVal = parseInt(xpVal, 10);
          if (isNaN(xpVal)) xpVal = 0;
          data.xpAwarded = xpVal;
          data.xpChange = xpVal;
          data.isTerminalTurn = !!isLastTurn;
          let roll;
          if (adventureChanceMode) {
              roll = parseInt(data.rollDetails?.d20 || data.rollDetails?.total || chanceRoll || 10, 10);
          } else {
              roll = parseInt(data.rollDetails?.total || data.rollDetails?.d20 || 10, 10);
          }
          if (adventureChanceMode && roll > 2 && roll < 19 && (roll % 5 === 0)) {
             roll += Math.floor(Math.random() * 3) - 1;
          }
          roll = Math.max(1, Math.min(20, isNaN(roll) ? 10 : roll));
      setDiceResult(roll);
      data.choiceSource = 'freetext';
      setPendingAdventureUpdate(data);
      setShowDice(true);
    } catch (error) {
      warnLog("Adventure Text Error:", error);
      addToast(t('toasts.connection_failed'), "error");
      setFailedAdventureAction({ type: 'text', payload: currentInput });
      const snapshot = lastTurnSnapshot.current;
      setAdventureState(prev => snapshot ? { ...snapshot, isLoading: false, isImageLoading: false } : { ...prev, isLoading: false });
    }
};

const handleAdventureChoice = async (choice, deps) => {
  const { adventureState, adventureTextInput, adventureInputMode, adventureLanguageMode, adventureChanceMode, adventureConsistentCharacters, adventureCustomInstructions, adventureFreeResponseEnabled, history, inputText, sourceTopic, gradeLevel, standardsInput, studentInterests, isIndependentMode, isTeacherMode, factionResourceMode, enableFactionResources, selectedLanguages, currentUiLanguage, apiKey, appId, activeSessionAppId, activeSessionCode, globalPoints, sessionData, user, alloBotRef, lastTurnSnapshot, lastReadTurnRef, pdfPreviewRef, exportPreviewRef, setActiveView, setAdventureState, setAdventureTextInput, setDiceResult, setFailedAdventureAction, setGeneratedContent, setGenerationStep, setHasSavedAdventure, setHistory, setIsResumingAdventure, setPendingAdventureUpdate, setShowDice, setShowGlobalLevelUp, setShowNewGameSetup, callGemini, callGeminiVision, addToast, t, warnLog, debugLog, cleanJson, archiveAdventureImage, SafetyContentChecker, handleAiSafetyFlag, playAdventureEventSound, handleScoreUpdate, getAdventureGlossaryTerms, generateAdventureImage, generateNarrativeLedger, generatePixelArtItem, detectClimaxArchetype, flyToElement, resilientJsonParse, storageDB, updateDoc, doc, db, ADVENTURE_GUARDRAIL, DEBATE_INVISIBLE_INSTRUCTIONS, INVISIBLE_NARRATOR_INSTRUCTIONS, NARRATIVE_GUARDRAILS, SYSTEM_INVISIBLE_INSTRUCTIONS, SYSTEM_STATE_EXAMPLES, aiBotsActive, narrativeLedger, isAdventureStoryMode, isImmersiveMode, isReviewingCharacters, isShopOpen, isSocialStoryMode, debateTopic, socialStoryFocus, stopPlayback, playSound, resetDebate } = deps;
  try { if (window._DEBUG_ADVENTURE) console.log("[Adventure] handleAdventureChoice fired"); } catch(_) {}
    const normalizedChoice = typeof choice === 'object' && choice?.action ? choice.action : choice;
    if (adventureState.isLoading) return;
    if (!isTeacherMode && activeSessionCode) {
        if (sessionData?.democracy?.isActive) {
            if (!user) return;
            try {
                const targetAppId = activeSessionAppId || appId;
                const sessionRef = doc(db, 'artifacts', targetAppId, 'public', 'data', 'sessions', activeSessionCode);
                await updateDoc(sessionRef, {
                    [`democracy.votes.${user.uid}`]: normalizedChoice
                });
                addToast(t('session.toast_vote_cast', { choice: normalizedChoice }), "success");
                playSound('click');
            } catch (e) {
                warnLog("Voting failed", e);
                addToast(t('session.toast_vote_fail'), "error");
            }
            return;
        }
        addToast(t('session.toast_teacher_control'), "info");
        return;
    }
    stopPlayback();
    playAdventureEventSound('decision_select');
    lastTurnSnapshot.current = structuredClone(adventureState);
    setAdventureState(prev => ({ ...prev, isLoading: true, pendingChoice: normalizedChoice, loadingStage: 'Considering your choice…' }));
    let archivedImageId = null;
    if (adventureState.sceneImage) {
        try {
            archivedImageId = await archiveAdventureImage(adventureState.sceneImage);
        } catch (archiveError) {
            warnLog("Adventure Image Archive Error", archiveError);
        }
    }
    const safeState = { ...adventureState };
    setAdventureState(prev => ({
      ...prev,
      history: [
          ...prev.history,
          {
              type: 'scene',
              text: prev.currentScene.text,
              imageId: archivedImageId
          },
          { type: 'choice', text: normalizedChoice, source: 'option' }
      ],
      sceneImage: null,
      sceneImagePreview: null,
      imagePolishStage: null,
      isLoading: true,
      loadingStage: 'Considering your choice…',
      pendingChoice: normalizedChoice,
    }));
    try {
      const maxTurns = adventureState.climaxMinTurns || 20;
      const isLastTurn = !adventureState.enableAutoClimax && adventureState.turnCount >= maxTurns;
      const turnsSinceLastDrop = adventureState.turnCount - (adventureState.lastKeyItemTurn || 0);
      const keyTerms = getAdventureGlossaryTerms(history, adventureLanguageMode);
      const analysisItem = history.slice().reverse().find(h => h && h.type === 'analysis');
      const keyConcepts = analysisItem ? analysisItem.data.concepts.join(', ') : '';
      const sourceText = (analysisItem && analysisItem.data && analysisItem.data.originalText)
          ? analysisItem.data.originalText
          : inputText;
      const currentInventoryNames = adventureState.inventory.map(i => i.name).join(', ');
      let langInstruction = "Language: English.";
      if (adventureLanguageMode !== 'English') {
          if (adventureLanguageMode === 'All + English') {
              langInstruction = `Language: Multilingual mix of ${selectedLanguages.join(', ')}. CRITICAL: Provide English translations for ALL narrative text and choices.`;
          } else if (adventureLanguageMode.endsWith(' + English')) {
              const targetLang = adventureLanguageMode.replace(' + English', '');
              langInstruction = `Language: ${targetLang}. CRITICAL: Provide English translations for ALL narrative text and choices.`;
          } else {
              langInstruction = `Language: ${adventureLanguageMode}. Do NOT provide English translations.`;
          }
          langInstruction += ` STRICT DIALECT ADHERENCE: If a specific dialect is named (e.g. 'Brazilian Portuguese' vs 'European Portuguese'), explicitly use that region's vocabulary, spelling, and grammar conventions.`;
      }
      const toneInstruction = isAdventureStoryMode
          ? "TONE: Story Time Mode (Family Friendly). Continue with exploration, mystery, and puzzles. Avoid combat or intense danger."
          : "";
      const socialStoryInstruction = isSocialStoryMode
          ? `SOCIAL STORY MODE: Continue focusing on "${socialStoryFocus || 'Social Skills'}". Show realistic emotional and relationship consequences, and keep choices grounded in cooperative, assertive, passive, impulsive, and creative social approaches.`
          : "";
      const optionsInstruction = !adventureFreeResponseEnabled ? (isSocialStoryMode ? `
        CRITICAL: Provide 4-6 distinct social choices, including cooperative/prosocial,
        assertive/boundary-setting, passive/avoidant, impulsive/aggressive, and creative alternatives.
      ` : `
        CRITICAL: Provide exactly 6 distinct choices for the NEXT scene options, randomly ordered:
        - 1 Very Strong/Smart Option (Demonstrates mastery)
        - 2 Mildly Good Options (Acceptable but standard)
        - 1 Neutral Option (Irrelevant or passive)
        - 1 Mildly Bad Option (Minor misconception or risky)
        - 1 Very Bad Option (Major misconception or failure)
      `) : '';
      const jsonOptionsExample = adventureFreeResponseEnabled ? "[]" : `["Choice 1", "Choice 2", "Choice 3", "Choice 4", "Choice 5", "Choice 6"]`;
      const chanceRoll = adventureChanceMode ? Math.floor(Math.random() * 20) + 1 : null;
      const rollModifier = adventureState.activeRollModifier || 0;
      const effectiveRoll = chanceRoll ? chanceRoll + rollModifier : null;
      const mechanicsInstruction = adventureChanceMode
        ? `SYSTEM: CHANCE MODE ACTIVE. Raw D20 Roll: ${chanceRoll}${rollModifier > 0 ? ` + ${rollModifier} Luck Bonus = ${effectiveRoll}` : ''}.
           1. Analyze the strategy of the action on a scale of 1 (Terrible) to 20 (Genius).
           2. Calculate Total = ${effectiveRoll || chanceRoll} (Roll${rollModifier > 0 ? ' + Luck Bonus' : ''}) + Strategy Rating.
           3. Compare Total against DCs: < 16 (Fail), 16-21 (Partial), 22-27 (Success), 28+ (Critical).
           4. Return "d20": ${chanceRoll} and "total": [Calculated Sum] in the JSON.`
        : `SYSTEM: DETERMINISTIC MODE. Analyze action quality. Assign a Performance Score on a d20 scale (1-20).
           - 1-5: Critical Failure
           - 6-10: Failure/Partial
           - 11-15: Success
           - 16-20: Critical Success
           CRITICAL: You MUST set "d20" and "total" in the JSON to this 1-20 score. Do NOT use a 1-5 star rating.`;
      const taggingInstruction = `
        OUTCOME TAGGING (CRITICAL):
        Analyze the student's choice quality relative to the learning goal.
        Return "outcomeType":
        - "strategic_success": Optimal choice, demonstrates mastery.
        - "partial_success": Acceptable but flawed.
        - "misconception": Choice reveals a misunderstanding of the topic.
        - "neutral": Narrative choice with no educational weight.
        If this choice demonstrated understanding of a specific Key Concept from the source text, include it in "conceptsUsed": ["Concept Name"].
      `;
      let climaxInstruction = "";
      if (adventureState.climax && adventureState.climax.isActive) {
          const archetype = adventureState.climax.archetype || "Catastrophe";
          const currentScore = adventureState.climax.masteryScore || 50;
          const archetypeGuides = {
              'Antagonist': "SCENE TYPE: FINAL DUEL. A direct, back-and-forth struggle against a rival/villain.",
              'Catastrophe': "SCENE TYPE: DISASTER CONTAINMENT. Trying to stabilize a failing system before it collapses.",
              'Masterpiece': "SCENE TYPE: FINAL PERFORMANCE. Executing a complex creative or intellectual task under pressure.",
              'Discovery': "SCENE TYPE: DANGEROUS EXPEDITION. Navigating the final gauntlet to reach the goal.",
          };
          const specificGuide = archetypeGuides[archetype] || archetypeGuides['Catastrophe'];
          climaxInstruction = `
            *** CLIMAX MODE ACTIVE: TUG-OF-WAR MECHANIC ***
            Archetype: ${archetype}
            ${specificGuide}
            --- CURRENT STATUS ---
            **Progress Bar:** ${currentScore}%
            **Goal:** 100% (Victory)
            **Fail State:** 0% (Defeat)
            --- MECHANICS INSTRUCTIONS (CRITICAL) ---
            1. Analyze the student's choice quality relative to the learning goal.
            2. **Assign a Progress Shift** based on the choice:
               - **Critical Success (Great Strategy):** +20%
               - **Success (Good Strategy):** +10%
               - **Partial/Neutral:** -5% (Time is running out/Status quo hurts)
               - **Failure (Bad Choice):** -15% (Bar slides backwards)
               - **Critical Failure:** -25% (Major setback)
            3. **Calculate New Score:** ${currentScore} + (Shift).
            --- OUTPUT LOGIC ---
            - **IF New Score >= 100**:
               - Set "climaxResult": "victory".
               - Write the narrative as the definitive win/resolution.
            - **IF New Score <= 0**:
               - Set "climaxResult": "failure".
               - Write the narrative as the collapse/defeat.
            - **OTHERWISE (0 < Score < 100)**:
               - Set "climaxResult": null.
               - Write a tense scene describing the shift in momentum (e.g. "You gain ground, but..." or "You stumble, losing time...").
               - Update "masteryScore": [New Score] in the JSON (You must return this field).
          `;
      }
      let modeContext = "";
      let narratorInstructions = INVISIBLE_NARRATOR_INSTRUCTIONS;
      if (adventureInputMode === 'system') {
          narratorInstructions = SYSTEM_INVISIBLE_INSTRUCTIONS;
          const systemStateNames = (adventureState.systemResources || []).map(r => `${r.icon} ${r.name} (${r.quantity}${r.unit || ''})`).join(', ') || 'No state variables yet';
          modeContext = `MODE: SYSTEM SIMULATION (Macro-Scale Roleplay).
          You are simulating macro-scale policy decisions for a faction, nation, organization, or complex system.
          VOCABULARY MAPPING (Use these terms):
          - "Energy" = "Stability" (0-100 scale represents system stability)
          - "Inventory" = "System State" (tracked variables: metrics, resources, relationships, conditions)
          - "Action" = "Policy Decision"
          - "XP" = "Influence Points",
          CURRENT SYSTEM STATE: [${systemStateNames}]
          STATE MANAGEMENT RULES:
          1. State variables dynamically affect narrative. Low Morale = unrest. High Trade = prosperity bonus.
          2. When player decisions impact state, include "systemStateUpdate" in your JSON response:
             { "add": [{ "name": "Variable", "icon": "emoji", "quantity": 5, "unit": "% or people or days", "type": "strategic|consumable|currency" }],
               "remove": [{ "name": "Variable", "quantity": 2 }] }
          3. State variables can be spent by player for strategic advantages (e.g., spend 10 Political Capital for a bonus).
          4. Generate thematic state variables that fit the simulation subject (e.g., for medieval: Grain, Iron, Loyalty; for sci-fi: Credits, Fuel, Tech).
          5. Each state variable needs an emoji icon that fits its theme.
          FOCUS: Systemic cause-and-effect, long-term consequences, stability, and collective outcomes (not individual heroics).`;
      } else if (adventureInputMode === 'debate') {
          narratorInstructions = DEBATE_INVISIBLE_INSTRUCTIONS;
          modeContext = "MODE: DEBATE. Focus on rhetoric, logical fallacies, and persuasive impact.";
      }
      let historyContext = "";
      if (adventureState.narrativeLedger) {
          const recentHistory = adventureState.history.slice(-5);
          const recentText = recentHistory.map(h => `${h.type.toUpperCase()}: ${h.text}`).join('\n');
          historyContext = `--- PREVIOUS STORY SUMMARY (NARRATIVE LEDGER) ---\n${adventureState.narrativeLedger}\n\n--- RECENT LOG (Last 5 Turns) ---\n${recentText}\n`;
      } else {
          const fullText = adventureState.history.map(h => `${h.type.toUpperCase()}: ${h.text}`).join('\n');
          historyContext = `--- FULL ADVENTURE LOG ---\n${fullText}\n`;
      }
      historyContext += getAssistedKnowledgeContext(adventureState);
      const prompt = `
        Continue the "${adventureInputMode === 'system' ? 'System Simulation' : 'Adventure'}" simulation.
        ${modeContext}
        ${historyContext}
        ${narratorInstructions}
        --- CRITICAL SETTINGS ---
        Target Audience: ${gradeLevel} students.
        READING LEVEL ENFORCEMENT: The narrative text and choices MUST be written at a ${gradeLevel} reading level.
        - If Kindergarten-2nd: Short sentences, simple words.
        - If 3rd-5th: clear, direct sentences.
        - If 6th+: Standard complexity.
        -------------------------
        Source Material: "${sourceText.substring(0, 1000)}..."
        ${langInstruction}
        ${toneInstruction}
        ${socialStoryInstruction}
        ${adventureCustomInstructions ? `Custom Instructions: ${adventureCustomInstructions}` : ''}
        Level: ${adventureState.level}, Energy: ${adventureState.energy}/100, Inventory: [${currentInventoryNames}]
        Previous Scene: "${adventureState.currentScene.text}"
        Choice: "${normalizedChoice}"
        ${mechanicsInstruction}
        ${optionsInstruction}
        ${climaxInstruction}
        ${taggingInstruction}
        ${adventureInputMode === 'debate' ? `
        CRITICAL: CALCULATE DEBATE MOMENTUM CHANGE
        Analyze the strategic value of the choice "${normalizedChoice}".
        Current Momentum: ${adventureState.debateMomentum}/100.
        - Strong/Clever Point: +10 to +15
        - Valid/Moderate Point: +5
        - Weak/Neutral/Stall: -5
        - Poor Argument/Fallacy: -10 to -15
        - "Give Up" or "Concede": Set "resetDebate": true.
        ` : ''}
        Tasks: Calculate Energy/Gold/XP. Generate Next Scene.
        ${turnsSinceLastDrop >= 6 ? '- KEY ITEM OPPORTUNITY: If Score High, award Key Item.' : ''}
        CRITICAL INSTRUCTIONS:
        1. INVENTORY SYNC: If your narrative text describes finding an item, loot, or object, you MUST include it in the 'inventoryUpdate' JSON field. Do not hallucinate items in text without adding them to data.
        2. REWARDS: Award 'goldAwarded' (10-50) frequently for successful actions, exploration, or smart decisions. Don't be stingy.
        ${NARRATIVE_GUARDRAILS}
        Return JSON:
        {
          "feedback": "Evaluation...",
          "outcomeType": "strategic_success | partial_success | misconception | neutral",
          "conceptsUsed": ["Concept1", "Concept2"],
          "climaxResult": "One of: 'victory', 'failure', or null. REQUIRED if a Climax Scene is currently active. Return 'victory' if choice resolves conflict. Return 'failure' if choice fails crisis.",
          "masteryScore": 50,
          "xpAwarded": number, "energyChange": number, "goldAwarded": number,
          ${adventureInputMode === 'debate' ? '"debateMomentumChange": number, "resetDebate": boolean, "newTopic": "String",' : ''}
          ${adventureInputMode === 'system' ? '"systemStateUpdate": { "add": [{ "name": "Variable", "icon": "emoji", "quantity": 5, "type": "strategic|consumable|currency" }], "remove": [{ "name": "Variable", "quantity": 2 }] } OR null,' : ''}
          "rollDetails": { "strategyRating": number, "d20": ${chanceRoll || "Score_1_to_20"}, "total": number, "outcomeType": "String" },
          "inventoryUpdate": { "add": { "name": "Item", "type": "permanent" } } OR null,
          "voices": { "NewChar": "VoiceName" },
          "scene": { "text": "Scene...", "options": ${isLastTurn ? "[]" : jsonOptionsExample} },
          "soundParams": {
              "atmosphere": "One of: Tense, Calm, Ethereal, Dark, Joyful",
              "element": "One of: Fire, Water, Wind, Machinery, Nature, Silence"
          }
        }
      `;
      const result = await callGemini(prompt, true);
      let data;
      try {
          data = await resilientJsonParse(result);
      } catch (finalErr) {
          warnLog("Critical Adventure Failure (Auto-Repair failed):", finalErr);
          data = {
              feedback: "System anomaly detected and bypassed.",
              outcomeType: "neutral",
              conceptsUsed: [],
              xpAwarded: 0,
              energyChange: 0,
              goldAwarded: 0,
              rollDetails: { total: 10, d20: 10, outcomeType: "neutral" },
              inventoryUpdate: null,
              voices: {},
              scene: {
                  text: "The simulation encountered a data stream error (Time distortion detected). You shake it off and prepare to move forward...",
                  options: ["Continue", "Check Inventory", "Look Around", "Wait"]
              },
              soundParams: { atmosphere: "Tense", element: "Silence" }
          };
          addToast(t('toasts.auto_repair_fallback'), "warning");
      }
       if (!data.scene || typeof data.scene !== 'object') {
           data.scene = { text: t('adventure.status_messages.continue') || 'The adventure continues.', options: [] };
       }
       data.scene.text = String(data.scene.text || (t('adventure.status_messages.continue') || 'The adventure continues.'));
       if (!Array.isArray(data.scene.options)) data.scene.options = [];
       if (!data.feedback && !data.evaluation) data.feedback = t('adventure.status_messages.turn_complete') || 'Turn complete.';
       if (data.soundParams && data.scene) {
           data.scene.soundParams = data.soundParams;
       }
      if (!adventureState.climax?.isActive && data.climaxResult) {
          warnLog('[Adventure] AI returned climaxResult=' + data.climaxResult + ' but climax is not active — ignoring');
          delete data.climaxResult;
      }
      if (data.climaxResult === 'victory' && adventureState.climax?.isActive) {
          const victoryHistory = [
              ...adventureState.history,
              { type: 'scene', text: adventureState.currentScene.text },
              { type: 'choice', text: normalizedChoice, source: 'option' },
              { type: 'feedback', text: data.feedback }
          ];
          generateNarrativeLedger(victoryHistory);
          addToast(t('adventure.status_messages.log_updated'), "info");
          setAdventureState(prev => ({
              ...prev,
              isGameOver: true,
              history: [...prev.history, { type: 'feedback', text: data.feedback }],
              currentScene: data.scene, pendingChoice: null,
              climax: { ...prev.climax, isActive: false, masteryScore: 100 },
              isLoading: false
          }));
          playAdventureEventSound('critical_success');
          addToast(t('adventure.climax.toast_victory'), "success");
          setShowGlobalLevelUp(true);
          return;
      } else if (data.climaxResult === 'failure' && adventureState.climax?.isActive) {
          const failureHistory = [
              ...adventureState.history,
              { type: 'scene', text: adventureState.currentScene.text },
              { type: 'choice', text: normalizedChoice, source: 'option' },
              { type: 'feedback', text: data.feedback }
          ];
          generateNarrativeLedger(failureHistory);
          addToast(t('adventure.status_messages.log_updated'), "info");
          setAdventureState(prev => ({
              ...prev,
              history: [...prev.history, { type: 'feedback', text: data.feedback }],
              currentScene: data.scene, pendingChoice: null,
              energy: Math.max(0, prev.energy - 20),
              climax: {
                  ...prev.climax,
                  isActive: false,
                  masteryScore: 50,
                  attempts: (prev.climax.attempts || 0) + 1
              },
              isLoading: false
          }));
          playAdventureEventSound('failure');
          addToast(t('adventure.climax.toast_failure'), "error");
          return;
      }
      let xpVal = data.xpAwarded !== undefined ? data.xpAwarded : (data.xpChange || 0);
      xpVal = parseInt(xpVal, 10);
      if (isNaN(xpVal)) xpVal = 0;
      data.xpAwarded = xpVal;
      data.xpChange = xpVal;
      data.isTerminalTurn = !!isLastTurn;
      let roll;
      if (adventureChanceMode) {
          roll = parseInt(data.rollDetails?.d20 || data.rollDetails?.total || chanceRoll || 10, 10);
      } else {
          roll = parseInt(data.rollDetails?.total || data.rollDetails?.d20 || 10, 10);
      }
      if (adventureChanceMode && roll > 2 && roll < 19 && (roll % 5 === 0)) {
         roll += Math.floor(Math.random() * 3) - 1;
      }
      roll = Math.max(1, Math.min(20, isNaN(roll) ? 10 : roll));
      setDiceResult(roll);
      data.choiceSource = 'option';
      setPendingAdventureUpdate(data);
      setShowDice(true);
      if (isTeacherMode && activeSessionCode && sessionData?.democracy?.isActive) {
           const targetAppId = activeSessionAppId || appId;
           const sessionRef = doc(db, 'artifacts', targetAppId, 'public', 'data', 'sessions', activeSessionCode);
           updateDoc(sessionRef, { "democracy.votes": {} }).catch(e => warnLog("Vote reset failed", e));
      }
    } catch (error) {
      warnLog("Adventure Turn Error:", error);
      addToast(t('toasts.connection_failed'), "error");
      setFailedAdventureAction({ type: 'choice', payload: normalizedChoice });
      setAdventureState(prev => {
          return {
              ...safeState,
              isLoading: false
          };
      });
    }
};

// Guiding Hand: a paid, diegetic assist that advances the story without
// awarding mastery credit or changing any tracked reward/resource state.
const handleGuidingHand = async (item, deps) => {
  const {
    adventureState, adventureInputMode, adventureLanguageMode, adventureFreeResponseEnabled,
    adventureConsistentCharacters, adventureCustomInstructions, isAdventureStoryMode,
    isSocialStoryMode, socialStoryFocus, sourceTopic, inputText, gradeLevel,
    currentUiLanguage, selectedLanguages, lastTurnSnapshot, setAdventureState, callGemini,
    resilientJsonParse, addToast, t, warnLog, generateAdventureImage,
    playAdventureEventSound, alloBotRef, ADVENTURE_GUARDRAIL, NARRATIVE_GUARDRAILS
  } = deps;

  if (!item || item.effectType !== 'story_assist') return false;
  if (!adventureState.currentScene || adventureState.isGameOver) {
    addToast(t('adventure.guiding_hand_unavailable') || 'Guiding Hand needs an active scene.', 'info');
    return false;
  }
  if (adventureState.isLoading) return false;
  if (adventureState.climax?.isActive) {
    addToast(t('adventure.guiding_hand_climax') || 'Guiding Hand cannot resolve the final challenge.', 'warning');
    return false;
  }

  const safeSnapshot = typeof structuredClone === 'function'
    ? structuredClone(adventureState)
    : JSON.parse(JSON.stringify(adventureState));
  if (lastTurnSnapshot?.current !== undefined) lastTurnSnapshot.current = safeSnapshot;
  setAdventureState(prev => ({ ...prev, isLoading: true }));
  addToast(t('adventure.guiding_hand_started') || 'A guiding hand is stepping into the story...', 'info');

  try {
    let modeGuidance = 'Use an ally, a timely discovery, or a believable event that fits the current narrative.';
    if (isSocialStoryMode) {
      modeGuidance = `A supportive person models an effective response connected to "${socialStoryFocus || 'the current social situation'}" without shaming the learner.`;
    } else if (adventureInputMode === 'debate') {
      modeGuidance = 'A credible expert, moderator, or newly surfaced evidence resolves the immediate debate obstacle and teaches a transferable reasoning principle.';
    } else if (adventureInputMode === 'system') {
      modeGuidance = 'A safeguard, knowledgeable stakeholder, or timely system event resolves the immediate policy/systems obstacle and demonstrates the underlying systems principle.';
    }

    const castContext = adventureConsistentCharacters && Array.isArray(adventureState.characters) && adventureState.characters.length
      ? `Established cast:\n${adventureState.characters.map(character => `- ${character.name}: ${character.role || 'character'}; ${character.appearance || ''}`).join('\n')}\nPrefer an established character when one naturally fits; otherwise use a plausible event or discovery.`
      : 'Introduce a context-appropriate helper, event, safeguard, or discovery only if needed.';
    const learnedContext = getAssistedKnowledgeContext(adventureState);
    const sourceContext = String(inputText || sourceTopic || '').slice(0, 1800);
    const recentHistory = (adventureState.history || []).slice(-6).map(entry => `${String(entry.type || 'event').toUpperCase()}: ${String(entry.text || '')}`).join('\n');
    const optionsInstruction = adventureFreeResponseEnabled
      ? 'Return scene.options as an empty array. End with a specific new unresolved problem that invites the learner to type the next response.'
      : 'Return exactly 4 concise, distinct options for the NEW problem after the intervention. Do not ask the learner to redo the obstacle that was just resolved.';
    let languageInstruction = 'Write all learner-facing text in English.';
    if (adventureLanguageMode && adventureLanguageMode !== 'English') {
      if (adventureLanguageMode === 'All + English') {
        languageInstruction = `Use a multilingual mix of ${(selectedLanguages || []).join(', ') || 'the selected languages'} and provide English translations for all narrative text and choices.`;
      } else if (adventureLanguageMode.endsWith(' + English')) {
        const targetLanguage = adventureLanguageMode.replace(' + English', '');
        languageInstruction = `Write in ${targetLanguage} and provide English translations for all narrative text and choices.`;
      } else {
        languageInstruction = `Write all learner-facing text in ${adventureLanguageMode} without English translations.`;
      }
    }

    const prompt = `You are continuing an educational interactive simulation for ${gradeLevel || 'school-age'} learners.

CURRENT MODE: ${adventureInputMode || 'adventure'}${isSocialStoryMode ? ' / social story' : ''}${isAdventureStoryMode ? ' / family-friendly story time' : ''}
LANGUAGE: ${languageInstruction}
SOURCE/TOPIC CONTEXT:
${sourceContext || 'Use the established story context.'}

CURRENT SCENE AND OBSTACLE:
${String(adventureState.currentScene.text || '').slice(0, 2200)}

RECENT STORY LOG:
${recentHistory || 'No prior log.'}

${adventureState.narrativeLedger ? `STORY SUMMARY:\n${String(adventureState.narrativeLedger).slice(-2500)}` : ''}
${learnedContext}
${castContext}

GUIDING HAND RULES:
1. The learner has intentionally used a paid Guiding Hand item because they may not know how to solve the current obstacle.
2. ${modeGuidance}
3. Resolve the CURRENT obstacle through that intervention. Never imply the learner supplied the missing answer or independently demonstrated mastery.
4. Naturally demonstrate and explain ONE concrete, transferable piece of knowledge: a fact, rule, strategy, causal relationship, or reasoning principle grounded in the source/topic. It must be useful in a plausible later scene, not a generic platitude.
5. The intervention and explanation must be part of the story, not an out-of-character lecture.
6. Advance to a NEW, playable obstacle. Never end the adventure, resolve a climax, declare victory, or skip multiple scenes.
7. This assisted turn awards NO XP, Gold, success credit, concept credit, energy change, health/stability change, inventory reward, resource change, or debate momentum.
8. ${optionsInstruction}
${adventureCustomInstructions ? `9. Continue honoring these educator instructions where they do not conflict with the rules above: ${adventureCustomInstructions}` : ''}

${ADVENTURE_GUARDRAIL || ''}
${NARRATIVE_GUARDRAILS || ''}

Return ONLY valid JSON:
{
  "interventionSummary": "One short sentence describing who or what stepped in",
  "knowledgeDrop": "One self-contained, concrete statement the learner can apply later",
  "evaluation": "A short, encouraging explanation that this was an assisted turn with no rewards",
  "voices": { "Character Name": "VoiceName" },
  "charactersInScene": ["Character Name"],
  "scene": {
    "text": "The diegetic intervention, its explanation, and the new unresolved obstacle",
    "options": ${adventureFreeResponseEnabled ? '[]' : '["Option 1", "Option 2", "Option 3", "Option 4"]'}
  }
}`;

    const response = await callGemini(prompt, true);
    const parsed = await (typeof resilientJsonParse === 'function'
      ? resilientJsonParse(response)
      : JSON.parse(response));
    const knowledgeDrop = String(parsed?.knowledgeDrop || '').trim();
    const sceneText = String(parsed?.scene?.text || '').trim();
    if (knowledgeDrop.length < 12 || sceneText.length < 20) {
      throw new Error('Guiding Hand response omitted the required scene or knowledge drop.');
    }

    let options = Array.isArray(parsed.scene.options)
      ? parsed.scene.options.map(option => String(option || '').trim()).filter(Boolean).slice(0, 6)
      : [];
    if (adventureFreeResponseEnabled) {
      options = [];
    } else if (options.length < 2) {
      options = [
        'Apply the new knowledge to the next problem',
        'Ask a clarifying question',
        'Examine what changed',
        'Try a different approach'
      ];
    }

    const nextTurn = (Number(adventureState.turnCount) || 0) + 1;
    const interventionSummary = String(parsed.interventionSummary || 'A timely intervention resolved the immediate obstacle.').trim();
    const evaluation = String(parsed.evaluation || 'Guiding Hand assisted this turn, so no XP or Gold was awarded.').trim();
    const knowledgeHistory = `${t('adventure.guiding_hand_knowledge_label') || 'Knowledge gained'}: ${knowledgeDrop}`;
    const nextScene = {
      ...parsed.scene,
      text: sceneText,
      options,
      charactersInScene: Array.isArray(parsed.charactersInScene) ? parsed.charactersInScene : []
    };

    setAdventureState(prev => {
      const priorKnowledge = Array.isArray(prev.assistedKnowledge) ? prev.assistedKnowledge : [];
      const alreadyKnown = priorKnowledge.some(entry => String(entry).toLocaleLowerCase() === knowledgeDrop.toLocaleLowerCase());
      const assistedKnowledge = (alreadyKnown ? priorKnowledge : [...priorKnowledge, knowledgeDrop]).slice(-12);
      const ledgerLine = `Guiding Hand knowledge (assisted): ${knowledgeDrop}`;
      return {
        ...prev,
        history: [
          ...(prev.history || []),
          { type: 'scene', text: String(prev.currentScene?.text || '') },
          { type: 'assist', text: interventionSummary, source: 'guiding_hand' },
          { type: 'feedback', text: `${evaluation}\n${knowledgeHistory}`, assisted: true }
        ],
        currentScene: nextScene,
        pendingChoice: null,
        turnCount: nextTurn,
        inventory: (prev.inventory || []).filter(inventoryItem => inventoryItem.id !== item.id),
        assistedKnowledge,
        narrativeLedger: prev.narrativeLedger ? `${prev.narrativeLedger}\n${ledgerLine}` : ledgerLine,
        voiceMap: { ...(prev.voiceMap || {}), ...(parsed.voices || {}) },
        currentHint: null,
        sceneImage: null,
        isImageLoading: true,
        isLoading: false,
        isGameOver: false
      };
    });

    setTimeout(() => generateAdventureImage(sceneText, nextTurn), 0);
    playAdventureEventSound('transition');
    addToast(t('adventure.guiding_hand_complete') || 'Guiding Hand moved the story forward. No XP or Gold was awarded.', 'success');
    if (alloBotRef?.current?.triggerReaction) alloBotRef.current.triggerReaction('\u{1F91D}');
    return true;
  } catch (error) {
    warnLog('Guiding Hand failed', error);
    setAdventureState({ ...safeSnapshot, isLoading: false });
    addToast(t('adventure.guiding_hand_failed') || 'The intervention could not be generated. Guiding Hand was not consumed.', 'error');
    return false;
  }
};
// Free-response Strategy Hint: a formative scaffold, not an answer.
// The student still decides and writes the action, so rewards are not reduced.
// A valid hint is available once per scene; failed generation unlocks a retry.
const handleAdventureHint = async (deps) => {
  const {
    adventureState,
    adventureTextInput,
    setAdventureState,
    callGemini,
    addToast,
    t,
    warnLog,
    resilientJsonParse,
    gradeLevel,
    sourceTopic,
    inputText,
    standardsInput,
    adventureInputMode,
    adventureLanguageMode,
    selectedLanguages,
    adventureCustomInstructions,
    isSocialStoryMode,
    socialStoryFocus,
  } = deps;
  const scene = adventureState.currentScene;
  if (!scene || adventureState.isLoading) return;
  if (adventureState.hintUsedTurn === adventureState.turnCount) return; // one per scene

  const requestTurn = adventureState.turnCount;
  if (adventureState.currentHint?.turn === requestTurn && adventureState.currentHint.loading) return;
  const sceneText = String(scene.text || '').replace(/\s+/g, ' ').trim();
  const sourceText = String(inputText || '').replace(/\s+/g, ' ').trim().slice(0, 2800);
  const topicText = String(sourceTopic || '').trim();
  const draftText = String(adventureTextInput || '').trim().slice(0, 600);
  const mode = isSocialStoryMode ? 'social' : String(adventureInputMode || 'adventure').toLowerCase();
  const modeGuidance = mode === 'debate'
    ? 'NOTICE relevant evidence or an assumption; CONNECT it to the claim; TRY a claim-evidence-reasoning move without composing the argument.'
    : mode === 'system'
      ? 'NOTICE a relationship, constraint, feedback loop, or tradeoff; CONNECT it to system behavior; TRY an investigation or reasoning move without selecting the intervention.'
      : mode === 'social'
        ? 'NOTICE a social cue, perspective, feeling, or need; CONNECT it to a communication principle; TRY a respectful planning move without scripting the response.'
        : 'NOTICE a relevant story or subject-matter detail; CONNECT it to the obstacle; TRY a reasoning move without choosing the action.';
  const languageMode = String(adventureLanguageMode || 'English');
  const languageGuidance = languageMode === 'English'
    ? 'Write in English.'
    : languageMode === 'All + English'
      ? `Write in ${Array.isArray(selectedLanguages) && selectedLanguages.length ? selectedLanguages.join(', ') : 'the selected languages'}, with a concise English translation in each field.`
      : languageMode.includes('+ English')
        ? `Write bilingually in ${languageMode.replace('+ English', '').trim()} and English.`
        : `Write in ${languageMode}.`;

  // Lock only during generation. A failed or vague response does not consume
  // the scene's clue; hintUsedTurn is stamped only after validation succeeds.
  setAdventureState(prev => ({
    ...prev,
    currentHint: { turn: requestTurn, text: '', loading: true, supportType: 'strategy_hint' },
  }));
  addToast(t('adventure.hint_started') || 'Building a strategy hint...', 'info');

  try {
    const prompt = `Create a high-value formative Strategy Hint for a ${gradeLevel || 'middle school'} student.
The student is in free-response mode and must still decide and write the action.

CURRENT SCENE:
"${sceneText.slice(0, 1800)}"

TOPIC / LEARNING FOCUS:
"${topicText || 'Use the current scene and source context.'}"
${standardsInput ? `Learning objective or standard: ${String(standardsInput).slice(0, 700)}` : ''}

SOURCE CONTEXT:
"${sourceText || 'No separate source was provided; use only accurate details established in the scene.'}"

${draftText ? `STUDENT DRAFT SO FAR:\n"${draftText}"\nBuild on the draft without rewriting it.` : ''}

MODE GUIDANCE:
${modeGuidance}
${isSocialStoryMode && socialStoryFocus ? `Social-story focus: ${String(socialStoryFocus).slice(0, 500)}` : ''}
${adventureCustomInstructions ? `Teacher instructions: ${String(adventureCustomInstructions).slice(0, 700)}` : ''}
${languageGuidance}

Return a specific scaffold with ALL THREE parts:
1. "notice": one exact, accurate source/scene detail that meaningfully narrows what matters. Never merely say "reread," "think carefully," or restate the problem.
2. "connect": explain the concept, relationship, or strategy that makes that detail relevant to the obstacle.
3. "try": one concrete reasoning move the student can attempt next without giving the action or answer.
Optionally include "starter": one short, open-ended sentence frame the student may adapt.

Do NOT resolve the obstacle, choose an option, write the student's response, state a final answer, or invent unsupported facts. Preserve student agency.
Return ONLY JSON:
{"notice":"...","connect":"...","try":"...","starter":"..."}`;
    const resp = await callGemini(prompt, true, false, 0.7);
    const parsed = (typeof resilientJsonParse === 'function' ? await resilientJsonParse(resp) : JSON.parse(resp)) || {};
    const notice = String(parsed.notice || parsed.clue || '').trim();
    const connect = String(parsed.connect || parsed.question || '').trim();
    const tryStep = String(parsed.try || parsed.strategy || '').trim();
    const starter = String(parsed.starter || '').trim();
    if (notice.length < 18 || connect.length < 18 || tryStep.length < 18) {
      throw new Error('Strategy Hint response was too vague');
    }
    setAdventureState(prev => prev.turnCount !== requestTurn ? prev : ({
      ...prev,
      hintUsedTurn: requestTurn,
      currentHint: {
        turn: requestTurn,
        text: notice,
        notice,
        connect,
        tryStep,
        starter,
        loading: false,
        supportType: 'strategy_hint',
      },
    }));
    addToast(t('adventure.hint_ready') || 'Strategy hint ready.', 'success');
  } catch (error) {
    warnLog('Adventure hint failed', error);
    setAdventureState(prev => {
      if (prev.turnCount !== requestTurn || prev.currentHint?.turn !== requestTurn) return prev;
      return { ...prev, currentHint: null };
    });
    addToast(t('adventure.hint_failed') || "Couldn't build a useful strategy hint. Please try again.", 'error');
  }
};

window.AlloModules = window.AlloModules || {};
window.AlloModules.AdventureHandlers = {
  executeStartAdventure,
  handleStartAdventure,
  handleResumeAdventure,
  handleAdventureTextSubmit,
  handleAdventureChoice,
  handleGuidingHand,
  handleAdventureHint,
  scheduleAdventureEstablishingShot,
  cancelAdventureEstablishingShot,
};
