// content_engine_source.jsx — Content Generation + Text Revision handlers
// Pure function extraction — no hooks. Uses factory + window state bag pattern.

var warnLog = window.warnLog || function() { console.warn.apply(console, arguments); };
var cleanJson = window.__alloUtils && window.__alloUtils.cleanJson;
if (!cleanJson) cleanJson = function(t) { try { return JSON.parse(t); } catch(e) { return null; } };
var processGrounding = window.__alloUtils && window.__alloUtils.processGrounding;
if (!processGrounding) processGrounding = function(t) { return t; };

var createContentEngine = function(deps) {
  var callGemini = deps.callGemini;
  var addToast = deps.addToast;
  var t = deps.t;
  var getBilingualPromptInstruction = deps.getBilingualPromptInstruction || function() { return ''; };
  var flyToElement = deps.flyToElement || function() {};
  var callTTS = deps.callTTS || function() { return Promise.resolve(); };
  var _s = function() { return window.__contentEngineState || {}; };
  var _bindState;
  var inputText, gradeLevel, sourceTopic, generatedContent,
      leveledTextLanguage, selectedLanguages, studentInterests, selectedConcepts,
      conceptInput, interestInput, languageInput, activeView, showSourceGen,
      generationStep, isGeneratingSource, selectionMenu, phonicsData,
      sourceCustomInstructions, sourceLength, sourceLevel, sourceTone,
      sourceVocabulary, resourceCount, targetStandards, dokLevel,
      selectedFont, includeSourceCitations,
      interactionMode, revisionData, standardsPromptString,
      setActiveView, setConceptInput, setError, setGeneratedContent,
      setGenerationStep, setInputText, setInterestInput, setIsGeneratingSource,
      setLanguageInput, setLeveledTextLanguage, setSelectedConcepts,
      setSelectedLanguages, setShowSourceGen, setStudentInterests,
      setCustomReviseInstruction, setDefinitionData, setIsCustomReviseOpen,
      setPhonicsData, setRevisionData, setSelectionMenu,
      setPlayingContentId, setPlaybackState;
  var alloBotRef = { current: null };
  var isBotVisible = false;
  var isPlayingRef = { current: false };
  var isSystemAudioActiveRef = { current: false };
  var currentAudioRef = { current: null };
  _bindState = function() {
    var s = _s();
    inputText = s.inputText; gradeLevel = s.gradeLevel;
    sourceTopic = s.sourceTopic; generatedContent = s.generatedContent;
    leveledTextLanguage = s.leveledTextLanguage;
    selectedLanguages = s.selectedLanguages; studentInterests = s.studentInterests;
    selectedConcepts = s.selectedConcepts; conceptInput = s.conceptInput;
    interestInput = s.interestInput; languageInput = s.languageInput;
    activeView = s.activeView; showSourceGen = s.showSourceGen;
    generationStep = s.generationStep; isGeneratingSource = s.isGeneratingSource;
    selectionMenu = s.selectionMenu; phonicsData = s.phonicsData;
    sourceCustomInstructions = s.sourceCustomInstructions;
    sourceLength = s.sourceLength; sourceLevel = s.sourceLevel;
    sourceTone = s.sourceTone; sourceVocabulary = s.sourceVocabulary;
    resourceCount = s.resourceCount; targetStandards = s.targetStandards;
    dokLevel = s.dokLevel; selectedFont = s.selectedFont;
    includeSourceCitations = s.includeSourceCitations;
    interactionMode = s.interactionMode;
    revisionData = s.revisionData;
    standardsPromptString = s.standardsPromptString || '';
    alloBotRef = s.alloBotRef || { current: null };
    isBotVisible = s.isBotVisible || false;
    isPlayingRef = s.isPlayingRef || { current: false };
    isSystemAudioActiveRef = s.isSystemAudioActiveRef || { current: false };
    currentAudioRef = s.currentAudioRef || { current: null };
    setActiveView = s.setActiveView; setConceptInput = s.setConceptInput;
    setError = s.setError; setGeneratedContent = s.setGeneratedContent;
    setGenerationStep = s.setGenerationStep; setInputText = s.setInputText;
    setInterestInput = s.setInterestInput; setIsGeneratingSource = s.setIsGeneratingSource;
    setLanguageInput = s.setLanguageInput; setLeveledTextLanguage = s.setLeveledTextLanguage;
    setSelectedConcepts = s.setSelectedConcepts; setSelectedLanguages = s.setSelectedLanguages;
    setShowSourceGen = s.setShowSourceGen; setStudentInterests = s.setStudentInterests;
    setCustomReviseInstruction = s.setCustomReviseInstruction;
    setDefinitionData = s.setDefinitionData; setIsCustomReviseOpen = s.setIsCustomReviseOpen;
    setPhonicsData = s.setPhonicsData; setRevisionData = s.setRevisionData;
    setSelectionMenu = s.setSelectionMenu;
    setPlayingContentId = s.setPlayingContentId; setPlaybackState = s.setPlaybackState;
  };

  const handleGenerateSource = async (overrides = {}, switchView = true) => {
    console.error('[CE-TRACE] handleGenerateSource called. overrides:', JSON.stringify(overrides || {}).substring(0, 200));
    console.error('[CE-TRACE] sourceTopic:', JSON.stringify(sourceTopic), 'sourceLevel:', sourceLevel, 'standardsPromptString:', JSON.stringify(standardsPromptString));
    console.error('[CE-TRACE] inputText length:', (inputText || '').length, 'callGemini:', typeof callGemini);
    const effTopic = (overrides && typeof overrides.topic === 'string') ? overrides.topic : sourceTopic;
    const effGrade = (overrides && typeof overrides.grade === 'string') ? overrides.grade : sourceLevel;
    const effStandards = (overrides && typeof overrides.standards === 'string') ? overrides.standards : standardsPromptString;
    const effIncludeCitations = (overrides && typeof overrides.includeCitations === 'boolean') ? overrides.includeCitations : includeSourceCitations;
    const effLength = (overrides && overrides.length) ? overrides.length : sourceLength;
    const effTone = (overrides && overrides.tone) ? overrides.tone : sourceTone;
    const effDokLevel = (overrides && overrides.dokLevel) ? overrides.dokLevel : dokLevel;
    const effVocabulary = (overrides && overrides.vocabulary) ? overrides.vocabulary : sourceVocabulary;
    const effCustomInstructions = (overrides && overrides.customInstructions) ? overrides.customInstructions : sourceCustomInstructions;
    const effectiveLanguage = leveledTextLanguage;
    console.error('[CE-TRACE] effTopic:', JSON.stringify(effTopic), 'effStandards:', JSON.stringify(effStandards), 'effectiveLanguage:', effectiveLanguage);
    if (!effTopic.trim() && (!effStandards || effStandards.length === 0)) { console.error('[CE-TRACE] EARLY RETURN: no topic and no standards'); return; }
    const dialectInstruction = effectiveLanguage !== 'English'
        ? "STRICT DIALECT ADHERENCE: If a specific dialect is named (e.g. 'Brazilian Portuguese' vs 'European Portuguese'), explicitly use that region's vocabulary, spelling, and grammar conventions."
        : "";
    setIsGeneratingSource(true);
    setGenerationStep(t('status_steps.generating_source'));
    setError(null);
    if (switchView) {
        setGeneratedContent(null);
        setActiveView('input');
    }
    addToast(t('input.status_generating'), "info");
    const targetWords = parseInt(effLength) || 250;
    const chunkCapacity = 600;
    const numChunks = Math.ceil(targetWords / chunkCapacity);
    const isShortText = numChunks <= 1;
    try {
      let researchContext = "";
      if (effIncludeCitations) {
          setGenerationStep(t('status_steps.researching_topic'));
          try {
              const isLocalBackend = ai?.backend === 'ollama' || ai?.backend === 'localai';

              if (isLocalBackend) {
                  // ── For local backends: web search + LLM research ──
                  let searchContext = '';
                  try {
                      const searchResults = await webSearchProvider.search(`${effTopic} ${effGrade} facts statistics`);
                      if (searchResults && searchResults.length > 0) {
                          searchContext = searchResults.slice(0, 8).map((r, i) =>
                              `[${i+1}] ${r.title}\n${r.snippet}\nURL: ${r.url}`
                          ).join('\n\n');
                      }
                  } catch (searchErr) {
                      warnLog('[Research] Web search failed:', searchErr.message);
                  }
                  const localResearchPrompt = `
                      Research brief for educational content creation.
                      Topic: "${effTopic}" | Audience: ${effGrade}
                      ${effStandards ? `Standard: "${effStandards}"` : ''}
                      ${searchContext ? `\nWEB SEARCH RESULTS:\n${searchContext}\n` : ''}
                      Extract 8-12 key facts, vocabulary terms, and important points from the search results above.
                      Return a structured research brief with clear bullet points. Do NOT write the article itself.
                  `;
                  researchContext = await ai.generateText(localResearchPrompt, { temperature: 0.2 });
              } else {
                  // ── For Gemini: use Google Search grounding as before ──
                  const researchPrompt = `
                      Research the following topic for educational content creation.
                      Topic: "${effTopic}"
                      Target Audience: ${effGrade}
                      ${effStandards ? `Academic Standard: "${effStandards}"` : ''}
                      ${effDokLevel ? `Depth of Knowledge: ${effDokLevel}` : ''}
                      Task:
                      1. Use Google Search to find key facts, dates, statistics, and terminology.
                      2. Identify ${numChunks <= 1 ? '12-16' : '8-12'} most important factual points appropriate for the audience.
                      3. Note any common misconceptions or outdated information to avoid.
                      4. Gather vocabulary terms appropriate for the grade level.
                      5. Identify reliable sources for the claims.
                      Return a structured research brief with clear bullet points. Do NOT write the article itself.
                  `;
                  // Retry loop for Google Search grounding (transient failures are common)
                  const maxResearchRetries = 2;
                  let researchSuccess = false;
                  for (let rAttempt = 0; rAttempt <= maxResearchRetries && !researchSuccess; rAttempt++) {
                      try {
                          if (rAttempt > 0) console.log(`[Research] 🔄 Grounding retry ${rAttempt + 1}/${maxResearchRetries + 1}...`);
                          const researchResult = await callGemini(researchPrompt, false, true);
                          if (typeof researchResult === 'object' && researchResult?.text) {
                              researchContext = researchResult.text;
                          } else if (researchResult) {
                              researchContext = String(researchResult);
                          }
                          researchSuccess = true;
                          if (rAttempt > 0) console.log(`[Research] ✅ Grounding succeeded on attempt ${rAttempt + 1}`);
                      } catch (rErr) {
                          console.warn(`[Research] ⚠️ Grounding attempt ${rAttempt + 1} failed:`, rErr?.message);
                          if (rAttempt < maxResearchRetries) {
                              await new Promise(r => setTimeout(r, 2000));
                          } else {
                              throw rErr;
                          }
                      }
                  }
              }
              if (!researchContext || researchContext.length < 50) {
                  researchContext = "";
                  warnLog("Research phase returned insufficient data");
              }
          } catch (researchErr) {
              warnLog("Research phase failed, proceeding with standard generation", researchErr);
              researchContext = "";
          }
      }
      // Show toast only when research context is truly empty (not on transient errors)
      if (effIncludeCitations && !researchContext) {
          addToast(t('toasts.research_skipped'), "info");
      }
      // targetWords, chunkCapacity, numChunks, isShortText are declared above (before the research block)
      if (numChunks > 1) {
           setGenerationStep(t('status_steps.designing_structure'));
           const outlinePrompt = `
             You are an expert curriculum designer.
             Plan a comprehensive educational article.
             Topic: "${effTopic}"
             Target Audience: ${effGrade}
             Total Target Word Count: ${targetWords} words.
             Task: Create a structured outline with exactly ${numChunks} distinct section headings that cover the topic in depth.
             Return ONLY a JSON array of strings (the headings).
             Example: ${JSON.stringify(Array.from({length: numChunks}, (_, i) => `Section ${i+1} Title`))}
           `;
           const outlineResult = await callGemini(outlinePrompt, true);
           let sections = [];
           try {
               sections = JSON.parse(cleanJson(outlineResult));
               if (!Array.isArray(sections) || sections.length === 0) throw new Error("Invalid outline");
           } catch (e) {
               sections = Array.from({length: numChunks}, (_, i) => `Part ${i+1}`);
           }
           let fullDocument = `Title: ${effTopic}\n\n`;
           const wordsPerSection = Math.ceil(targetWords / sections.length);
           let allGroundingChunks = [];
           let currentCitationOffset = 0;
           setInputText(fullDocument);
           for (let i = 0; i < sections.length; i++) {
               const sectionTitle = sections[i];
               setGenerationStep(t('status_steps.writing_part', { current: i + 1, total: sections.length, title: sectionTitle }));
               const bilingualInstruction = getBilingualPromptInstruction(effectiveLanguage);
               const sectionPrompt = `
                   Write the section "${sectionTitle}" for an educational article about "${effTopic}".
                   Target Audience: ${effGrade}
                   Tone: ${effTone}
                   Target Length for this section: ~${wordsPerSection} words.
                   ${researchContext ? `
                   --- RESEARCH BRIEF (BACKGROUND CONTEXT ONLY) ---
                   The following background information is available:
                   """
                   ${researchContext}
                   """
                   ------------------------------------------------
                   IMPORTANT: This brief is for context. You MUST still use Google Search independently to verify and cite every fact you write.
                   ` : ''}
                   Context So Far:
                   ${i === 0 ? "This is the FIRST section." : "This follows previous sections."}
                   STRICT INSTRUCTIONS:
                   ${effIncludeCitations ? `
                   1. CITATION REQUIREMENT (section ${i + 1} of ${sections.length}): Include inline citations throughout this section.
                   2. Every paragraph should have at least one citation. Major facts, statistics, and claims require source attribution.
                   3. Do not defer citations to later sections - cite facts as you introduce them.
                   4. Verify claims with web sources before including them.
                   ` : ''}
                   5. Write detailed, rigorous paragraphs. Do NOT summarize.
                   6. Include a header "## ${sectionTitle}".
                   7. Do NOT write a conclusion unless this is the final section.
                   ${dialectInstruction}
                   ${bilingualInstruction}
                   Return ONLY the section text. Do not wrap in markdown code blocks.
               `;
               let result;
               let groundingSuccess = false;
               const maxGroundingRetries = 2;
               for (let attempt = 0; attempt <= maxGroundingRetries && !groundingSuccess; attempt++) {
                   try {
                       result = await callGemini(sectionPrompt, false, effIncludeCitations);
                       groundingSuccess = true;
                   } catch (sectionErr) {
                       if (attempt < maxGroundingRetries && effIncludeCitations) {
                           warnLog(`Section ${i + 1} grounding attempt ${attempt + 1} failed, retrying...`, sectionErr.message);
                           await new Promise(r => setTimeout(r, 1500));
                       } else {
                           warnLog(`[Citations] ⚠️ Section ${i + 1}/${sections.length} ("${sectionTitle}") grounding failed after ${attempt + 1} attempts, falling back to no-grounding. Citations for this section will be missing.`);
                           result = await callGemini(sectionPrompt, false, false);
                       }
                   }
               }
               let sectionText = "";
               if (typeof result === 'object' && result !== null) {
                   const rawSection = result.text || "";
                   if (effIncludeCitations && rawSection) {
                                                 const cleanedSection = rawSection.replace(/\[cite:\s*[^\]]*\]\.?\s*/gi, '').replace(/,?\s*\d+\s+in\s+step\s+\d+/gi, '').trim();
                        let processedSection = processGrounding(cleanedSection, result.groundingMetadata, 'Links Only', false, false);
                        if (result.groundingMetadata?.groundingChunks) {
                             const chunkCount = result.groundingMetadata.groundingChunks.length;
                             processedSection = processedSection.replace(/⁽([⁰¹²³⁴⁵⁶⁷⁸⁹]+)⁾/g, (match, digits) => {
                                 const reverseMap = { '⁰':0, '¹':1, '²':2, '³':3, '⁴':4, '⁵':5, '⁶':6, '⁷':7, '⁸':8, '⁹':9 };
                                 const val = parseInt(digits.split('').map(d => reverseMap[d]).join(''), 10);
                                 const newVal = val + currentCitationOffset;
                                 return `⁽${toSuperscript(newVal)}⁾`;
                             });
                             // Convert [Source N], [Source N, M], Source N, M] etc. to clickable superscript links
                             const sectionChunks = result.groundingMetadata.groundingChunks;
                             processedSection = processedSection.replace(/\[?Sources?\s+([\d,\s]+(?:and\s+\d+)?)\]?/gi, (match, numsPart) => {
                                 const nums = numsPart.replace(/and/gi, ',').split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
                                 if (nums.length === 0) return '';
                                 const converted = nums.map(num => {
                                     const localIdx = num - 1;
                                     if (localIdx >= 0 && localIdx < sectionChunks.length) {
                                         const globalIdx = localIdx + currentCitationOffset + 1;
                                         const uri = sectionChunks[localIdx]?.web?.uri;
                                         const label = `⁽${toSuperscript(globalIdx)}⁾`;
                                         return uri ? `[${label}](${uri})` : label;
                                     }
                                     return '';
                                 }).filter(Boolean);
                                 return converted.length > 0 ? ' ' + converted.join(' ') : '';
                             });
                             allGroundingChunks = [...allGroundingChunks, ...result.groundingMetadata.groundingChunks];
                             currentCitationOffset += chunkCount;
                        }
                        // Sanitize orphan brackets that could break markdown link rendering
                        processedSection = processedSection
                            .replace(/\[(⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾)(?!\]\()/g, '$1')   // [⁽³⁾ → ⁽³⁾ (but not [⁽³⁾](url) links)
                            .replace(/(⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾)\](?!\()/g, '$1')   // ⁽³⁾] → ⁽³⁾ (but not ⁾](url) links)
                            .replace(/\[?Sources?\s+[\d,\s]+(?:and\s+\d+)?\]?/gi, '');   // any remaining Source refs
                        // Move citations before punctuation to after (same fix as short-text L37182)
                        processedSection = processedSection.replace(/(\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\([^)]+\))\s*([.!?])/g, '$2 $1');
                        sectionText = processedSection;
                   } else {
                        sectionText = rawSection;
                   }
               } else {
                   sectionText = String(result || "");
               }
               sectionText = sectionText.replace(/^```[a-zA-Z]*\n/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
               fullDocument += sectionText + "\n\n";
               setInputText(fullDocument);
               if (i < sections.length - 1) await new Promise(r => setTimeout(r, 1000));
           }
           if (effIncludeCitations && allGroundingChunks.length > 0) {
                const masterMetadata = { groundingChunks: allGroundingChunks };
                fullDocument += generateBibliographyString(masterMetadata, 'Links Only', "Source Text References");
                fullDocument = validateAndRepairCitations(fullDocument, allGroundingChunks);
           }
           if (effIncludeCitations) {
                const finalCitCount = (fullDocument.match(/\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\(/g) || []).length;

                const hasBiblio = /Source Text References/i.test(fullDocument);

                const sourceCount = (fullDocument.match(/^\d+\.\s+\[/gm) || []).length;

                console.log(`[Citations] 📊 Multi-chunk pipeline summary: ${finalCitCount} inline citations across ${sections.length} sections, bibliography=${hasBiblio}, ${sourceCount} sources listed, ${allGroundingChunks.length} total grounding chunks collected`);

                const hasCitationMarkers = finalCitCount > 0 || hasBiblio;

               if (!hasCitationMarkers) {
                   warnLog("Multi-chunk citation verification: No citation markers found despite setting enabled");
                   addToast(t('toasts.citations_unavailable'), "info");
               }
           }
           fullDocument = cleanSourceMetaCommentary(fullDocument);
           fullDocument = repairSourceMarkdown(fullDocument);
           setInputText(fullDocument);
           setShowSourceGen(false);
           addToast(t('input.success_long_form'), "success");
           setIsGeneratingSource(false);
           flyToElement('tour-source-input');
           return;
      }
      const minParagraphs = Math.max(3, Math.ceil(targetWords / 60));
      const minSections = Math.max(3, Math.ceil(targetWords / 250));
      const complexityGuard = `
        - HANDLING COMPLEX TOPICS: If the topic involves abstract, religious, or advanced scientific concepts (e.g. Shintoism, Quantum Mechanics), do NOT use high-level academic definitions.
        - ANALOGY REQUIREMENT: You MUST explain every abstract concept using a concrete analogy relatable to a ${effGrade} student immediately.
        - VOCABULARY GUARD: If you use a domain-specific term (Tier 3), define it simply in the same sentence.
      `;
      const structureInstruction = getStructureForLength(targetWords);
      const isDialogueMode = effTone === 'Narrative';
      const isNarrativeMode = effTone === 'Narrative' || effTone === 'Engaging Narrative';
      let storyOutline = '';
      if (isDialogueMode) {
        addToast(t('input.drafting_story_outline') || "Planning dialogue structure...", "info");
        const outlinePrompt = `
You are designing an educational dialogue scene.
TOPIC TO TEACH: "${effTopic}"
TARGET READER AGE: ${effGrade}
${effStandards ? `KEY CONCEPTS TO INCLUDE: "${effStandards}"` : ''}
${researchContext ? `FACTUAL INFORMATION TO WEAVE IN:\n${researchContext}` : ''}
Create a DIALOGUE DISCOVERY PLAN with these sections:
## CHARACTERS
Define exactly 2 characters:
**THE LEARNER** (curious, asks questions):
- Name:
- Age/Role: (should be relatable to ${effGrade} readers)
- Personality: (curious? skeptical? impatient? nervous?)
- Why do they care about this topic? (personal motivation)
**THE GUIDE** (knowledgeable, explains through conversation):
- Name:
- Role: (grandparent, mentor, teacher, older sibling, expert friend)
- Teaching style: (uses analogies? asks guiding questions? tells stories from experience?)
## SETTING
- Location: (be specific - "the kitchen table" not "home")
- What brings them together? (natural reason for conversation)
- Any props or objects that can demonstrate concepts?
## THE HOOK
Write the opening 2-3 lines of dialogue that spark the conversation.
The Learner should ask a question or make an observation that launches the discussion.
## KEY QUESTIONS & DISCOVERIES
List 4-6 question → answer pairs that will form the backbone of the dialogue:
1. LEARNER asks: [specific question about ${effTopic}]
   GUIDE explains: [key concept, using analogy or example]
   LEARNER reacts: [shows understanding, asks follow-up, or pushes back]
2. (continue for each major concept)
## DEMONSTRATION MOMENT
Identify ONE hands-on moment where the Guide shows rather than tells:
- What object or action illustrates the concept?
- What does the Learner notice or discover?
## CLOSING EXCHANGE
How does the dialogue end? The Learner should:
- Summarize understanding in their own words
- Connect it to something in their life
- Express emotion (excitement, surprise, satisfaction)
IMPORTANT: Plan for DIALOGUE, not narration. 70%+ should be spoken lines.
        `;
        try {
          const outlineResult = await callGemini(outlinePrompt, false, false, 1.6);
          storyOutline = typeof outlineResult === 'object' ? (outlineResult.text || '') : String(outlineResult || '');
          storyOutline = storyOutline.replace(/^```[a-zA-Z]*\n/i, '').replace(/```\s*$/, '').trim();
        } catch (outlineErr) {
          warnLog("Dialogue plan generation failed, proceeding without plan:", outlineErr);
          storyOutline = '';
        }
      }
      const prompt = isDialogueMode ? `
You are generating an EDUCATIONAL DIALOGUE between two characters who explore a topic through natural conversation.
Topic: "${effTopic}"
Target reader level: ${effGrade}
${effDokLevel ? `Depth of complexity: ${effDokLevel}` : ''}
${effStandards ? `Concepts to weave in: "${effStandards}"` : ''}
Target length: approximately ${targetWords} words total
${storyOutline ? `
========== DIALOGUE PLAN TO FOLLOW ==========
${storyOutline}
========== END PLAN ==========
` : ''}
${researchContext ? `
Factual details to weave into the conversation:
${researchContext}
` : ''}
${effVocabulary ? `Key vocabulary to introduce naturally: ${effVocabulary}` : ''}
${effCustomInstructions ? `Special instructions: ${effCustomInstructions}` : ''}
========== OUTPUT FORMAT ==========
Return a JSON object with this exact structure:
{
  "title": "A catchy title for this dialogue",
  "setting": "Brief description of where/when this takes place (1 sentence)",
  "characters": {
    "learner": { "name": "Name", "description": "Brief personality" },
    "guide": { "name": "Name", "description": "Brief role/personality" }
  },
  "dialogue": [
    { "speaker": "learner", "action": "(optional action/emotion)", "line": "What the character says" },
    { "speaker": "guide", "action": "(smiling)", "line": "Response here" },
    { "speaker": "learner", "line": "Follow-up question without action" }
  ]
}
========== DIALOGUE QUALITY RULES ==========
✓ 80%+ of content should be in the dialogue lines, not narration
✓ Learner asks genuine questions a ${effGrade} student would ask
✓ Guide uses analogies and examples, NOT textbook definitions
✓ Include "Wait, so..." and "But why..." follow-up questions
✓ Learner has "aha!" moments and makes connections
✓ End with Learner summarizing understanding in their own words
✗ Guide should NOT give lectures or long uninterrupted explanations
✗ NO textbook-style definitions like "X is defined as..."
✗ Actions are optional - only include when they add meaning
========== READING LEVEL GUIDANCE ==========
${effGrade === 'Kindergarten' || effGrade === '1st Grade' ? 'Use very simple words. Short sentences. Learner asks basic "what" and "why" questions.' : ''}
${effGrade === '2nd Grade' || effGrade === '3rd Grade' ? 'Simple vocabulary. Learner is curious and asks lots of follow-ups. Guide uses kid-friendly comparisons.' : ''}
${effGrade === '4th Grade' || effGrade === '5th Grade' ? 'Natural conversation flow. Can introduce vocabulary with immediate explanation in dialogue.' : ''}
${effGrade === '6th Grade' || effGrade === '7th Grade' || effGrade === '8th Grade' ? 'More sophisticated dialogue. Learner can push back, express skepticism, ask deeper questions.' : ''}
${complexityGuard}
Return ONLY the JSON object. Do not include any preamble, markdown code blocks, or explanation.
      ` : `
        Write a comprehensive educational text for use as source material.
        Topic: "${effTopic}"
        Target Reading Level: ${effGrade}
        Tone/Style: ${effTone}
        ${effDokLevel ? `Webb's Depth of Knowledge (DOK) Target: ${effDokLevel}` : ''}
        ${effStandards ? `Target Standard: "${effStandards}"` : ''}
        --- LENGTH REQUIREMENT: ${targetWords} WORDS ---
        Target approximately ${targetWords} words.
        IMPORTANT: Do not generate significantly more than ${targetWords} words. Keep it within 10% of the target.
        ${structureInstruction}
        ${targetWords >= 1000 ? 'EXPANSION STRATEGY: To reach this word count, you must "over-explain" concepts. Use multiple examples, detailed scenarios, and step-by-step breakdowns for every point. Do not summarize.' : 'Focus on clarity and conciseness to meet the word count without fluff.'}
        ${effVocabulary ? `Key Vocabulary to Include: ${effVocabulary}` : ''}
        ${effCustomInstructions ? `Custom Instructions: ${effCustomInstructions}` : ''}
        ${researchContext && !isShortText ? `
        --- RESEARCH BRIEF (USE AS FACTUAL FOUNDATION) ---
        The following key facts have been verified via web research.
        Base your content primarily on this information:
        """
        ${researchContext}
        """
        ------------------------------------------------
        VERIFICATION REQUIRED: Also use Google Search to verify facts and gather additional sources.
        SYNTHESIS INSTRUCTION: Use these verified facts to write a detailed, long-form original ${isNarrativeMode ? 'narrative article' : 'informational article'}. Weave them into a full lesson text.
        CRITICAL FORMAT RULES:
        - Write in PROSE PARAGRAPHS. Do NOT use numbered lists or bullet points for the main content. Use flowing text with complete paragraphs.
        - Do NOT include any "Sources", "References", "Works Cited", "Bibliography", or similar sections. I will automatically append verified sources at the end.
        ` : (effIncludeCitations ? `
        CRITICAL: You MUST use Google Search to find, verify, and cite facts about "${effTopic}".
        Search for key facts, statistics, dates, and claims relevant to this topic. Every paragraph must include at least one cited source.
        ${isShortText ? `CITATION DENSITY (SHORT TEXT): This is a concise document. You MUST include at least 1 citation per paragraph. Every major factual claim needs a cited source. Err on the side of MORE citations, not fewer.` : ''}
        SYNTHESIS: Write a detailed, original ${isNarrativeMode ? 'narrative article' : 'informational article'}. Weave verified facts into a full lesson text. Do not produce a list of facts.
        CRITICAL FORMAT RULES:
        - Write in PROSE PARAGRAPHS. Do NOT use numbered lists or bullet points for the main content. Use flowing text with complete paragraphs.
        - Do NOT include any "Sources", "References", "Works Cited", "Bibliography", or similar sections. I will automatically append verified sources at the end.
        ` : '')}
        STRICT READING LEVEL GUIDELINES (COMPENSATION FOR AI BIAS):
        - AI models typically write 1-2 grades higher than requested. You MUST compensate for this.
        - If "Kindergarten" or "1st Grade": Target Pre-K complexity. Use extremely short sentences (3-5 words). No compound sentences.
        - If "2nd Grade" or "3rd Grade": Target 1st Grade complexity. Use short, declarative sentences. High-frequency vocabulary only.
        - If "4th Grade" or "5th Grade": Target 3rd Grade complexity. Mostly simple sentences, limited compound sentences.
        - If "6th Grade" to "8th Grade": Target 5th Grade complexity. Straightforward syntax, avoid dense academic language.
        - If "9th Grade" to "12th Grade": Target 8th Grade complexity. Clear, standard English without unnecessary jargon.
        - GENERAL RULE: If in doubt, simplify further. Shorter sentences. Simpler words.
        ${complexityGuard}
        Instructions:
        - Write a well-structured text suitable for a classroom setting.
        - Ensure factual accuracy and clarity.
        - ${effTone === 'Persuasive' || effTone === 'Persuasive / Opinion' ? 'Write a compelling argumentative piece with clear claims, evidence, and a call to action.' : effTone === 'Humorous' || effTone === 'Humorous / Engaging' ? 'Use humor, jokes, and entertaining analogies while maintaining educational accuracy.' : effTone === 'Procedural' || effTone === 'Step-by-Step / Procedural' ? 'Write clear step-by-step instructions with numbered steps and helpful tips.' : 'Write in a formal, expository textbook style. Focus on factual presentation with clear definitions and explanations. Avoid narrative hooks, storytelling elements, or conversational language. Present information directly and academically.'}
        - Do not include any intro/outro conversational text (like "Here is the text"). Just provide the content.
      `;
      const shouldUseJsonMode = false;
      const creativeTemperature = isNarrativeMode ? 1.6 : null;
      const useSearchForThisCall = effIncludeCitations;
      let result;
      let groundingSuccess = false;
      const maxGroundingRetries = 2;
      for (let attempt = 0; attempt <= maxGroundingRetries && !groundingSuccess; attempt++) {
          try {
              result = await callGemini(prompt, shouldUseJsonMode, useSearchForThisCall, creativeTemperature);
              groundingSuccess = true;
          } catch (apiError) {
              if (attempt < maxGroundingRetries && effIncludeCitations) {
                  warnLog(`Short text grounding attempt ${attempt + 1} failed, retrying...`, apiError.message);
                  await new Promise(r => setTimeout(r, 1500));
              } else if (effIncludeCitations) {
                  warnLog(`Short text grounding failed after ${attempt + 1} attempts, falling back to no-grounding`);
                  addToast(t('toasts.verification_unavailable'), "info");
                  try {
                      result = await callGemini(prompt, shouldUseJsonMode, false, creativeTemperature);
                  } catch (fallbackErr) {
                      warnLog(`[Citations] Fallback no-grounding call also failed:`, fallbackErr.message);
                      result = { text: "", groundingMetadata: null };
                  }
              } else {
                  throw apiError;
              }
          }
      }
      let text = '';
      if (typeof result === 'object' && result !== null && 'text' in result) {
          const rawText = result.text || "";
          if (effIncludeCitations && rawText) {
              const cleanedRawText = rawText.replace(/\[cite:\s*[\d,\s]+(?:in step \d+)?\]\.?\s*/gi, '');
              const rawWithCitations = processGrounding(cleanedRawText, result.groundingMetadata, 'Links Only', false, false);
              if (isShortText) {
                  // ── Short text: deterministic citation cleanup (no lossy LLM round-trip) ──
                  setGenerationStep(t('status_steps.optimizing_citations'));
                  let processedText = rawWithCitations
                      // Move citations before punctuation to after: "fact [⁽¹⁾](url)." → "fact. [⁽¹⁾](url)"
                      .replace(/(\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\([^)]+\))\s*([.!?])/g, '$2 $1')
                      // Separate adjacent citations with comma
                      .replace(/(\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\([^)]+\))(\[⁽)/g, '$1, $2')
                      // Strip any Sources/References/Bibliography sections (auto-generated later)
                      .replace(/\n*(?:#{1,4}\s*)?(?:Sources?|References?|Works?\s*Cited|Bibliography)\s*[\n\r]+(?:(?:\d+\.\s+|\*\s+|-\s+)?.+[\n\r]+)*(?=\n*(?:#{1,4}\s|\Z|$))/gi, '\n')
                      // Clean orphan brackets around citations
                      .replace(/\[(⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾)(?!\]\()/g, '$1')
                      .replace(/(⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾)\](?!\()/g, '$1')
                      // Remove remaining Source N references
                      .replace(/\[?Sources?\s+[\d,\s]+(?:and\s+\d+)?\]?/gi, '');
                  text = processedText.trim();
                  if (result.groundingMetadata?.groundingChunks) {
                      const { renumberedText, reorderedChunks } = renumberCitations(text, result.groundingMetadata.groundingChunks);
                      text = renumberedText;
                      const tempMeta = { ...result.groundingMetadata, groundingChunks: reorderedChunks };
                      text += generateBibliographyString(tempMeta, 'Links Only', "Source Text References");
                  } else {
                      text += generateBibliographyString(result.groundingMetadata, 'Links Only', "Source Text References");
                  }
              } else {
              // ── Long text: LLM-based citation cleanup (existing behavior) ──
              setGenerationStep(t('status_steps.optimizing_citations') || 'Optimizing citations...');
              const cleanupPrompt = `
                You are a meticulous text editor. The text below contains citation links (e.g. [⁽¹⁾](url)).
                Task:
                1. Move the citation markers to the most appropriate location (usually the end of the sentence or clause, after punctuation).
                2. Ensure the Markdown Link syntax remains EXACTLY intact (do not break the URL or brackets).
                3. SEPARATE adjacent citations (e.g., transform "[⁽¹⁾](...)[⁽²⁾](...)" into "[⁽¹⁾](...), [⁽²⁾](...)"). Do NOT merge them into one number like "12".
                4. DEDUPLICATE: If the same source number appears multiple times in a single sentence, keep only the last one (e.g., "Facts [1] are facts [1]." -> "Facts are facts [1].").
                5. REMOVE any "Sources", "References", "Works Cited", "Bibliography" sections (these are auto-generated later). Look for headings like "Sources", "References", etc. followed by numbered lists and remove the entire section.
                6. Do not otherwise change the content text.
                Text to Fix:
                ${rawWithCitations}
              `;
              try {
                  const timeoutPromise = new Promise((_, reject) =>
                      setTimeout(() => reject(new Error("Optimization timed out")), 60000)
                  );
                  const cleaned = await Promise.race([
                      callGemini(cleanupPrompt),
                      timeoutPromise
                  ]);
                  if (!cleaned) throw new Error("Cleanup returned empty");
                  const rawCitCount = (rawWithCitations.match(/\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\(/g) || []).length;
                  const cleanedCitCount = (cleaned.match(/\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\(/g) || []).length;
                  if (rawCitCount > 0 && cleanedCitCount < rawCitCount * 0.5) {
                      warnLog(`Citation validation: cleanup lost ${rawCitCount - cleanedCitCount}/${rawCitCount} citations. Falling back to raw.`);
                      throw new Error("Citation loss detected - using raw grounding");
                  }
                  let strippedText = cleaned.replace(/\n*(?:#{1,4}\s*)?(?:Sources?|References?|Works?\s*Cited|Bibliography)\s*[\n\r]+(?:(?:\d+\.\s+|\*\s+|-\s+)?.+[\n\r]+)*(?=\n*(?:#{1,4}\s|\Z|$))/gi, '\n');
                  text = strippedText.trim();
                  if (result.groundingMetadata?.groundingChunks) {
                      const { renumberedText, reorderedChunks } = renumberCitations(text, result.groundingMetadata.groundingChunks);
                      text = renumberedText;
                      const tempMeta = { ...result.groundingMetadata, groundingChunks: reorderedChunks };
                      text += generateBibliographyString(tempMeta, 'Links Only', "Source Text References");
                  } else {
                      text += generateBibliographyString(result.groundingMetadata, 'Links Only', "Source Text References");
                  }
              } catch (cleanupErr) {
                  warnLog("Citation placement optimization skipped (Timeout or Error):", cleanupErr);
                  const cleanedFallback = rawText.replace(/\[cite:\s*[\d,\s]+(?:in step \d+)?\]\.?\s*/gi, '');
                  let fallbackText = processGrounding(cleanedFallback, result.groundingMetadata, 'Links Only', false, false);
                  fallbackText = fallbackText.replace(/\n*(?:#{1,4}\s*)?(?:Sources?|References?|Works?\s*Cited|Bibliography)\s*[\n\r]+(?:(?:\d+\.\s+|\*\s+|-\s+)?.+[\n\r]+)*(?=\n*(?:#{1,4}\s|\Z|$))/gi, '\n').trim();
                  if (result.groundingMetadata?.groundingChunks) {
                      const { renumberedText, reorderedChunks } = renumberCitations(fallbackText, result.groundingMetadata.groundingChunks);
                      fallbackText = renumberedText;
                      const tempMeta = { ...result.groundingMetadata, groundingChunks: reorderedChunks };
                      fallbackText += generateBibliographyString(tempMeta, 'Links Only', "Source Text References");
                  } else {
                      fallbackText += generateBibliographyString(result.groundingMetadata, 'Links Only', "Source Text References");
                  }
                  text = fallbackText;
                  if (cleanupErr.message === "Optimization timed out") {
                      addToast(t('input.error_optimization_timeout'), "info");
                  }
              }
              }
          } else {
              text = rawText;
          }
      } else {
          text = String(result || "");
      }
      if (isDialogueMode && text) {
        try {
          const dialogueData = safeJsonParse(text);
          if (dialogueData && dialogueData.dialogue && Array.isArray(dialogueData.dialogue)) {
            let formattedScript = '';
            if (dialogueData.title) {
              formattedScript += `# ${dialogueData.title}\n\n`;
            }
            if (dialogueData.setting) {
              formattedScript += `*${dialogueData.setting}*\n\n`;
            }
            const learnerName = dialogueData.characters?.learner?.name || 'LEARNER';
            const guideName = dialogueData.characters?.guide?.name || 'GUIDE';
            for (const line of dialogueData.dialogue) {
              const speakerName = line.speaker === 'learner' ? learnerName.toUpperCase() : guideName.toUpperCase();
              const action = line.action ? ` ${line.action}` : '';
              formattedScript += `**${speakerName}:**${action} ${line.line}\n\n`;
            }
            text = formattedScript.trim();
          }
        } catch (parseErr) {
          warnLog("Dialogue JSON parsing failed, using raw text:", parseErr);
        }
      }
      if (effIncludeCitations && text) {
          text = sanitizeRawUrls(text);
          if (result?.groundingMetadata?.groundingChunks) {
              text = validateAndRepairCitations(text, result.groundingMetadata.groundingChunks);
          }
          const hasCitationMarkers = /\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\(/.test(text) || /Source Text References/i.test(text);
          if (!hasCitationMarkers && isShortText) {
              // Short text citation density retry: regenerate once if zero citations
              warnLog("[Citations] Short text got 0 citations, retrying generation once...");
              try {
                  setGenerationStep(t('status_steps.retrying_citations') || 'Retrying for better citations...');
                  const retryResult = await callGemini(prompt, shouldUseJsonMode, useSearchForThisCall, creativeTemperature);
                  if (typeof retryResult === 'object' && retryResult !== null && retryResult.text) {
                      const retryRaw = retryResult.text.replace(/\[cite:\s*[\d,\s]+(?:in step \d+)?\]\.?\s*/gi, '');
                      let retryText = processGrounding(retryRaw, retryResult.groundingMetadata, 'Links Only', false, false);
                      // Apply deterministic cleanup
                      retryText = retryText
                          .replace(/(\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\([^)]+\))\s*([.!?])/g, '$2 $1')
                          .replace(/(\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\([^)]+\))(\[⁽)/g, '$1, $2')
                          .replace(/\n*(?:#{1,4}\s*)?(?:Sources?|References?|Works?\s*Cited|Bibliography)\s*[\n\r]+(?:(?:\d+\.\s+|\*\s+|-\s+)?.+[\n\r]+)*(?=\n*(?:#{1,4}\s|\Z|$))/gi, '\n')
                          .replace(/\[(⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾)(?!\]\()/g, '$1')
                          .replace(/(⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾)\](?!\()/g, '$1')
                          .replace(/\[?Sources?\s+[\d,\s]+(?:and\s+\d+)?\]?/gi, '')
                          .trim();
                      if (retryResult.groundingMetadata?.groundingChunks) {
                          const { renumberedText, reorderedChunks } = renumberCitations(retryText, retryResult.groundingMetadata.groundingChunks);
                          retryText = renumberedText;
                          const tempMeta = { ...retryResult.groundingMetadata, groundingChunks: reorderedChunks };
                          retryText += generateBibliographyString(tempMeta, 'Links Only', "Source Text References");
                      }
                      const retryCitCount = (retryText.match(/\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\(/g) || []).length;
                      if (retryCitCount > 0) {
                          text = retryText;
                          warnLog(`[Citations] Retry succeeded: ${retryCitCount} citations recovered`);
                      } else {
                          warnLog("[Citations] Retry also yielded 0 citations");
                          addToast(t('toasts.citations_unavailable'), "info");
                      }
                  }
              } catch (retryErr) {
                  warnLog("[Citations] Retry failed:", retryErr.message);
                  addToast(t('toasts.citations_unavailable'), "info");
              }
          } else if (!hasCitationMarkers) {
              warnLog("Citation verification: No citation markers found despite setting enabled");
              addToast(t('toasts.citations_unavailable'), "info");
          }
      }
      text = cleanSourceMetaCommentary(text);
      text = ensureTitleHeading(text);
      text = repairSourceMarkdown(text);
      setInputText(text);
      setShowSourceGen(false);
    } catch (err) {
      if (!err.message?.includes("401")) {
          warnLog("Unhandled error:", err);
      }
      const errMsg = err.message?.includes("Blocked") ? "Content blocked by safety filters." :
                     err.message?.includes("Stopped") ? "Generation stopped by AI model." :
                     err.message?.includes("401") ? "Daily Usage Limit Reached. Please try again later." :
                     "Error generating content. Please try again.";
      setError(errMsg);
      addToast(errMsg, "error");
      if (isBotVisible && alloBotRef.current) {
          alloBotRef.current.speak(t('bot_events.feedback_error_apology'), 'confused');
      }
    } finally {
      setIsGeneratingSource(false);
      flyToElement('tour-source-input');
    }
  };
  const addLanguage = () => {
    if (languageInput.trim() && !selectedLanguages.includes(languageInput.trim()) && selectedLanguages.length < 4) {
      setSelectedLanguages([...selectedLanguages, languageInput.trim()]);
      setLanguageInput('');
    }
  };
  const addInterest = () => {
    if (interestInput.trim() && !studentInterests.includes(interestInput.trim()) && studentInterests.length < 5) {
      setStudentInterests([...studentInterests, interestInput.trim()]);
      setInterestInput('');
    }
  };
  const removeInterest = (interest) => {
    setStudentInterests(studentInterests.filter(i => i !== interest));
  };
  const handleInterestKeyDown = (e) => {
    if (e.key === 'Enter') addInterest();
  };
  const removeLanguage = (lang) => {
    const newLangs = selectedLanguages.filter(l => l !== lang);
    setSelectedLanguages(newLangs);
    if (leveledTextLanguage === lang) setLeveledTextLanguage('English');
    if (leveledTextLanguage === 'All Selected Languages' && newLangs.length === 0) setLeveledTextLanguage('English');
  };
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addLanguage();
  };
  const addConcept = () => {
    if (conceptInput.trim() && !selectedConcepts.includes(conceptInput.trim()) && selectedConcepts.length < 5) {
      setSelectedConcepts([...selectedConcepts, conceptInput.trim()]);
      setConceptInput('');
    }
  };
  const removeConcept = (concept) => {
    setSelectedConcepts(selectedConcepts.filter(c => c !== concept));
  };
  const handleConceptKeyDown = (e) => {
      if (e.key === 'Enter') addConcept();
  };
  const handleDownloadImage = () => {
    if (generatedContent?.type !== 'image' || !generatedContent?.data?.imageUrl) return;
    const downloadWithLabels = (imgUrl, labels, filename) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            if (labels && labels.length > 0) {
                ctx.font = 'bold 14px Inter, Segoe UI, system-ui, sans-serif';
                ctx.textAlign = 'center';
                labels.forEach(label => {
                    const x = (label.x / 100) * canvas.width;
                    const y = (label.y / 100) * canvas.height;
                    const text = label.text || '';
                    const metrics = ctx.measureText(text);
                    const pad = 6;
                    ctx.fillStyle = 'rgba(30, 27, 75, 0.85)';
                    const rx = x - metrics.width / 2 - pad;
                    const ry = y - 10;
                    const rw = metrics.width + pad * 2;
                    const rh = 20;
                    ctx.beginPath();
                    ctx.roundRect(rx, ry, rw, rh, 4);
                    ctx.fill();
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(text, x, y + 4);
                });
            }
            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 'image/png');
        };
        img.onerror = () => {
            const link = document.createElement('a');
            link.href = imgUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
        img.src = imgUrl;
    };
    if (generatedContent?.data.visualPlan && generatedContent?.data.visualPlan.panels.length > 1) {
        const labelsHidden = document.querySelector('[data-labels-hidden]');
        generatedContent?.data.visualPlan.panels.forEach((panel, idx) => {
            if (!panel.imageUrl) return;
            const labels = !labelsHidden ? (panel.labels || []) : [];
            setTimeout(() => {
                downloadWithLabels(panel.imageUrl, labels, `udl-visual-panel-${idx + 1}-${Date.now()}.png`);
            }, idx * 500);
        });
        addToast(t('visual_director.panels_downloaded') || `${generatedContent?.data.visualPlan.panels.length} panels downloaded!`, "success");
    } else {
        downloadWithLabels(generatedContent?.data.imageUrl, [], `udl-visual-support-${Date.now()}.png`);
        addToast(t('toasts.image_saved'), "success");
    }
  };
  const handleDeleteImage = () => {
    if (generatedContent) {
      setGeneratedContent(function(prev) { return prev ? Object.assign({}, prev, { data: Object.assign({}, prev.data, { imageUrl: null, visualPlan: null }) }) : null; });
    }
  };

  // ── Text Revision + Selection handlers ──
  const handleTextMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.toString().trim().length === 0) {
          return;
      }
      const text = selection.toString().trim();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (interactionMode === 'explain' || interactionMode === 'revise' || interactionMode === 'define' || interactionMode === 'add-glossary') {
          setSelectionMenu({
              x: rect.left + (rect.width / 2),
              y: rect.top,
              text: text
          });
      }
  };
  const handleReviseSelection = async (action, customInstruction = '') => {
      if (!selectionMenu || !selectionMenu.text) return;
      const originalText = selectionMenu.text;
      if (action === 'custom-input') {
          setIsCustomReviseOpen(true);
          return;
      }
      setSelectionMenu(null);
      setIsCustomReviseOpen(false);
      setRevisionData({
          type: action,
          original: originalText,
          result: null,
          x: selectionMenu.x,
          y: selectionMenu.y
      });
      try {
          const currentFullText = typeof generatedContent?.data === 'string' ? generatedContent?.data : '';
          const isBilingual = currentFullText.includes("--- ENGLISH TRANSLATION ---");
          if (isBilingual && (action === 'simplify' || action === 'custom')) {
               const prompt = `
                You are an expert educational editor helping a teacher revise a bilingual text.
                Goal: ${action === 'simplify' ? `Simplify the selected text for ${gradeLevel}.` : `Revise based on: "${customInstruction}".`}
                Context:
                The document contains a text in a target language and its English translation, separated by "--- ENGLISH TRANSLATION ---".
                Full Document:
                """${currentFullText}""",
                Selected Text to Revise: "${originalText}",
                Task:
                1. Identify if the "Selected Text" comes from the English section or the Target Language section.
                2. Revise the "Selected Text" according to the goal.
                3. Locate the corresponding equivalent segment in the OTHER language section.
                4. Revise that corresponding segment so it accurately reflects the changes made to the selected text (maintaining meaning and complexity alignment).
                Output JSON ONLY:
                {
                    "primaryRevision": "The revised version of the selected text",
                    "replacements": [
                        { "original": "The exact string of the selected text found in the document", "new": "The revised version" },
                        { "original": "The exact string of the corresponding segment found in the other language", "new": "The revised equivalent" }
                    ]
                }
               `;
               const jsonStr = await callGemini(prompt, true);
               try {
                   const data = JSON.parse(cleanJson(jsonStr));
                   setRevisionData(prev => ({
                       ...prev,
                       result: data.primaryRevision,
                       replacements: data.replacements
                   }));
                   return;
               } catch (jsonErr) {
                   warnLog("Bilingual revision JSON parse failed, falling back to standard revision.", jsonErr);
                   addToast(t('toasts.complex_revision_fallback'), "info");
               }
          }
          let prompt;
          const outputLang = leveledTextLanguage === 'All Selected Languages' ? 'English' : leveledTextLanguage;
          const dialectInstruction = outputLang !== 'English' ? `STRICT DIALECT ADHERENCE: If a specific dialect is named (e.g. 'Brazilian Portuguese' vs 'European Portuguese'), explicitly use that region's vocabulary, spelling, and grammar conventions.` : '';
          if (action === 'simplify') {
              prompt = `
                Simplify this specific sentence/phrase for a ${gradeLevel} student.
                Keep the meaning but make it easier to read.
                Context Topic: ${sourceTopic || "General"}.
                Text to simplify: "${originalText}",
                CRITICAL: Output the simplified text in the SAME language as the input "Text to simplify".
                ${dialectInstruction}
                Return ONLY the simplified text. No quotes or labels.
              `;
          } else if (action === 'custom') {
              prompt = `
                Revise the following text based on these instructions: "${customInstruction}",
                Text to revise: "${originalText}"
                Context Topic: ${sourceTopic || "General"}.
                Target Audience: ${gradeLevel}.
                CRITICAL: Output the revised text in the SAME language as the input "Text to revise" unless the instructions explicitly ask to translate.
                ${dialectInstruction}
                Return ONLY the revised text. No quotes, no conversational filler.
              `;
          } else {
              prompt = `
                Explain the meaning of this phrase for a ${gradeLevel} student.
                Provide a short, clear explanation or definition.
                Context Topic: ${sourceTopic || "General"}.
                Phrase: "${originalText}",
                Output Language: ${outputLang}.
                ${outputLang !== 'English' ? `Provide the explanation in ${outputLang} first. Then add a new line with "**English:**" followed by the English explanation.` : ''}
                ${dialectInstruction}
                Return ONLY the explanation.
              `;
          }
          const result = await callGemini(prompt);
          setRevisionData(prev => ({
              ...prev,
              result: result
          }));
      } catch (err) {
          warnLog("Unhandled error:", err);
          setRevisionData(null);
          addToast(t('toasts.revision_failed'), "error");
      } finally {
      }
  };
  const handleWordClick = async (rawWord, e) => {
      if (interactionMode !== 'define') return;
      e.stopPropagation();
      const word = rawWord.replace(/[^a-zA-ZÀ-ÿ0-9-\s]/g, "").trim();
      if (!word || word.length < 2) return;
      const x = e.clientX;
      const y = e.clientY;
      setDefinitionData({
          word,
          text: null,
          x,
          y
      });
      try {
          const outputLang = leveledTextLanguage === 'All Selected Languages' ? 'English' : leveledTextLanguage;
          const prompt = `
            Define the word "${word}" for a ${gradeLevel} student.
            Context Topic: ${sourceTopic || "General"}.
            Output Language: ${outputLang}.
            ${outputLang !== 'English' ? `Provide the definition in ${outputLang} first. Then add a new line with "**English:**" followed by the English definition.` : ''}
            ${outputLang !== 'English' ? `STRICT DIALECT ADHERENCE: If a specific dialect is named (e.g. 'Brazilian Portuguese'), use that region's conventions.` : ''}
            Return ONLY the definition. Keep it concise (1-2 sentences).
          `;
          const result = await callGemini(prompt);
          setDefinitionData(prev => ({
              ...prev,
              text: result
          }));
      } catch (err) {
          warnLog("Unhandled error:", err);
          setDefinitionData(null);
          addToast(t('toasts.definition_failed'), "error");
      } finally {
      }
  };
  const handlePhonicsClick = async (rawWord, e = null) => {
      const word = rawWord.replace(/[^a-zA-ZÀ-ÿ0-9-\s]/g, "").trim();
      if (!word) return;
      if (e) e.stopPropagation();
      setPhonicsData({
          word,
          data: null,
          isLoading: true,
          x: e ? e.clientX : 0,
          y: e ? e.clientY : 0
      });
      try {
          const prompt = `Analyze the English word: '${word}'. Return ONLY JSON: { "ipa": "International Phonetic Alphabet representation", "phoneticSpelling": "Simple phonetic spelling (e.g. cat -> kat)", "syllables": ["syl", "la", "bles"] }.`;
          const result = await callGemini(prompt, true);
          let data;
          try {
              data = JSON.parse(cleanJson(result));
          } catch (jsonError) {
              warnLog("Phonics JSON Parse Error:", jsonError);
              setPhonicsData(null);
              addToast(t('toasts.phonics_parse_failed'), "error");
              return;
          }
          const audioUrl = await callTTS(word, selectedVoice);
          if (audioUrl) {
              const audio = new Audio(audioUrl);
              audio.playbackRate = voiceSpeed;
              await audio.play();
          }
          setPhonicsData(prev => ({
              ...prev,
              data: data,
              audioUrl: audioUrl,
              isLoading: false
          }));
      } catch (error) {
          warnLog("Phonics Error:", error);
          addToast(t('toasts.phonics_analyze_failed'), "error");
          setPhonicsData(null);
      }
  };
  const applyTextRevision = () => {
      if (!revisionData || !revisionData.result || !generatedContent) return;
      const currentFullText = typeof generatedContent?.data === 'string' ? generatedContent?.data : '';
      let newFullText = currentFullText;
      if (revisionData.replacements && Array.isArray(revisionData.replacements)) {
          let notFoundCount = 0;
          revisionData.replacements.forEach(rep => {
              if (newFullText.includes(rep.original)) {
                  newFullText = newFullText.replace(rep.original, rep.new);
              } else {
                  notFoundCount++;
              }
          });
          if (notFoundCount === revisionData.replacements.length) {
               addToast(t('toasts.text_not_found'), "error");
               return;
          }
      } else {
          newFullText = currentFullText.replace(revisionData.original, revisionData.result);
          if (newFullText === currentFullText) {
              addToast(t('toasts.text_exact_not_found'), "error");
              return;
          }
      }
      handleSimplifiedTextChange(newFullText);
      setRevisionData(null);
      window.getSelection().removeAllRanges();
      addToast(t('toasts.text_updated'), "success");
  };
  const closeRevision = () => {
      setRevisionData(null);
      setSelectionMenu(null);
      setIsCustomReviseOpen(false);
      setCustomReviseInstruction('');
      window.getSelection().removeAllRanges();
  };
  const closeDefinition = () => setDefinitionData(null);
  const closePhonics = () => {
      if (phonicsData?.audioUrl) {
          URL.revokeObjectURL(phonicsData.audioUrl);
      }
      setPhonicsData(null);
      stopPlayback();
  };
  const handleDefineSelection = async () => {
      if (!selectionMenu || !selectionMenu.text) return;
      const word = selectionMenu.text.trim();
      const x = selectionMenu.x;
      const y = selectionMenu.y;
      setDefinitionData({
          word,
          text: null,
          x,
          y
      });
      setSelectionMenu(null);
      try {
          const outputLang = leveledTextLanguage === 'All Selected Languages' ? 'English' : leveledTextLanguage;
          const prompt = `
            Define the word or phrase "${word}" for a ${gradeLevel} student.
            Context Topic: ${sourceTopic || "General"}.
            Output Language: ${outputLang}.
            ${outputLang !== 'English' ? `Provide the definition in ${outputLang} first. Then add a new line with "**English:**" followed by the English definition.` : ''}
            ${outputLang !== 'English' ? `STRICT DIALECT ADHERENCE: If a specific dialect is named (e.g. 'Brazilian Portuguese'), use that region's conventions.` : ''}
            Return ONLY the definition. Keep it concise (1-2 sentences).
          `;
          const result = await callGemini(prompt);
          setDefinitionData(prev => ({
              ...prev,
              text: result
          }));
      } catch (err) {
          warnLog("Unhandled error:", err);
          setDefinitionData(null);
          addToast(t('toasts.definition_failed'), "error");
      } finally {
      }
  };
  const stopPlayback = () => {
    // Invalidate the current playback session so any in-flight playSequence
    // chain stops at its next iteration check
    playbackSessionRef.current = -1;
    if (audioRef.current) {
        const currentSrc = audioRef.current.src;
        audioRef.current.pause();
        audioRef.current.onended = null; // prevent chained playback
        if (currentSrc && currentSrc.startsWith('blob:')) {
             URL.revokeObjectURL(currentSrc);
             activeBlobUrlsRef.current.delete(currentSrc);
        }
        audioRef.current = null;
    }
    // Stop any Kokoro streaming queue
    if (window._kokoroTTS && window._kokoroTTS.stop) {
        try { window._kokoroTTS.stop(); } catch(e) {}
    }
    // Cancel any browser speechSynthesis
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (playbackTimeoutRef.current) {
        clearTimeout(playbackTimeoutRef.current);
        playbackTimeoutRef.current = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setPlayingContentId(null);
    setPlaybackState({ sentences: [], currentIdx: -1 });
    isPlayingRef.current = false;
    isSystemAudioActiveRef.current = false;
  };

  var _wrap = function(fn) { return function() { _bindState(); return fn.apply(this, arguments); }; };
  var _wrapAsync = function(fn) { return async function() { _bindState(); return fn.apply(this, arguments); }; };
  return {
    handleGenerateSource: _wrapAsync(handleGenerateSource),
    addLanguage: _wrap(addLanguage),
    addInterest: _wrap(addInterest),
    removeInterest: _wrap(removeInterest),
    handleInterestKeyDown: _wrap(handleInterestKeyDown),
    removeLanguage: _wrap(removeLanguage),
    handleKeyDown: _wrap(handleKeyDown),
    addConcept: _wrap(addConcept),
    removeConcept: _wrap(removeConcept),
    handleConceptKeyDown: _wrap(handleConceptKeyDown),
    handleDownloadImage: _wrap(handleDownloadImage),
    handleDeleteImage: _wrap(handleDeleteImage),
    // downloadWithLabels is internal to handleDownloadImage, not exported
    handleTextMouseUp: _wrap(handleTextMouseUp),
    handleReviseSelection: _wrapAsync(handleReviseSelection),
    handleWordClick: _wrapAsync(handleWordClick),
    handlePhonicsClick: _wrapAsync(handlePhonicsClick),
    applyTextRevision: _wrap(applyTextRevision),
    closeRevision: _wrap(closeRevision),
    closeDefinition: _wrap(closeDefinition),
    closePhonics: _wrap(closePhonics),
    handleDefineSelection: _wrapAsync(handleDefineSelection),
    stopPlayback: _wrap(stopPlayback),
  };
}; // end createContentEngine

window.AlloModules = window.AlloModules || {};
window.AlloModules.createContentEngine = createContentEngine;
window.AlloModules.ContentEngineModule = true;
console.log('[ContentEngineModule] Content engine factory registered');
