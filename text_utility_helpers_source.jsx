// text_utility_helpers_source.jsx -- Phase M of CDN modularization.
// 5 text/glossary helpers: highlightGlossaryTerms, repairGeneratedText,
// getReadableContent, generateHelpfulHint, generateWordSearch.

const highlightGlossaryTerms = (text, glossary, isCloze = false, isDarkBg = false, deps) => {
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, glossaryDefinitionLevel, wordSearchLang, creativeMode, standardsInput, targetStandards, dokLevel, alloBotRef, isLineFocusMode, clozeInstanceSet, setGeneratedContent, setHistory, setError, setIsProcessing, setGenerationStep, setHelpfulHint, setHintHistory, setClozeInstanceSet, setFoundWords, setGameData, setGameMode, setSelectedLetters, setShowWordSearchAnswers, addToast, t, warnLog, debugLog, callGemini, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, fetchTTSBytes, callTTS, playSound, handleScoreUpdate, getDefaultTitle, ClozeInput, highlightGlossaryTerms, repairGeneratedText, getReadableContent, generateHelpfulHint } = deps;
  try { if (window._DEBUG_PHASE_M) console.log("[PhaseM] highlightGlossaryTerms fired"); } catch(_) {}
      if (!glossary || glossary.length === 0 || !text) return text;
      const termMap = new Map();
      glossary.forEach(item => {
          if (item.isSelected === false) return;
          if (item.term) termMap.set(item.term.toLowerCase(), item);
          if (leveledTextLanguage !== 'English' && item.translations && item.translations[leveledTextLanguage]) {
              const transString = item.translations[leveledTextLanguage];
              if (transString.includes(':')) {
                  const possibleTerm = transString.split(':')[0].trim().toLowerCase();
                  if (possibleTerm.length > 1) termMap.set(possibleTerm, item);
              }
          }
      });
      const sortedTerms = Array.from(termMap.keys()).sort((a, b) => b.length - a.length);
      if (sortedTerms.length === 0) return text;
      const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]]/g, '$&');
      const pattern = new RegExp(`\\b(${sortedTerms.map(t => escapeRegExp(t)).join('|')})\\b`, 'gi');
      const parts = text.split(pattern);
      return parts.map((part, i) => {
           if (part == null) return part;
          const lowerPart = part.toLowerCase();
          if (termMap.has(lowerPart)) {
              const item = termMap.get(lowerPart);
              if (isCloze) {
                  const uniqueId = `cloze-${i}-${item.term}-${text.length}`;
                  return (
                      <ClozeInput
                          key={i}
                          targetWord={item.term}
                          isSolved={clozeInstanceSet.has(uniqueId)}
                          onCorrect={(word) => {
                              if (!clozeInstanceSet.has(uniqueId)) {
                                  setClozeInstanceSet(prev => {
                                      const newSet = new Set(prev);
                                      newSet.add(uniqueId);
                                      playSound('correct');
                                      const newTotalScore = newSet.size * 20;
                                      handleScoreUpdate(newTotalScore, "Cloze Activity", generatedContent.id);
                                      return newSet;
                                  });
                              }
                          }}
                      />
                  );
              }
              const lightStyle = isLineFocusMode
                ? 'text-indigo-300 border-indigo-500 hover:bg-indigo-900'
                : 'text-indigo-600 border-indigo-400 hover:bg-indigo-50';
              const darkStyle = 'text-yellow-300 border-yellow-300/50 hover:bg-white/20 font-bold';
              return (
                  <span
                    key={i}
                    role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
                    className={`relative group/tooltip cursor-help border-b border-dotted rounded px-0.5 transition-colors inline-block ${isDarkBg ? darkStyle : lightStyle}`}
                  >
                      {part}
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 text-xs rounded shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-[100] text-left leading-relaxed" style={{ color: '#ffffff' }}>
                          {/* Inline color overrides the reading-theme `* { color: inherit }`
                              cascade that would otherwise pull the term title toward the
                              container's theme color (brown, green, etc.) instead of gold.
                              Term name is sized up (text-sm vs. inherited text-xs) and
                              centered with tracking so it reads as a proper card title.
                              Definition and translation stay left-aligned — center-aligned
                              multi-line prose is harder to scan, especially for readers
                              with dyslexia. */}
                          <strong
                              className="block mb-1.5 pb-1.5 text-sm font-black text-center tracking-wide border-b border-slate-600/60"
                              style={{ color: '#fde047' }}
                          >
                              {item.term}
                          </strong>
                          {item.image && (
                              <img
                                  src={item.image}
                                  alt={item.term}
                                  className="block mb-2 w-full rounded border border-slate-600 bg-white"
                                  style={{ maxHeight: '115px', objectFit: 'contain' }}
                                  loading="lazy"
                              />
                          )}
                          <span style={{ color: '#ffffff' }}>{item.def}</span>
                          {leveledTextLanguage !== 'English' && item.translations && item.translations[leveledTextLanguage] && (
                              <span className="block mt-2 pt-2 border-t border-slate-600 italic" style={{ color: '#c7d2fe' }}>
                                  {item.translations[leveledTextLanguage]}
                              </span>
                          )}
                          <svg className="absolute text-slate-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255" xmlSpace="preserve" aria-hidden="true"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
                      </span>
                  </span>
              );
          }
          return part;
      });
};

