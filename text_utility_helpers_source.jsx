// text_utility_helpers_source.jsx -- Phase M of CDN modularization.
// 5 text/glossary helpers: highlightGlossaryTerms, repairGeneratedText,
// getReadableContent, generateHelpfulHint, generateWordSearch.

// Glossary term with its definition/picture tooltip. The tooltip renders
// through a portal to document.body with position:fixed because the term can
// sit inside containers that defeat an absolutely-positioned child tooltip:
// line-focus mode wraps paragraphs in scale()/blur()/opacity effects (which
// trap z-index in a local stacking context and dim/blur descendants), the
// immersive reader is a z-[200] overlay that painted over the old z-[100]
// inline tooltip, and scroll containers clip whatever overflows them.
// zIndex 300 clears the immersive reader (200) and its lifted popups (220).
let _glossaryTipSeq = 0;
const GlossaryTermSpan = ({ item, leveledTextLanguage, isDarkBg, isLineFocusMode, children }) => {
  const [tip, setTip] = React.useState(null);
  const tipIdRef = React.useRef(null);
  if (!tipIdRef.current) tipIdRef.current = `allo-glossary-tip-${++_glossaryTipSeq}`;
  const show = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = 256; // matches w-64
    const margin = 8;
    const centerX = rect.left + rect.width / 2;
    const left = Math.max(margin, Math.min(centerX - width / 2, window.innerWidth - width - margin));
    // Flip below the term when there isn't room for title+picture+definition above.
    const placeAbove = rect.top > 320;
    setTip({ left, top: placeAbove ? rect.top - 10 : rect.bottom + 10, placeAbove });
  };
  const hide = () => setTip(null);
  React.useEffect(() => {
    if (!tip) return undefined;
    const close = () => setTip(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [!!tip]);
  const lightStyle = isLineFocusMode
    ? 'text-indigo-300 border-indigo-500 hover:bg-indigo-900'
    : 'text-indigo-600 border-indigo-400 hover:bg-indigo-50';
  const darkStyle = 'text-yellow-300 border-yellow-300/50 hover:bg-white/20 font-bold';
  const canPortal = typeof ReactDOM !== 'undefined' && ReactDOM.createPortal && typeof document !== 'undefined';
  return (
    <span
      // This used to be `e.stopPropagation()` — nothing else. The tooltip is
      // driven by hover/focus, so the handler existed ONLY to swallow the
      // click, and in Adapted Text the swallowed ancestor is the sentence's
      // read-aloud span: tapping any glossary term did nothing at all, no
      // request, no console error, while tapping a plain word two characters
      // away read the sentence. That is the "sometimes it works" report
      // (2026-08-14), and it scales with the glossary — a passage with no
      // terms never showed it. Same span is used by FAQ, Adventure and
      // Persona, all of which read from the sentence ancestor too.
      // Show on click as well so a touch tap gets the definition even where
      // focus does not follow the tap, then let the click through.
      onClick={show}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={(e) => { if (e.key === 'Escape') hide(); }}
      tabIndex={0}
      aria-describedby={tip ? tipIdRef.current : undefined}
      // allo-glossary-term is a stable hook for the reading themes. isDarkBg is
      // a prop that NO call site in the simplified view ever passes, so this
      // span always rendered indigo-600 — 2.71:1 on the dark theme, 3.34:1 on
      // high contrast, 2.98:1 on dim. Rather than thread the flag through six
      // call sites, the themes restyle it via --allo-rt-link.
      className={`allo-glossary-term cursor-help border-b border-dotted rounded px-0.5 transition-colors inline-block ${isDarkBg ? darkStyle : lightStyle}`}
    >
      {children}
      {tip && canPortal && ReactDOM.createPortal(
        <span
          id={tipIdRef.current}
          role="tooltip"
          className="fixed block w-64 p-3 bg-slate-800 text-xs rounded shadow-xl pointer-events-none text-left leading-relaxed"
          style={{
            left: tip.left + 'px',
            top: tip.top + 'px',
            transform: tip.placeAbove ? 'translateY(-100%)' : 'none',
            zIndex: 300,
            color: '#ffffff'
          }}
        >
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
          <svg
              className="absolute text-slate-800 h-2 w-full left-0"
              style={tip.placeAbove ? { top: '100%' } : { bottom: '100%', transform: 'scaleY(-1)' }}
              x="0px" y="0px" viewBox="0 0 255 255" xmlSpace="preserve" aria-hidden="true"
          ><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
        </span>,
        document.body
      )}
    </span>
  );
};

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
      // '$&' is the MATCHED TEXT — the old version replaced each metacharacter
      // with itself, so this escaped nothing. A term like "C++" went into the
      // pattern raw.
      const escapeRegExp = (string) => String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // \b is ASCII-only in JS: it treats every non-Latin character as a
      // non-word char, so `\bмозг\b` never matched and NO blanks were created
      // at all for Russian, Arabic, Chinese, Greek… Cloze silently did nothing
      // in those languages.
      //
      // Latin/Cyrillic/Greek/Arabic separate words with spaces, so they need a
      // Unicode-aware boundary to avoid matching inside a longer word. CJK and
      // Thai are written without word separators — a boundary assertion there
      // would reject every legitimate match — so those terms match as plain
      // substrings.
      const NO_WORD_BREAK = /[぀-ヿ㐀-䶿一-鿿豈-﫿฀-๿]/;
      const boundaried = [];
      const substringy = [];
      sortedTerms.forEach((term) => {
        (NO_WORD_BREAK.test(term) ? substringy : boundaried).push(escapeRegExp(term));
      });
      const buildPattern = () => {
        const branches = [];
        if (boundaried.length) branches.push(`(?<![\\p{L}\\p{N}])(?:${boundaried.join('|')})(?![\\p{L}\\p{N}])`);
        if (substringy.length) branches.push(`(?:${substringy.join('|')})`);
        return new RegExp(`(${branches.join('|')})`, 'giu');
      };
      let pattern;
      try {
        pattern = buildPattern();
      } catch (_) {
        // Lookbehind is unavailable on some older engines — fall back to the
        // ASCII boundary rather than crashing the whole passage render.
        pattern = new RegExp(`\\b(${sortedTerms.map(t => escapeRegExp(t)).join('|')})\\b`, 'gi');
      }
      const parts = text.split(pattern);
      return parts.map((part, i) => {
           if (part == null) return part;
          const lowerPart = part.toLowerCase();
          if (termMap.has(lowerPart)) {
              const item = termMap.get(lowerPart);
              if (isCloze) {
                  const uniqueId = `cloze-${i}-${item.term}-${text.length}`;
                  // The bank may offer the term in the passage's language while
                  // the glossary's canonical term is English. Accept EITHER, or
                  // dragging the correct chip is rejected: the bank showed
                  // "célula" and the blank was still checking against "cell".
                  const _translated = (() => {
                    if (leveledTextLanguage === 'English') return '';
                    const tr = item.translations && item.translations[leveledTextLanguage];
                    if (!tr) return '';
                    return String(tr).includes(':') ? String(tr).split(':')[0].trim() : String(tr).trim();
                  })();
                  return (
                      <ClozeInput
                          key={i}
                          targetWord={item.term}
                          acceptedAnswers={_translated ? [item.term, _translated] : [item.term]}
                          displayWord={_translated || item.term}
                          // The exact text this blank replaced. `displayWord` is
                          // inferred from the lesson language and is wrong for any
                          // occurrence that does not match it — an English term
                          // still sitting in a Spanish passage got replaced by the
                          // Spanish one on solve. `part` is the ground truth.
                          passageWord={part}
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
              return (
                  <GlossaryTermSpan
                    key={i}
                    item={item}
                    leveledTextLanguage={leveledTextLanguage}
                    isDarkBg={isDarkBg}
                    isLineFocusMode={isLineFocusMode}
                  >
                      {part}
                  </GlossaryTermSpan>
              );
          }
          return part;
      });
};
const _extractRepairCitationMarkers = (value) => {
    const text = String(value || '');
    const markers = [];
    const readBalanced = (line, start, openChar, closeChar) => {
        if (line[start] !== openChar) return null;
        let depth = 0;
        let escaped = false;
        for (let i = start; i < line.length; i++) {
            const ch = line[i];
            if (escaped) {
                escaped = false;
                continue;
            }
            if (ch === '\\') {
                escaped = true;
                continue;
            }
            if (ch === openChar) depth++;
            else if (ch === closeChar && --depth === 0) {
                return { end: i + 1, content: line.slice(start + 1, i) };
            }
        }
        return null;
    };
    const pieces = text.split(/(\r\n|\n|\r)/);
    let inFence = false;
    let fenceChar = '';
    let fenceLength = 0;
    for (let pieceIndex = 0; pieceIndex < pieces.length; pieceIndex += 2) {
        const line = pieces[pieceIndex] || '';
        const fence = line.match(/^[ \t]{0,3}(`{3,}|~{3,})(.*)$/);
        if (inFence) {
            if (fence && fence[1][0] === fenceChar && fence[1].length >= fenceLength && !fence[2].trim()) {
                inFence = false;
                fenceChar = '';
                fenceLength = 0;
            }
            continue;
        }
        if (fence) {
            inFence = true;
            fenceChar = fence[1][0];
            fenceLength = fence[1].length;
            continue;
        }
        for (let cursor = 0; cursor < line.length;) {
            const start = line.indexOf('[', cursor);
            if (start < 0) break;
            const label = readBalanced(line, start, '[', ']');
            if (!label || line[label.end] !== '(' ||
                !/^\u207d[\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079]+\u207e$/.test(label.content)) {
                cursor = start + 1;
                continue;
            }
            const destination = readBalanced(line, label.end, '(', ')');
            if (!destination) {
                cursor = start + 1;
                continue;
            }
            markers.push(line.slice(start, destination.end));
            cursor = destination.end;
        }
    }
    return markers;
};


const repairGeneratedText = async (originalText, issue, targetLength, context, preserveCitations = false, deps) => {
  const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, glossaryDefinitionLevel, wordSearchLang, creativeMode, standardsInput, targetStandards, dokLevel, alloBotRef, isLineFocusMode, clozeInstanceSet, setGeneratedContent, setHistory, setError, setIsProcessing, setGenerationStep, setHelpfulHint, setHintHistory, setClozeInstanceSet, setFoundWords, setGameData, setGameMode, setSelectedLetters, setShowWordSearchAnswers, addToast, t, warnLog, debugLog, callGemini, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, fetchTTSBytes, callTTS, playSound, handleScoreUpdate, getDefaultTitle, ClozeInput, highlightGlossaryTerms, repairGeneratedText, getReadableContent, generateHelpfulHint } = deps;
  try { if (window._DEBUG_PHASE_M) console.log("[PhaseM] repairGeneratedText fired"); } catch(_) {}
      debugLog(`Repairing text: ${issue} (Target: ~${targetLength} words)`);
      const citationRule = preserveCitations ? '\n                - CRITICAL: Preserve all citation markers in the format [⁽¹⁾](url). Keep them exactly as-is — do not remove, merge, or reformat them. They are important hyperlinks.' : '';

      const citationRegex = /\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\([^)]+\)/g;
      const originalCitationSequence = preserveCitations ? _extractRepairCitationMarkers(originalText) : [];
      if (originalCitationSequence.length > 0) {
          debugLog(`[CitationIntegrity] Extracted ${originalCitationSequence.length} citation occurrence(s) before repair`);
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

          if (preserveCitations) {
              const repairedSequence = _extractRepairCitationMarkers(result);
              const preservedExactly = originalCitationSequence.length === repairedSequence.length
                  && originalCitationSequence.every((marker, index) => marker === repairedSequence[index]);
              if (!preservedExactly) {
                  warnLog(`[CitationIntegrity] Repair changed, removed, reordered, or duplicated citations; retaining the original text.`);
                  return originalText;
              }
              debugLog(`[CitationIntegrity] ${originalCitationSequence.length} citation occurrence(s) preserved exactly through repair`);
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

// ── TEMPORARY device-storage probe bootstrap (2026-07-13) ──────────────
// Rides this module only because it is already in every surface's loadModule
// list and Cloudflare Pages serves current content for existing module URLs —
// so this reaches the Canvas app on its next reload without republishing the
// monolith. Remove once allo_device_storage_module.js gets its own loadModule
// line. Ctrl+Alt+Shift+D (or window.__alloOpenDeviceStorageProbe()) lazy-loads
// the device-storage module from the CDN and opens its on-screen probe panel.
try {
  if (typeof document !== 'undefined' && !window.__alloDeviceStorageProbeArmed) {
    window.__alloDeviceStorageProbeArmed = true;
    const openDeviceStorageProbe = () => {
      const ready = () => {
        try { window.alloDeviceStorage.__openProbePanel(); }
        catch (e) { console.warn('[DeviceStorage] probe panel failed:', e); }
      };
      if (window.alloDeviceStorage) { ready(); return; }
      const s = document.createElement('script');
      s.src = 'https://alloflow-cdn.pages.dev/allo_device_storage_module.js?v=' + Date.now();
      s.onload = () => {
        // Pages answers missing files with its SPA index as an HTML 200
        // (the lame.min.js lesson) — verify the global actually appeared.
        if (window.alloDeviceStorage) ready();
        else console.warn('[DeviceStorage] module URL answered but global missing (CDN miss?)');
      };
      s.onerror = () => console.warn('[DeviceStorage] failed to load module from CDN');
      document.head.appendChild(s);
    };
    window.__alloOpenDeviceStorageProbe = openDeviceStorageProbe;
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.altKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        openDeviceStorageProbe();
      }
    });
  }
} catch (_) {}
