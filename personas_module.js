(function(){"use strict";
if(window.AlloModules&&window.AlloModules.Personas){console.log("[CDN] Personas already loaded, skipping"); return;}
// personas_source.jsx — Historical character interview subsystem for AlloFlow
// Extracted from AlloFlowANTI.txt on 2026-04-24.
//
// 16 handlers: persona generation, single/panel chat, portraits, retries, reflection,
// rapport/XP tracking, quest completion, harmony scoring. Pairs with persona_ui_module.js
// (which handles presentational components like HarmonyMeter + CharacterColumn).
//
// Factory pattern: static utilities are destructured once; dynamic React state, setters,
// refs, and component-scoped helpers are read through `liveRef.current` on each handler
// call so they're always fresh. `window.callGemini` / `window.callGeminiImageEdit` are
// accessed directly to avoid the closure-capture-of-fallback problem when module load
// order differs from GeminiAPI module.
const createPersonas = (deps) => {
    const {
        liveRef,              // { current: { ...all React state + setters + component helpers } }
        warnLog, debugLog,
        cleanJson, safeJsonParse,
        fisherYatesShuffle,
        SafetyContentChecker,
    } = deps;

    // ─── generateCharacterPortrait ───────────────────────────────────
    const generateCharacterPortrait = async (visualDescription, artStyle) => {
        const { callImagen } = liveRef.current;
        try {
            const prompt = `Portrait of ${visualDescription}. Style: ${artStyle}. Neutral background, high quality, centered composition. STRICTLY NO TEXT.`;
            let imageUrl = await callImagen(prompt, 400, 0.9);
            if (!imageUrl) return null;
            try {
                const rawBase64 = imageUrl.split(',')[1];
                const refinePrompt = `
                  Refine this portrait to strictly match the description: "${visualDescription}".
                  Directives:
                  1. Fix any anachronisms (e.g., ensure clothing buttons, collars, and hairstyles match the era).
                  2. Ensure the art style looks authentic to: ${artStyle}.
                  3. Remove any text, watermarks, or blurry artifacts.
                  4. Keep the composition centered.
                `;
                const refinedUrl = await window.callGeminiImageEdit(refinePrompt, rawBase64, 400, 0.9);
                if (refinedUrl) return refinedUrl;
            } catch (refineErr) {
                warnLog("Portrait refinement failed, using original.", refineErr);
            }
            return imageUrl;
        } catch (e) {
            if (e.message && (e.message.includes("Safety") || e.message.includes("Block"))) {
                warnLog("Character Portrait blocked by safety filters. Falling back to placeholder icon.");
                return null;
            }
            warnLog("Character Portrait Generation Failed:", e);
            return null;
        }
    };

    // ─── resetPersonaInterviewState ──────────────────────────────────
    const resetPersonaInterviewState = () => {
        const {
            setPersonaState, setPersonaInput, setPersonaReflectionInput,
            setReflectionFeedback, setIsPersonaDefining, setIsGradingReflection,
            setIsGeneratingReflectionPrompt, setPanelTtsPending, setShowPersonaHints,
            setPersonaTurnHintsViewed, setIsPersonaReflectionOpen,
            lastReadPersonaIndexRef, personaDefinitionCache,
            setPlayingContentId, setPlaybackState,
        } = liveRef.current;
        setPersonaState({
            mode: 'single',
            options: [],
            selectedCharacter: null,
            selectedCharacters: [],
            chatHistory: [],
            isLoading: false,
            avatarUrl: null,
            isImageLoading: false,
            avatarGenerationFailed: false,
            suggestions: [],
            panelSuggestions: [],
            topicSparkCount: 0,
            showReflection: false,
            reflectionText: '',
            reflectionSubmitted: false,
            harmonyScore: 10,
            earnedBadges: []
        });
        setPersonaInput('');
        setPersonaReflectionInput('');
        setReflectionFeedback(null);
        setIsPersonaDefining(false);
        setIsGradingReflection(false);
        setIsGeneratingReflectionPrompt(false);
        setPanelTtsPending([]);
        setShowPersonaHints(false);
        setPersonaTurnHintsViewed(false);
        setIsPersonaReflectionOpen(false);
        if (lastReadPersonaIndexRef) lastReadPersonaIndexRef.current = -1;
        if (personaDefinitionCache && personaDefinitionCache.current && typeof personaDefinitionCache.current.clear === 'function') {
            personaDefinitionCache.current.clear();
        }
        setPlayingContentId(null);
        setPlaybackState({ sentences: [], currentIdx: -1 });
    };

    // ─── handleGeneratePersonas ──────────────────────────────────────
    const handleGeneratePersonas = async () => {
        const {
            history, inputText, sourceTopic, gradeLevel, personaCustomInstructions,
            generatedContent, leveledTextLanguage,
            setIsGeneratingPersona, setGeneratedContent, setHistory, setPersonaState,
            addToast, t,
        } = liveRef.current;
        const latestAnalysis = history.slice().reverse().find(h => h && h.type === 'analysis');
        const sourceText = (latestAnalysis && latestAnalysis.data && latestAnalysis.data.originalText)
            ? latestAnalysis.data.originalText
            : inputText;
        const topic = sourceTopic || "the current lesson topic";
        if (!sourceText.trim() && !sourceTopic.trim()) return;
        setIsGeneratingPersona(true);
        setGeneratedContent(null);
        resetPersonaInterviewState();
        try {
            const customInstructionBlock = personaCustomInstructions
                ? `IMPORTANT CUSTOM INSTRUCTIONS: ${personaCustomInstructions}\n(Prioritize these instructions when selecting figures).`
                : "";
            let languageInstruction = "Language: English.";
            if (leveledTextLanguage !== 'English') {
                languageInstruction = `Language: ${leveledTextLanguage}.
                CRITICAL:
                1. The "greeting", "role", and "context" fields MUST be written in ${leveledTextLanguage}.
                2. The "name" should remain in its original historical form (e.g. don't translate 'George Washington' to 'Jorge', but do translate 'The Unknown Soldier').
                3. The "suggestedQuestions" and "quests" text MUST be in ${leveledTextLanguage}.`;
            }
            const prompt = `
              Analyze the following text about "${topic}".
              Source Text:
              "${sourceText.substring(0, 3000)}...",
              ${customInstructionBlock}
              ${languageInstruction}
              Task: Identify 6 specific historical figures, experts, or fictional archetypes (e.g., 'A Union Soldier', 'Marie Curie', 'A Red Blood Cell') relevant to this content that a ${gradeLevel} student could interview to learn more.
              For each identified figure, perform the following verification using Google Search:
              1. Confirm their exact historical era (Year).
              2. Find a detailed physical description (hair style/color, facial hair, specific clothing of that era, notable accessories, posture).
              Assign an Art Style based on their era:
              - Pre-1840s: "Oil painting, museum quality, cracked varnish texture, classical lighting"
              - 1840s-1900: "Vintage Daguerreotype, sepia tone, early photography style, vignette, scratches"
              - 1900s-1950s: "Black and white film photograph, grainy texture, high contrast, silver gelatin print"
              - 1950s-Present: "Color photograph, journalistic style, 35mm film grain, Kodachrome style"
              - Ancient/Mythological/Fictional: "Classic oil painting, museum quality, dramatic lighting",
              For each character, generate:
              1. Basic Profile (Name, Role, Year, Context).
              2. Verified Visual Description & Art Style.
              3. A Greeting.
              4. Three "Hidden Objectives" (Secrets) for the student to uncover via conversation.
              5. Three "Suggested Questions" the student might ask to start the conversation.
              VOICE SELECTION:
              Assign a voice from this list that best matches the character's likely tone, gender, and age:
              [
               "Fenrir" (Deep/Authoritative Male),
               "Kore" (Soft/Calm Female),
               "Leda" (Strong/Direct Female),
               "Orus" (Standard Male),
               "Charon" (Gravelly/Older Male),
               "Zephyr" (Light/Younger Male),
               "Aoede" (Standard Female)
              ]
              NATIONALITY & ACCENT (CRITICAL FOR TTS):
              For each character, determine their EXACT nationality and native language. The TTS system uses this for accent. Be specific:
              - Austrian/German characters (e.g., Freud, Einstein, Mozart): "German accent, Viennese dialect"
              - British characters (e.g., Churchill, Darwin, Shakespeare): "British accent, Received Pronunciation" or "British accent, Cockney" etc.
              - French characters (e.g., Napoleon, Marie Curie): "French accent"
              - Italian characters (e.g., da Vinci, Galileo): "Italian accent"
              - Russian characters (e.g., Tolstoy, Catherine the Great): "Russian accent"
              - Chinese characters (e.g., Confucius, Sun Tzu): "Chinese accent, Mandarin"
              - Japanese characters (e.g., Hokusai, Emperor Meiji): "Japanese accent"
              - Indian characters (e.g., Gandhi, Tagore): "Indian accent"
              - American characters: specify region — "Southern American", "New England", "Midwestern", "New York" etc.
              - Ancient Greek/Roman: "Greek accent" or "Italian accent" (closest modern equivalent)
              Include the nationality field in the JSON.

              VOICE PROFILE:
              For each character, write a "voiceProfile" string describing EXACTLY how they should sound aloud. This MUST include:
              1. Their specific accent based on nationality (e.g., "thick Viennese German accent" not just "European accent")
              2. Speaking pace (measured, rapid, deliberate)
              3. Emotional tone (warm, stern, passionate, contemplative)
              4. Speech mannerisms (uses pauses, speaks in metaphors, formal diction, etc.)
              Example for Freud: "Speaks with a thick Viennese German accent, measured and deliberate pace, contemplative and analytical tone, frequently pauses to consider before speaking, uses medical terminology naturally, occasionally lapses into German phrases."
              Example for MLK Jr: "Speaks with a Southern American Baptist preacher's cadence, powerful and rhythmic delivery, builds from quiet reflection to passionate crescendo, uses biblical allusions and repetition for emphasis."
              Return ONLY a JSON array of objects with this exact structure:
              [
                  {
                      "name": "Name",
                      "role": "Short Description",
                      "year": "Relevant Year or Era",
                      "nationality": "Country/region of origin (e.g., Austrian, British, American-Southern)",
                      "context": "Why they are relevant",
                      "visualDescription": "A highly detailed physical description for an image generator (e.g., 'Oil painting of [Name], [details], neutral background').",
                      "artStyle": "The specific art style string selected based on era",
                      "greeting": "A short, engaging starting message from this character to the student.",
                      "voice": "SelectedVoiceName",
                      "voiceProfile": "Detailed description of how this character sounds: accent, pace, tone, mannerisms",
                      "initialRapport": 10,
                      "quests": [
                          { "id": "q1", "text": "Objective text...", "difficulty": 20, "isCompleted": false },
                          { "id": "q2", "text": "Objective text...", "difficulty": 50, "isCompleted": false },
                          { "id": "q3", "text": "Objective text...", "difficulty": 75, "isCompleted": false }
                      ],
                      "suggestedQuestions": ["Question 1", "Question 2", "Question 3"]
                  }
              ]
            `;
            const result = await window.callGemini(prompt, false, true);
            let textToParse = "";
            if (typeof result === 'object' && result !== null && result.text) {
                textToParse = result.text;
            } else {
                textToParse = String(result || "");
            }
            let parsedOptions = [];
            if (!textToParse.includes('[') && !textToParse.includes('{')) {
                warnLog("Persona Gen: No JSON found in response.");
                addToast(t('toasts.character_data_not_found'), "warning");
                return;
            }
            try {
                parsedOptions = JSON.parse(cleanJson(textToParse));
            } catch (e) {
                warnLog("Standard parse failed. Attempting robust parse...");
                parsedOptions = safeJsonParse(textToParse);
            }
            if (Array.isArray(parsedOptions) && parsedOptions.length > 0) {
                const isUpdatingExisting = generatedContent && generatedContent.type === 'persona';
                const newItem = {
                    id: isUpdatingExisting ? generatedContent.id : Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    type: 'persona',
                    title: "Interview Mode Options",
                    data: parsedOptions,
                    meta: "Interview Candidates",
                    timestamp: new Date(),
                    config: {}
                };
                setPersonaState(prev => ({ ...prev, options: parsedOptions }));
                if (isUpdatingExisting) {
                    setHistory(prev => prev.map(item => item.id === generatedContent.id ? newItem : item));
                    addToast(t('toasts.candidates_updated'), "success");
                } else {
                    setHistory(prev => [...prev, newItem]);
                    addToast(t('persona.candidates_found'), "success");
                }
                setGeneratedContent({ type: 'persona', data: parsedOptions, id: newItem.id });
                return;
            } else {
                warnLog("Persona Gen: Parsed data was not a valid array.");
                addToast(t('toasts.ai_format_error'), "error");
            }
        } catch (err) {
            warnLog("Persona Generation Error:", err);
            addToast(t('toasts.character_generate_failed'), "error");
        } finally {
            setIsGeneratingPersona(false);
        }
    };

    // ─── updatePersonaReaction ────────────────────────────────────────
    const updatePersonaReaction = async (visualReaction) => {
        const { personaState, setPersonaState, generatedContent, setGeneratedContent, setHistory } = liveRef.current;
        if (!personaState.avatarUrl || !personaState.selectedCharacter) return;
        setPersonaState(prev => ({ ...prev, isImageLoading: true }));
        try {
            const currentBase64 = personaState.avatarUrl.split(',')[1];
            const characterDesc = personaState.selectedCharacter.visualDescription || "historical portrait";
            const editPrompt = `
              Edit this character portrait to show them: ${visualReaction}.
              Guidelines:
              1. KEEP IDENTITY: Maintain the exact same character features, clothing style, and historical era (${characterDesc}).
              2. ALLOW ACTION: You may change the character's pose, hand positions, or head angle to match the description (e.g. if pointing or holding an object).
              3. OBJECTS: If an object is mentioned (e.g. map, book), render it realistically in their hands or nearby.
              4. NEGATIVE CONSTRAINTS: STRICTLY NO TEXT. No letters, no words, no speech bubbles, no watermarks. The image must be purely visual.
            `;
            const newImageUrl = await window.callGeminiImageEdit(editPrompt, currentBase64, 400, 0.85);
            if (newImageUrl) {
                setPersonaState(prev => ({
                    ...prev,
                    avatarUrl: newImageUrl,
                    isImageLoading: false
                }));
                if (generatedContent && generatedContent.type === 'persona') {
                    const newData = generatedContent?.data.map(p =>
                        p.name === personaState.selectedCharacter.name ? { ...p, avatarUrl: newImageUrl } : p
                    );
                    const updatedContent = { ...generatedContent, data: newData };
                    setGeneratedContent(updatedContent);
                    setHistory(prev => prev.map(item => item.id === generatedContent.id ? updatedContent : item));
                }
            } else {
                setPersonaState(prev => ({ ...prev, isImageLoading: false }));
            }
        } catch (e) {
            warnLog("Persona reaction update failed", e);
            setPersonaState(prev => ({ ...prev, isImageLoading: false }));
        }
    };

    // ─── handleRetryPortraitGeneration ────────────────────────────────
    const handleRetryPortraitGeneration = async (character, charIndex = null) => {
        const { personaState, setPersonaState, generatedContent, setGeneratedContent, setHistory, addToast, t } = liveRef.current;
        try {
            if (!character) {
                warnLog("handleRetryPortraitGeneration called with no character");
                return;
            }
            debugLog("🖼️ Starting portrait regeneration flow for:", character.name);
            let effectiveCharIndex = charIndex;
            const isPanelMode = personaState.mode === 'panel' && personaState.selectedCharacters?.length > 0;
            if (isPanelMode && effectiveCharIndex === null) {
                effectiveCharIndex = personaState.selectedCharacters.findIndex(c => c.name === character.name);
                if (effectiveCharIndex === -1) effectiveCharIndex = null;
            }
            if (isPanelMode && effectiveCharIndex !== null) {
                setPersonaState(prev => ({
                    ...prev,
                    selectedCharacters: prev.selectedCharacters.map((c, i) =>
                        i === effectiveCharIndex ? { ...c, isImageLoading: true, isUpdating: true } : c
                    )
                }));
            } else {
                setPersonaState(prev => ({
                    ...prev,
                    isImageLoading: true,
                    avatarGenerationFailed: false
                }));
            }
            const description = character.visualDescription || `Portrait of ${character.name}`;
            const style = character.artStyle || "Oil painting, museum quality";
            let imageUrl = null;
            let attempts = 0;
            const maxAttempts = 5;
            const getPromptForAttempt = (attemptNum) => {
                const name = character.name || 'Unknown';
                const role = character.role || 'person';
                const era = character.era || character.timePeriod || '';
                const visualDesc = character.visualDescription || '';
                switch (attemptNum) {
                    case 1: return description;
                    case 2: return `Portrait of ${name}, a notable ${role}. Dignified pose, neutral background.`;
                    case 3: return `Professional portrait of ${name}. Academic or scholarly appearance. High quality.`;
                    case 4:
                        warnLog(`Attempt ${attemptNum}: Trying role-based prompt without specific name...`);
                        const eraDesc = era ? `from the ${era}` : 'historical';
                        return `Portrait of a distinguished ${role} ${eraDesc}. Intelligent, thoughtful expression. Classical painting style.`;
                    case 5:
                    default:
                        warnLog(`Attempt ${attemptNum}: Final fallback - fully anonymized description...`);
                        const hasBeard = visualDesc.toLowerCase().includes('beard') || name.toLowerCase().includes('freud');
                        const isElderly = visualDesc.toLowerCase().includes('elderly') || visualDesc.toLowerCase().includes('old');
                        const gender = visualDesc.toLowerCase().includes('woman') ? 'woman' : 'man';
                        let anonymousDesc = `Portrait of a distinguished ${isElderly ? 'elderly ' : ''}${gender}`;
                        if (hasBeard && gender === 'man') anonymousDesc += ' with a neatly trimmed beard';
                        anonymousDesc += `. ${role ? 'Scholarly, intellectual appearance.' : ''} Classical painting style, museum quality.`;
                        return anonymousDesc;
                }
            };
            while (attempts < maxAttempts && !imageUrl) {
                attempts++;
                try {
                    const prompt = getPromptForAttempt(attempts);
                    debugLog(`🖼️ Portrait Generation Attempt ${attempts}/${maxAttempts}...`);
                    imageUrl = await generateCharacterPortrait(prompt, style);
                    if (!imageUrl) throw new Error("API returned null image URL");
                } catch (err) {
                    warnLog(`Portrait attempt ${attempts} failed:`, err);
                }
            }
            if (imageUrl) {
                if (effectiveCharIndex !== null) {
                    setPersonaState(prev => ({
                        ...prev,
                        selectedCharacters: prev.selectedCharacters.map((c, i) =>
                            i === effectiveCharIndex ? { ...c, avatarUrl: imageUrl, isImageLoading: false, isUpdating: false } : c
                        )
                    }));
                } else {
                    setPersonaState(prev => ({
                        ...prev,
                        avatarUrl: imageUrl,
                        isImageLoading: false,
                        avatarGenerationFailed: false
                    }));
                }
                if (generatedContent?.type === 'persona') {
                    const newData = generatedContent?.data.map(p =>
                        p.name === character.name ? { ...p, avatarUrl: imageUrl } : p
                    );
                    const updatedContent = { ...generatedContent, data: newData };
                    setGeneratedContent(updatedContent);
                    setHistory(prev => prev.map(item =>
                        item.id === generatedContent.id ? updatedContent : item
                    ));
                }
                addToast(t('toasts.portrait_generated'), "success");
            } else {
                throw new Error(`Failed to generate image after ${maxAttempts} attempts.`);
            }
        } catch (error) {
            warnLog("Portrait regeneration error (Final):", error);
            setPersonaState(prev => ({
                ...prev,
                isImageLoading: false,
                selectedCharacters: prev.selectedCharacters ? prev.selectedCharacters.map(c => ({
                    ...c,
                    isImageLoading: false,
                    isUpdating: false,
                    avatarGenerationFailed: (c.name === character.name)
                })) : [],
                avatarGenerationFailed: true
            }));
            addToast("Failed to regenerate portrait. Please try again.", "error");
        }
    };

    // ─── updatePanelCharacterReaction ─────────────────────────────────
    const updatePanelCharacterReaction = async (charIndex, visualReaction) => {
        const { personaState, setPersonaState } = liveRef.current;
        const targetChar = personaState.selectedCharacters[charIndex];
        if (!targetChar || !targetChar.avatarUrl) return;
        setPersonaState(prev => {
            const newChars = [...prev.selectedCharacters];
            newChars[charIndex] = { ...newChars[charIndex], isUpdating: true };
            return { ...prev, selectedCharacters: newChars };
        });
        try {
            const currentBase64 = targetChar.avatarUrl.split(',')[1];
            const characterDesc = targetChar.visualDescription || "historical portrait";
            const editPrompt = `
              Edit this character portrait to show them: ${visualReaction}.
              Guidelines:
              1. KEEP IDENTITY: Maintain the exact same character features, clothing style, and historical era (${characterDesc}).
              2. ALLOW ACTION: Change the pose, facial expression, or hand gestures to match: "${visualReaction}".
              3. NEGATIVE CONSTRAINTS: STRICTLY NO TEXT. No speech bubbles.
            `;
            const newImageUrl = await window.callGeminiImageEdit(editPrompt, currentBase64, 400, 0.85);
            if (newImageUrl) {
                setPersonaState(prev => {
                    const newChars = [...prev.selectedCharacters];
                    newChars[charIndex] = { ...newChars[charIndex], avatarUrl: newImageUrl, isUpdating: false };
                    return { ...prev, selectedCharacters: newChars };
                });
            } else {
                setPersonaState(prev => {
                    const newChars = [...prev.selectedCharacters];
                    newChars[charIndex] = { ...newChars[charIndex], isUpdating: false };
                    return { ...prev, selectedCharacters: newChars };
                });
            }
        } catch (e) {
            warnLog(`Panel char ${charIndex} update failed`, e);
            setPersonaState(prev => {
                const newChars = [...prev.selectedCharacters];
                newChars[charIndex] = { ...newChars[charIndex], isUpdating: false };
                return { ...prev, selectedCharacters: newChars };
            });
        }
    };

    // ─── generatePersonaFollowUps ─────────────────────────────────────
    const generatePersonaFollowUps = async (history, character, count = 2) => {
        const { setPersonaState } = liveRef.current;
        try {
            const historyStr = history.slice(-4).map(m => `${m.role === 'user' ? 'Student' : character.name}: ${m.text}`).join('\n');
            const prompt = `
              Based on this conversation with ${character.name} (${character.role}, ${character.year}), suggest ${count} distinct, relevant responses or questions the student could say next to deepen the conversation.
              Conversation:
              ${historyStr}
              Return ONLY a JSON array of strings: ${JSON.stringify(Array.from({length: count}, (_, i) => `Option ${i+1}`))}
            `;
            const result = await window.callGemini(prompt, true);
            const suggestions = JSON.parse(cleanJson(result));
            if (Array.isArray(suggestions)) {
                setPersonaState(prev => ({ ...prev, suggestions: suggestions }));
            }
        } catch (e) {
            warnLog("Follow-up generation failed", e);
        }
    };

    // ─── generatePanelFollowUps ───────────────────────────────────────
    const generatePanelFollowUps = async (history, charA, charB) => {
        const { setPersonaState, resilientJsonParse } = liveRef.current;
        if (!charA || !charB) return;
        try {
            const historyStr = history.slice(-4).map(m =>
                `${m.role === 'user' ? 'Student Moderator' : (m.speakerName || 'Character')}: ${m.text}`
            ).join('\n');
            const prompt = `
              You are helping a student moderate a debate between two historical figures:
              - ${charA.name} (${charA.role})
              - ${charB.name} (${charB.role})
              Recent Debate Exchange:
              ${historyStr}
              Generate exactly 6 student moderator responses with different QUALITY TIERS:
              NEUTRAL (2 responses): Clarifying questions or safe redirections that neither significantly help nor harm the discussion
              GOOD (2 responses): Responses that build rapport, find common ground, or generate productive insight
              POOR (2 responses): Responses that could offend one or both figures, miss the point, or derail the conversation
              Make each response a complete sentence or question the student could say.
              Mix up the order so they are NOT grouped by quality.
              Return ONLY valid JSON in exactly this format:
              [
                {"text": "...", "tier": "neutral"},
                {"text": "...", "tier": "good"},
                {"text": "...", "tier": "poor"},
                {"text": "...", "tier": "neutral"},
                {"text": "...", "tier": "good"},
                {"text": "...", "tier": "poor"}
              ]
            `;
            const result = await window.callGemini(prompt, true);
            const parsed = await resilientJsonParse(result);
            if (Array.isArray(parsed) && parsed.length >= 6) {
                const shuffled = fisherYatesShuffle(parsed);
                setPersonaState(prev => ({ ...prev, panelSuggestions: shuffled.slice(0, 6) }));
            }
        } catch (e) {
            warnLog("Panel follow-up generation failed", e);
        }
    };

    // ─── handleTogglePanelSelection ───────────────────────────────────
    const handleTogglePanelSelection = (character) => {
        const { setPersonaState, addToast, t } = liveRef.current;
        setPersonaState(prev => {
            const isSelected = prev.selectedCharacters.some(c => c.name === character.name);
            let newSelection;
            if (isSelected) {
                newSelection = prev.selectedCharacters.filter(c => c.name !== character.name);
            } else {
                if (prev.selectedCharacters.length >= 2) {
                    addToast(t('toasts.panel_full'), "warning");
                    return prev;
                }
                newSelection = [...prev.selectedCharacters, character];
            }
            return { ...prev, selectedCharacters: newSelection };
        });
    };

    // ─── handleStartPanelChat ─────────────────────────────────────────
    const handleStartPanelChat = async () => {
        const {
            personaState, setPersonaState,
            setIsPersonaChatOpen, setIsProcessing,
            isPersonaFreeResponse,
            addToast, t,
        } = liveRef.current;
        if (personaState.selectedCharacters.length !== 2) return;
        const charA = personaState.selectedCharacters[0];
        const charB = personaState.selectedCharacters[1];
        const ensureImage = async (char) => {
            if (char.avatarUrl) return char;
            const desc = char.visualDescription || `Portrait of ${char.name}`;
            const style = char.artStyle || "Oil painting";
            let url = await generateCharacterPortrait(desc, style);
            if (!url) {
                warnLog(`Retrying portrait for ${char.name} with simplified prompt...`);
                const simpleDesc = `Historical portrait of ${char.name} (${char.role}).`;
                url = await generateCharacterPortrait(simpleDesc, style);
            }
            return { ...char, avatarUrl: url };
        };
        setIsProcessing(true);
        addToast(t('toasts.preparing_panel'), "info");
        try {
            const [updatedA, updatedB] = await Promise.all([
                ensureImage(charA),
                ensureImage(charB)
            ]);
            const initialHistory = [{
                role: 'model',
                text: `Welcome. I am ${updatedA.name}. I am joined today by ${updatedB.name}. We are ready for your questions.`,
                speakerName: updatedA.name
            }];
            setPersonaState(prev => ({
                ...prev,
                selectedCharacters: [updatedA, updatedB],
                selectedCharacter: updatedA,
                avatarUrl: updatedA.avatarUrl,
                mode: 'panel',
                chatHistory: initialHistory,
                suggestions: [],
                isLoading: false
            }));
            setIsPersonaChatOpen(true);
            if (!isPersonaFreeResponse) {
                generatePanelFollowUps(initialHistory, updatedA, updatedB);
            }
        } catch (e) {
            warnLog("Panel start failed", e);
            addToast(t('toasts.panel_start_failed'), "error");
        } finally {
            setIsProcessing(false);
        }
    };

    // ─── handleClosePersonaChat ───────────────────────────────────────
    const handleClosePersonaChat = () => {
        const {
            personaState, setPersonaState,
            generatedContent, setGeneratedContent, setHistory,
            setIsPersonaChatOpen,
        } = liveRef.current;
        if (generatedContent && generatedContent.type === 'persona' && personaState.chatHistory.length > 1) {
            const isPanelMode = personaState.selectedCharacters?.length === 2;
            if (isPanelMode) {
                const char1Name = personaState.selectedCharacters[0]?.name;
                const char2Name = personaState.selectedCharacters[1]?.name;
                const newData = generatedContent?.data.map(p => {
                    if (p.name === char1Name || p.name === char2Name) {
                        return {
                            ...p,
                            chatHistory: personaState.chatHistory,
                            savedDialogue: personaState.chatHistory,
                            reflectionText: personaState.reflectionText || p.reflectionText || '',
                            lastInterviewDate: new Date().toISOString()
                        };
                    }
                    return p;
                });
                const updatedContent = { ...generatedContent, data: newData };
                setGeneratedContent(updatedContent);
                setHistory(prev => prev.map(item => item.id === generatedContent.id ? updatedContent : item));
            } else if (personaState.selectedCharacter) {
                const newData = generatedContent?.data.map(p =>
                    p.name === personaState.selectedCharacter.name
                        ? {
                            ...p,
                            chatHistory: personaState.chatHistory,
                            savedDialogue: personaState.chatHistory,
                            rapport: personaState.selectedCharacter.rapport ?? p.rapport ?? p.initialRapport,
                            accumulatedXP: personaState.selectedCharacter.accumulatedXP || 0,
                            reflectionText: personaState.reflectionText || p.reflectionText || '',
                            lastInterviewDate: new Date().toISOString()
                          }
                        : p
                );
                const updatedContent = { ...generatedContent, data: newData };
                setGeneratedContent(updatedContent);
                setHistory(prev => prev.map(item => item.id === generatedContent.id ? updatedContent : item));
            }
        }
        setPersonaState(prev => ({
            ...prev,
            showReflection: false,
            reflectionText: '',
            reflectionSubmitted: false
        }));
        setIsPersonaChatOpen(false);
    };

    // ─── handleSelectPersona ──────────────────────────────────────────
    const handleSelectPersona = async (character) => {
        const {
            personaState, setPersonaState,
            generatedContent, setGeneratedContent, setHistory,
            setIsPersonaChatOpen,
            alloBotRef, t,
        } = liveRef.current;
        try {
            if (alloBotRef && alloBotRef.current) {
                alloBotRef.current.speak(t('bot_events.feedback_persona_start', { name: character.name }), 'happy');
            }
            const existingImage = character.avatarUrl;
            const existingChat = character.chatHistory;
            const description = character.visualDescription || `Portrait of ${character.name}`;
            const style = character.artStyle || "Oil painting, museum quality";
            const initialHistory = existingChat || [{
                role: 'model',
                text: character.greeting || `Greetings. I am ${character.name}. I am ready to discuss my time in ${character.year}.`
            }];
            const preservedOptions = personaState.options;
            const preservedMode = personaState.mode;
            const preservedSelectedCharacters = personaState.selectedCharacters;
            resetPersonaInterviewState();
            setPersonaState(prev => ({
                ...prev,
                mode: preservedMode,
                options: preservedOptions,
                selectedCharacters: preservedSelectedCharacters,
                selectedCharacter: character,
                chatHistory: initialHistory,
                suggestions: character.suggestedQuestions || [],
                isImageLoading: !existingImage,
                avatarUrl: existingImage || null,
                topicSparkCount: 0
            }));
            setIsPersonaChatOpen(true);
            if (!character.suggestedQuestions || character.suggestedQuestions.length === 0) {
                generatePersonaFollowUps(initialHistory, character, 3);
            }
            if (existingImage) return;
            const imageUrl = await generateCharacterPortrait(description, style);
            if (imageUrl) {
                setPersonaState(prev => ({
                    ...prev,
                    avatarUrl: imageUrl,
                    isImageLoading: false
                }));
                if (generatedContent && generatedContent.type === 'persona') {
                    const newData = generatedContent?.data.map(p =>
                        p.name === character.name ? { ...p, avatarUrl: imageUrl } : p
                    );
                    const updatedContent = { ...generatedContent, data: newData };
                    setGeneratedContent(updatedContent);
                    setHistory(prev => prev.map(item => item.id === generatedContent.id ? updatedContent : item));
                }
            } else {
                setPersonaState(prev => ({ ...prev, isImageLoading: false }));
            }
        } catch (e) { warnLog("Unhandled error in handleSelectPersona:", e); }
    };

    // ─── handlePersonaTopicSpark ──────────────────────────────────────
    const handlePersonaTopicSpark = async () => {
        const {
            personaState, setPersonaState, setPersonaInput,
            addToast, t,
        } = liveRef.current;
        if (!personaState.selectedCharacter) return;
        if ((personaState.topicSparkCount || 0) >= 2) {
            addToast(t('persona.spark_limit_reached'), "info");
            return;
        }
        setPersonaState(prev => ({ ...prev, isLoading: true }));
        try {
            const historyStr = personaState.chatHistory.map(m => `${m.role === 'user' ? 'Student' : personaState.selectedCharacter.name}: ${m.text}`).join('\n');
            const prompt = `
              You are roleplaying as ${personaState.selectedCharacter.name} (${personaState.selectedCharacter.role}, ${personaState.selectedCharacter.year}).
              Conversation Context:
              ${historyStr}
              Task: Suggest a deep, specific question a student should ask you right now based on our conversation so far.
              The question should provoke a detailed historical insight or personal reflection from your character.
              Return ONLY the raw text of the question.
            `;
            const result = await window.callGemini(prompt);
            setPersonaInput(result.trim().replace(/^"|"$/g, ''));
            setPersonaState(prev => ({
                ...prev,
                topicSparkCount: (prev.topicSparkCount || 0) + 1
            }));
        } catch (e) {
            warnLog("Topic Spark Error", e);
            setPersonaInput(`What is the most important thing you want people to remember about you?`);
        } finally {
            setPersonaState(prev => ({ ...prev, isLoading: false }));
        }
    };

    // ─── handlePanelChatSubmit ────────────────────────────────────────
    const handlePanelChatSubmit = async (userText) => {
        const {
            personaState, setPersonaState, setPersonaInput,
            sourceTopic,
            generatedContent,
            isPersonaFreeResponse,
            addToast, t,
            handleScoreUpdate, playSound,
        } = liveRef.current;
        if (!userText.trim() || (personaState.selectedCharacters || []).length < 2) return;
        const charA = personaState.selectedCharacters[0];
        const charB = personaState.selectedCharacters[1];
        setPersonaInput('');
        setPersonaState(prev => ({
            ...prev,
            chatHistory: [...prev.chatHistory, { role: 'user', text: userText }],
            isLoading: true
        }));
        const historyContext = personaState.chatHistory.map(m =>
            `${m.role === 'user' ? 'Student' : (m.speakerName || 'Character')}: ${m.text}`
        ).join('\n');
        const prompt = `
          You are a Debate Moderator simulating a discussion between two historical figures.
          Character A: ${charA.name} (${charA.role}).
          - Current Rapport: ${charA.rapport || 30}/100.
          - Objectives: ${JSON.stringify(charA.quests || [])}
          Character B: ${charB.name} (${charB.role}).
          - Current Rapport: ${charB.rapport || 30}/100.
          - Objectives: ${JSON.stringify(charB.quests || [])}
          Topic: "${sourceTopic || "General Discussion"}",
          Conversation History:
          ${historyContext}
          Student Moderator says: "${userText}",
          TASK 1: EVALUATE IMPACT
          - Did the student please or offend Character A? (Rapport +/-)
          - Did the student please or offend Character B? (Rapport +/-)
          - Did the student help them find COMMON GROUND? (Harmony Score 0-100)
          - Did the student satisfy any specific Quest Objectives?
          TASK 2: GENERATE DIALOGUE
          - Generate 1-2 turns of dialogue where they respond to the student and each other.
          Return ONLY JSON:
          {
              "dialogue": [
                  { "speaker": "${charA.name}", "text": "...", "visualReaction": "nodding" },
                  { "speaker": "${charB.name}", "text": "...", "visualReaction": "frowning" }
              ],
              "updates": {
                  "charA": { "rapportChange": integer, "completedQuestId": "id_or_null" },
                  "charB": { "rapportChange": integer, "completedQuestId": "id_or_null" },
                  "harmony": { "scoreChange": integer, "reason": "Why harmony increased/decreased" }
              }
          }
        `;
        try {
            const resultRaw = await window.callGemini(prompt, true);
            const data = JSON.parse(cleanJson(resultRaw));
            let xpEarned = 0;
            const deltaA = data.updates?.charA?.rapportChange || 0;
            const deltaB = data.updates?.charB?.rapportChange || 0;
            const harmonyDelta = data.updates?.harmony?.scoreChange || 0;
            if (deltaA > 0) xpEarned += (deltaA * 2);
            if (deltaB > 0) xpEarned += (deltaB * 2);
            if (harmonyDelta > 0) xpEarned += (harmonyDelta * 5);
            if (xpEarned > 0) {
                handleScoreUpdate(xpEarned, "Panel Debate Insight", generatedContent?.id);
            }
            setPersonaState(prev => {
                const currentA = prev.selectedCharacters[0];
                const currentB = prev.selectedCharacters[1];
                const updates = data.updates || {};
                const xpA = (deltaA > 0 ? deltaA * 2 : 0) + (harmonyDelta > 0 ? Math.floor(harmonyDelta * 2.5) : 0);
                const xpB = (deltaB > 0 ? deltaB * 2 : 0) + (harmonyDelta > 0 ? Math.ceil(harmonyDelta * 2.5) : 0);
                const updateChar = (char, up, charXpReward) => {
                    if (!up) return { ...char, accumulatedXP: (char.accumulatedXP || 0) + (charXpReward || 0) };
                    return {
                        ...char,
                        rapport: Math.max(0, Math.min(100, (char.rapport || 10) + (up.rapportChange || 0))),
                        quests: char.quests ? char.quests.map(q => q.id === up.completedQuestId ? { ...q, isCompleted: true } : q) : [],
                        accumulatedXP: (char.accumulatedXP || 0) + (charXpReward || 0)
                    };
                };
                const newA = updateChar(currentA, updates.charA, xpA);
                const newB = updateChar(currentB, updates.charB, xpB);
                const currentHarmony = prev.harmonyScore ?? 10;
                const newHarmony = Math.max(0, Math.min(100, currentHarmony + (updates.harmony?.scoreChange || 0)));
                const newMessages = (data.dialogue || []).map(turn => ({
                    role: 'model',
                    text: turn.text,
                    speakerName: turn.speaker,
                    visualReaction: turn.visualReaction
                }));
                if (data.dialogue && Array.isArray(data.dialogue)) {
                    data.dialogue.forEach(turn => {
                        if (turn.visualReaction && turn.speaker) {
                            const charIndex = prev.selectedCharacters.findIndex(c => c.name === turn.speaker);
                            if (charIndex !== -1) {
                                updatePanelCharacterReaction(charIndex, turn.visualReaction);
                            }
                        }
                    });
                }
                const newBadges = [...(prev.earnedBadges || [])];
                if (newHarmony >= 50 && !newBadges.includes('harmonizer')) {
                    newBadges.push('harmonizer');
                    addToast(`🤝 ${t('persona.badges.harmonizer')}!`, "success");
                    playSound('correct');
                }
                return {
                    ...prev,
                    selectedCharacters: [newA, newB],
                    harmonyScore: newHarmony,
                    chatHistory: [...prev.chatHistory, ...newMessages],
                    isLoading: false,
                    earnedBadges: newBadges
                };
            });
            if (data.updates?.harmony?.scoreChange > 0) {
                addToast(`Synthesis! Harmony +${data.updates.harmony.scoreChange}`, "success");
                playSound('correct');
            }
            if (!isPersonaFreeResponse) {
                const updatedHistory = [...personaState.chatHistory, { role: 'user', text: userText }, ...(data.dialogue || []).map(turn => ({
                    role: 'model', text: turn.text, speakerName: turn.speaker
                }))];
                generatePanelFollowUps(updatedHistory, charA, charB);
            }
        } catch (e) {
            warnLog("Panel Error", e);
            setPersonaState(prev => ({ ...prev, isLoading: false }));
            addToast(t('toasts.debate_stalled'), "error");
        }
    };

    // ─── handlePersonaChatSubmit ──────────────────────────────────────
    const handlePersonaChatSubmit = async (overrideInput = null) => {
        const {
            personaState, setPersonaState, personaInput, setPersonaInput,
            generatedContent, setGeneratedContent, setHistory,
            apiKey, handleAiSafetyFlag,
            gradeLevel, leveledTextLanguage, selectedLanguages, currentUiLanguage,
            personaTurnHintsViewed, setPersonaTurnHintsViewed, showPersonaHintsRef,
            isPersonaFreeResponse,
            addToast, t,
            handleScoreUpdate, playSound,
        } = liveRef.current;
        const textToSend = overrideInput || personaInput;
        if (!textToSend.trim()) return;
        if (personaState.mode === 'panel' && personaState.selectedCharacters.length === 2) {
            handlePanelChatSubmit(textToSend);
            return;
        }
        if (!personaState.selectedCharacter) return;
        SafetyContentChecker.aiCheck(textToSend, 'persona', apiKey, handleAiSafetyFlag);
        const hintsWereViewed = personaTurnHintsViewed;
        setPersonaInput('');
        const historyContextForPrompt = [...personaState.chatHistory];
        setPersonaState(prev => ({
            ...prev,
            chatHistory: [...prev.chatHistory, { role: 'user', text: textToSend }],
            suggestions: [],
            isLoading: true
        }));
        try {
            const historyStr = historyContextForPrompt.map(m => `${m.role === 'user' ? 'Student' : personaState.selectedCharacter.name}: ${m.text}`).join('\n');
            const currentRapport = personaState.selectedCharacter.rapport !== undefined
                ? personaState.selectedCharacter.rapport
                : (personaState.selectedCharacter.initialRapport || 10);
            const activeQuests = (personaState.selectedCharacter.quests || []).filter(q => !q.isCompleted);
            let langInstruction = "Language: English.";
            let translationInstruction = "";
            let targetLang = leveledTextLanguage;
            if (targetLang === 'All Selected Languages') {
                targetLang = selectedLanguages.length > 0 ? selectedLanguages[0] : 'English';
            }
            if (targetLang !== 'English') {
                langInstruction = `Language: ${targetLang}.`;
                translationInstruction = `Provide the response in ${targetLang} first. Then, add a new line with "**English Translation:**" followed by the English translation.`;
            }
            const prompt = `
              You are roleplaying as ${personaState.selectedCharacter.name} (${personaState.selectedCharacter.role}, ${personaState.selectedCharacter.year}).
              Stay in character.
              --- SOCIAL MECHANICS ---
              Current Rapport (Trust): ${currentRapport}/100.
              BEHAVIOR RULES:
              - If Rapport is < 30 (Suspicious): Be evasive, short, and guarded. Do NOT reveal personal secrets.
              - If Rapport is 30-70 (Neutral): Be polite but formal. Answer factual questions, but deflect deep personal ones.
              - If Rapport is > 70 (Trusted): Be open, vulnerable, and detailed. Share your inner thoughts.
              --- QUEST OBJECTIVES ---
              The student is trying to uncover these facts:
              ${activeQuests.length > 0 ? activeQuests.map(q => `- Quest ID ${q.id}: ${q.text} (Requires ${q.difficulty} Rapport)`).join('\n') : "No active quests."}
              --- SETTINGS ---
              Target Audience: ${gradeLevel} students. Adapt vocabulary and complexity accordingly.
              ${langInstruction}
              EVALUATION TASK:
              1. Analyze the student's latest message.
                 - If they are polite, empathetic, or demonstrate knowledge of your era, INCREASE Rapport.
                 - If they are rude, pushy, or anachronistic (mentioning iPhones, etc.), DECREASE Rapport.
              2. Check if their question satisfies a Quest Objective.
                 - IF they asked the right question AND Rapport >= Difficulty -> MARK COMPLETE and answer fully.
                 - IF they asked the right question BUT Rapport < Difficulty -> MARK BLOCKED and give a hint (e.g., "I don't know you well enough to share that yet.").
              ${translationInstruction}
              Respond to the user in ${currentUiLanguage}.
              Conversation History:
              ${historyStr}
              User: ${textToSend}
              Return ONLY JSON:
              {
                  "response": "Your conversational response here (include translation if requested)",
                  "visualReaction": "A concise visual description of your current action. This can be: 1. A facial expression (e.g., 'furrowed brow'). 2. A gesture (e.g., 'pointing at the horizon', 'shrugging', 'bowing'). 3. An interaction with an object (e.g., 'holding a map', 'examining a quill'). Keep it simple and visual.",
                  "rapportChange": integer (e.g., +5, -10),
                  "completedQuestId": "q1" (or null if none),
                  "questBlockedReason": "string" (if they asked but rapport was too low)
              }
            `;
            const resultRaw = await window.callGemini(prompt, true);
            const resultParsed = JSON.parse(cleanJson(resultRaw));
            const responseText = resultParsed.response || resultRaw;
            const finalHistory = [...historyContextForPrompt, { role: 'user', text: textToSend }, { role: 'model', text: responseText }];
            const delta = parseInt(resultParsed.rapportChange) || 0;
            let actualReward = 0;
            if (delta > 0) {
                let baseXp = delta * 2;
                let multiplier = 1;
                let bonusLabel = "";
                if (isPersonaFreeResponse && !overrideInput) {
                    if (!hintsWereViewed) {
                        multiplier = 2;
                        bonusLabel = " (Hard Mode Bonus!)";
                    } else {
                        multiplier = 1.5;
                        bonusLabel = " (Typing Bonus)";
                    }
                }
                const xpReward = Math.round(baseXp * multiplier);
                const PERSONA_XP_CAP = 300;
                const currentAccumulated = personaState.selectedCharacter.accumulatedXP || 0;
                if (currentAccumulated < PERSONA_XP_CAP) {
                    actualReward = Math.min(xpReward, PERSONA_XP_CAP - currentAccumulated);
                }
                if (actualReward > 0) {
                    handleScoreUpdate(actualReward, "Rapport Building", generatedContent?.id);
                    addToast(`Rapport Increased (+${delta}) | +${actualReward} XP${bonusLabel}`, "success");
                    playSound('click');
                } else {
                    addToast(`Rapport Increased (+${delta}) | XP Cap Reached`, "info");
                }
            } else if (delta < 0) {
                addToast(`Rapport Decreased (${delta})`, "error");
            }
            setPersonaState(prev => {
                const delta = parseInt(resultParsed.rapportChange) || 0;
                const newRapport = Math.max(0, Math.min(100, currentRapport + delta));
                const updatedQuests = (prev.selectedCharacter.quests || []).map(q => {
                    if (resultParsed.completedQuestId === q.id) {
                        return { ...q, isCompleted: true };
                    }
                    return q;
                });
                const newBadges = [...(prev.earnedBadges || [])];
                if (delta >= 5 && !newBadges.includes('first_insight')) {
                    newBadges.push('first_insight');
                    addToast(`🎯 ${t('persona.badges.first_insight')}!`, "success");
                    playSound('correct');
                }
                if (newRapport >= 50 && !newBadges.includes('rapport_builder')) {
                    newBadges.push('rapport_builder');
                    addToast(`💡 ${t('persona.badges.rapport_builder')}!`, "success");
                    playSound('correct');
                }
                return {
                    ...prev,
                    chatHistory: finalHistory,
                    isLoading: false,
                    earnedBadges: newBadges,
                    selectedCharacter: {
                        ...prev.selectedCharacter,
                        rapport: newRapport,
                        quests: updatedQuests,
                        accumulatedXP: (prev.selectedCharacter.accumulatedXP || 0) + actualReward
                    }
                };
            });
            if (resultParsed.completedQuestId) {
                addToast(t('persona.toasts.secret_unlocked'), "success");
                playSound('correct');
                handleScoreUpdate(50, "Persona Secret Unlocked", generatedContent?.id);
            }
            if (resultParsed.questBlockedReason) {
                addToast(t('persona.toasts.trust_too_low'), "warning");
            }
            const suggestionCount = isPersonaFreeResponse ? 2 : 6;
            generatePersonaFollowUps(finalHistory, personaState.selectedCharacter, suggestionCount);
            if (resultParsed.visualReaction) {
                updatePersonaReaction(resultParsed.visualReaction);
            } else if (resultParsed.emotion) {
                updatePersonaReaction(resultParsed.emotion);
            }
            if (showPersonaHintsRef) setPersonaTurnHintsViewed(showPersonaHintsRef.current);
            if (generatedContent && generatedContent.type === 'persona') {
                const delta = parseInt(resultParsed.rapportChange) || 0;
                const newRapport = Math.max(0, Math.min(100, currentRapport + delta));
                const newData = generatedContent?.data.map(p => {
                    if (p.name === personaState.selectedCharacter.name) {
                        return {
                            ...p,
                            chatHistory: finalHistory,
                            rapport: newRapport,
                            quests: (p.quests || []).map(q => resultParsed.completedQuestId === q.id ? { ...q, isCompleted: true } : q),
                            accumulatedXP: (p.accumulatedXP || 0) + actualReward
                        };
                    }
                    return p;
                });
                const updatedContent = { ...generatedContent, data: newData };
                setGeneratedContent(updatedContent);
                setHistory(prev => prev.map(item => item.id === generatedContent.id ? updatedContent : item));
            }
        } catch (e) {
            warnLog("Persona Chat Error", e);
            addToast(t('toasts.figure_silent'), "error");
            setPersonaState(prev => ({ ...prev, isLoading: false }));
        }
    };

    // ─── handleSavePersonaChat ────────────────────────────────────────
    const handleSavePersonaChat = () => {
        const { personaState, setHistory, addToast, t } = liveRef.current;
        if (personaState.chatHistory.length === 0 || !personaState.selectedCharacter) return;
        const chatLog = personaState.chatHistory.map(m => `**${m.role === 'user' ? 'Student' : personaState.selectedCharacter.name}:**\n${m.text}`).join('\n\n---\n\n');
        const newItem = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            type: 'udl-advice',
            data: chatLog,
            meta: `Historical Interview (${personaState.selectedCharacter.year})`,
            title: `Interview: ${personaState.selectedCharacter.name}`,
            timestamp: new Date(),
            config: {}
        };
        setHistory(prev => [...prev, newItem]);
        addToast(t('toasts.transcript_saved'), "success");
    };

    return {
        resetPersonaInterviewState,
        generateCharacterPortrait,
        handleGeneratePersonas,
        updatePersonaReaction,
        handleRetryPortraitGeneration,
        updatePanelCharacterReaction,
        generatePersonaFollowUps,
        generatePanelFollowUps,
        handleTogglePanelSelection,
        handleStartPanelChat,
        handleClosePersonaChat,
        handleSelectPersona,
        handlePersonaTopicSpark,
        handlePanelChatSubmit,
        handlePersonaChatSubmit,
        handleSavePersonaChat,
    };
};

// Registration shim — attach factory + trigger monolith's _upgradePersonas().
if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.createPersonas = createPersonas;
    window.AlloModules.Personas = true;
    console.log('[Personas] Factory registered');
    if (typeof window._upgradePersonas === 'function') {
        window._upgradePersonas();
    }
}
})();