const repairGeneratedText = async (originalText, issue, targetLength, context, preserveCitations = false, deps) => {
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, glossaryDefinitionLevel, wordSearchLang, creativeMode, standardsInput, targetStandards, dokLevel, alloBotRef, isLineFocusMode, clozeInstanceSet, setGeneratedContent, setHistory, setError, setIsProcessing, setGenerationStep, setHelpfulHint, setHintHistory, setClozeInstanceSet, setFoundWords, setGameData, setGameMode, setSelectedLetters, setShowWordSearchAnswers, addToast, t, warnLog, debugLog, callGemini, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, fetchTTSBytes, callTTS, playSound, handleScoreUpdate, getDefaultTitle, ClozeInput, highlightGlossaryTerms, repairGeneratedText, getReadableContent, generateHelpfulHint } = deps;
  try { if (window._DEBUG_PHASE_M) console.log("[PhaseM] repairGeneratedText fired"); } catch(_) {}
      debugLog(`Repairing text: ${issue} (Target: ~${targetLength} words)`);
      const citationRule = preserveCitations ? '\n                - CRITICAL: Preserve all citation markers in the format [⁽¹⁾](url). Keep them exactly as-is — do not remove, merge, or reformat them. They are important hyperlinks.' : '';

      const citationRegex = /\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\([^)]+\)/g;
      let extractedCitations = [];
      if (preserveCitations) {
          let m;
          while ((m = citationRegex.exec(originalText)) !== null) {
              const beforeSlice = originalText.substring(Math.max(0, m.index - 120), m.index);
              const afterSlice = originalText.substring(m.index + m[0].length, Math.min(originalText.length, m.index + m[0].length + 60));
              const contextWords = (beforeSlice + ' ' + afterSlice)
                  .replace(/[^\w\s]/g, ' ')
                  .split(/\s+/)
                  .filter(w => w.length >= 4)
                  .map(w => w.toLowerCase());
              extractedCitations.push({ marker: m[0], contextWords, before: beforeSlice.trim() });
          }
          if (extractedCitations.length > 0) {
              debugLog(`[CitationRecovery] Extracted ${extractedCitations.length} citations before repair`);
          }
      }

      try {
          let prompt = "";
          if (issue === 'too_short') {
              prompt = `
                You are an expert educational editor. The text below is too short.
                Task: Expand the text to approximately ${targetLength} words.
                - Add relevant examples, analogies, and descriptive details to enhance understanding.
                - Clarify complex points.
                - Maintain the reading level and tone appropriate for: ${context}.
                - Do not change the core topic.${citationRule}
                Text to Expand:
                "${originalText}",
                Return ONLY the expanded text.
              `;
          } else if (issue === 'too_long') {
              prompt = `
                You are an expert educational editor. The text below is too long.
                Task: Condense the text to approximately ${targetLength} words.
                - Remove conversational filler, redundancy, and fluff.
                - Preserve all key concepts, definitions, and facts.
                - Maintain the reading level appropriate for: ${context}.${citationRule}
                Text to Condense:
                "${originalText}",
                Return ONLY the condensed text.
              `;
          } else {
              return originalText;
          }
          let result = await callGemini(prompt);
          if (!result) return originalText;

          if (preserveCitations && extractedCitations.length > 0) {
              const survivedCount = extractedCitations.filter(c => result.includes(c.marker)).length;
              const lostCitations = extractedCitations.filter(c => !result.includes(c.marker));
              debugLog(`[CitationRecovery] ${survivedCount}/${extractedCitations.length} citations survived repair, ${lostCitations.length} lost`);

              if (lostCitations.length > 0) {
                  const sentences = (result.match(/[^.!?]*[.!?]+[\s]*/g) || [result]).map(s => s.trim()).filter(Boolean);
                  for (const lost of lostCitations) {
                      let bestIdx = -1;
                      let bestScore = 0;
                      sentences.forEach((sentence, idx) => {
                          const sentenceWords = sentence.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/);
                          const overlap = lost.contextWords.filter(w => sentenceWords.includes(w)).length;
                          if (overlap > bestScore) {
                              bestScore = overlap;
                              bestIdx = idx;
                          }
                      });
                      if (bestIdx >= 0 && bestScore >= 2) {
                          const sentence = sentences[bestIdx];
                          const punctMatch = sentence.match(/([.!?])\s*$/);
                          if (punctMatch) {
                              sentences[bestIdx] = sentence.replace(/([.!?])\s*$/, ` ${lost.marker}$1`);
                          } else {
                              sentences[bestIdx] = sentence + ' ' + lost.marker;
                          }
                          debugLog(`[CitationRecovery] Re-inserted ${lost.marker} at sentence ${bestIdx} (score: ${bestScore})`);
                      } else {
                          warnLog(`[CitationRecovery] Could not find match for ${lost.marker} (best score: ${bestScore})`);
                      }
                  }
                  result = sentences.join(' ');
              }
          }

          return result;
      } catch (e) {
          warnLog("Text Repair Failed:", e);
          return originalText;
      }
};

const generateHelpfulHint = async (type, text, shouldSpeak = false, deps) => {
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, glossaryDefinitionLevel, wordSearchLang, creativeMode, standardsInput, targetStandards, dokLevel, alloBotRef, isLineFocusMode, clozeInstanceSet, setGeneratedContent, setHistory, setError, setIsProcessing, setGenerationStep, setHelpfulHint, setHintHistory, setClozeInstanceSet, setFoundWords, setGameData, setGameMode, setSelectedLetters, setShowWordSearchAnswers, addToast, t, warnLog, debugLog, callGemini, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, fetchTTSBytes, callTTS, playSound, handleScoreUpdate, getDefaultTitle, ClozeInput, highlightGlossaryTerms, repairGeneratedText, getReadableContent, generateHelpfulHint } = deps;
  try { if (window._DEBUG_PHASE_M) console.log("[PhaseM] generateHelpfulHint fired"); } catch(_) {}
      setHelpfulHint('');
      if (!text) return;
      try {
          const snippet = text.substring(0, 300).replace(/\s+/g, ' ');
          let toolName = getDefaultTitle(type);
          if (type === 'simplified') toolName = "Adapted Text";
          let contextInstruction = `
              Focus on:
              - Classroom implementation.
              - Differentiation.
              - Student engagement.
          `;
          if (type === 'simplified') {
              contextInstruction = `
                  Focus on how to use this **adapted text** to support diverse learners (e.g., "Use this version for guided reading groups...").
                  Do NOT describe the text changes, focusing instead on the *instructional strategy*.
              `;
          } else if (type === 'glossary') {
              contextInstruction = `
                  Focus on vocabulary acquisition strategies (e.g., "Have students pair images with definitions...").
              `;
          } else if (type === 'quiz') {
              contextInstruction = `
                  Focus on formative assessment or checking for understanding (e.g., "Use this as an exit ticket...").
              `;
              contextInstruction = `
                  Focus on student engagement and narrative hooks (e.g., "Use this story starter to spark a debate...").
              `;
          } else if (type === 'analysis') {
              contextInstruction = `
                  Focus on identifying key themes, verified accuracy, and using the core concepts to frame the lesson.
              `;
          } else if (type === 'lesson-plan') {
              contextInstruction = `
                  Focus on pacing, transitions between activities, and ensuring the standards are explicitly taught.
              `;
          } else if (type === 'sentence-frames' || type === 'scaffolds') {
              contextInstruction = `
                  Focus on supporting writing structure, academic language usage, and reducing cognitive load during composition.
              `;
          } else if (type === 'brainstorm') {
              contextInstruction = `
                  Focus on student choice, fostering creativity, and connecting the topic to real-world interests.
              `;
          } else if (type === 'faq') {
              contextInstruction = `
                  Focus on anticipating student misconceptions, pre-teaching difficult concepts, and building self-efficacy.
              `;
          } else if (type === 'outline') {
              contextInstruction = `
                  Focus on visualizing text structure, chunking information, and helping students organize their thinking.
              `;
          } else if (type === 'image') {
          console.log("[handleGenerate] 🖼️ Image generation triggered!");
              contextInstruction = `
                  Focus on dual coding (combining visual and verbal information) and using visual scaffolding for retention.
              `;
          } else if (type === 'timeline') {
              contextInstruction = `
                  Focus on sequencing, understanding cause-and-effect relationships, and historical context.
              `;
          } else if (type === 'concept-sort') {
              contextInstruction = `
                  Focus on categorization, inductive reasoning, verifying understanding of definitions, and pattern recognition.
              `;
          } else if (type === 'math') {
              contextInstruction = `
                  Focus on conceptual understanding, using multiple representations (visual/concrete), and real-world application.
              `;
          } else if (type === 'persona') {
              contextInstruction = `
                  Focus on historical empathy, perspective-taking, and formulating deep inquiry questions.
              `;
          } else if (type === 'alignment-report') {
              contextInstruction = `
                  Focus on curriculum mapping, identifying gaps in instruction, and ensuring rigorous standard alignment.
              `;
          }
          const prompt = `
              You are a master teacher. Provide one single, concise (max 15-20 words) pedagogical tip for a teacher using a "${toolName}" resource about: "${snippet}...".
              ${contextInstruction}
              Example: "Use these questions as an exit ticket to quickly gauge whole-class understanding."
              Output ONLY the tip.
          `;
          const hint = await callGemini(prompt);
          setHelpfulHint(hint);
          setHintHistory(prev => [
              { id: Date.now(), text: hint, tool: toolName, timestamp: new Date() },
              ...prev
          ]);
          if (shouldSpeak && alloBotRef.current) {
               alloBotRef.current.triggerReaction('idea');
               alloBotRef.current.speak(hint);
          }
      } catch (e) {
          warnLog("Hint generation failed", e);
      }
};

const generateWordSearch = (targetLang = wordSearchLang, deps) => {
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, glossaryDefinitionLevel, wordSearchLang, creativeMode, standardsInput, targetStandards, dokLevel, alloBotRef, isLineFocusMode, clozeInstanceSet, setGeneratedContent, setHistory, setError, setIsProcessing, setGenerationStep, setHelpfulHint, setHintHistory, setClozeInstanceSet, setFoundWords, setGameData, setGameMode, setSelectedLetters, setShowWordSearchAnswers, addToast, t, warnLog, debugLog, callGemini, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, fetchTTSBytes, callTTS, playSound, handleScoreUpdate, getDefaultTitle, ClozeInput, highlightGlossaryTerms, repairGeneratedText, getReadableContent, generateHelpfulHint } = deps;
  try { if (window._DEBUG_PHASE_M) console.log("[PhaseM] generateWordSearch fired"); } catch(_) {}
      if (!generatedContent || generatedContent.type !== 'glossary') return;
      const candidates = generatedContent?.data
        .map(item => {
            let text = item.term;
            if (targetLang !== 'English' && item.translations && item.translations[targetLang]) {
                const trans = item.translations[targetLang];
                if (trans.includes(':')) {
                    text = trans.substring(0, trans.indexOf(':')).trim();
                } else {
                    text = trans;
                }
            }
            if (!text) return null;
            const clean = text.replace(/[^\p{L}\p{N}]/gu, '').toUpperCase();
            return {
                clean: clean,
                display: text.toUpperCase()
            };
        })
        .filter(item => item && item.clean.length >= 3 && item.clean.length <= 15);
      if (candidates.length === 0) {
          addToast(t('glossary.word_search_notifications.no_terms'), "error");
          return;
      }
      const size = 15;
      const grid = Array(size).fill(null).map(() => Array(size).fill(''));
      const placedWords = [];
      const solutionSet = new Set();
      const uniqueCandidates = new Map();
      const wordLocations = {};
      candidates.forEach(c => {
          if (!uniqueCandidates.has(c.clean)) uniqueCandidates.set(c.clean, c);
      });
      const sortedCandidates = Array.from(uniqueCandidates.values())
          .sort((a, b) => b.clean.length - a.clean.length)
          .slice(0, 12);
      for (const candidate of sortedCandidates) {
          const word = candidate.clean;
          let placed = false;
          let attempts = 0;
          while (!placed && attempts < 100) {
              const direction = Math.random() > 0.5 ? 'H' : 'V';
              const row = Math.floor(Math.random() * size);
              const col = Math.floor(Math.random() * size);
              let fits = true;
              if (direction === 'H') {
                  if (col + word.length > size) { attempts++; continue; }
                  for (let i = 0; i < word.length; i++) {
                      if (grid[row][col+i] !== '' && grid[row][col+i] !== word[i]) { fits = false; break; }
                  }
                  if (fits) {
                      const currentWordCoords = [];
                      for (let i = 0; i < word.length; i++) {
                          grid[row][col+i] = word[i];
                          solutionSet.add(`${row}-${col+i}`);
                          currentWordCoords.push(`${row}-${col+i}`);
                      }
                      placedWords.push(candidate.display);
                      wordLocations[candidate.display] = currentWordCoords;
                      placed = true;
                  }
              } else {
                  if (row + word.length > size) { attempts++; continue; }
                  for (let i = 0; i < word.length; i++) {
                      if (grid[row+i][col] !== '' && grid[row+i][col] !== word[i]) { fits = false; break; }
                  }
                  if (fits) {
                      const currentWordCoords = [];
                      for (let i = 0; i < word.length; i++) {
                          grid[row+i][col] = word[i];
                          solutionSet.add(`${row+i}-${col}`);
                          currentWordCoords.push(`${row+i}-${col}`);
                      }
                      placedWords.push(candidate.display);
                      wordLocations[candidate.display] = currentWordCoords;
                      placed = true;
                  }
              }
              attempts++;
          }
      }
      const charPool = candidates.map(c => c.clean).join('') || "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      for (let r=0; r<size; r++) {
          for (let c=0; c<size; c++) {
              if (grid[r][c] === '') grid[r][c] = charPool[Math.floor(Math.random() * charPool.length)];
          }
      }
      const newGameData = { grid, words: placedWords, solutions: Array.from(solutionSet), language: targetLang, wordLocations };
      setGameData(newGameData);
      setGameMode('wordsearch');
      setSelectedLetters(new Set());
      setFoundWords(new Set());
      setShowWordSearchAnswers(false);
      const updatedContent = { ...generatedContent, gameData: newGameData };
      setGeneratedContent(updatedContent);
      setHistory(prev => prev.map(item => item.id === generatedContent.id ? updatedContent : item));
      addToast(t('glossary.word_search_notifications.generated', { lang: targetLang }), "success");
};

window.AlloModules = window.AlloModules || {};
window.AlloModules.TextUtilityHelpers = {
  highlightGlossaryTerms,
  repairGeneratedText,
  generateHelpfulHint,
  generateWordSearch,
};
