(function() {
'use strict';
if (window.AlloModules && window.AlloModules.GlossaryHelpersModule) { console.log('[CDN] GlossaryHelpersModule already loaded, skipping'); return; }
// glossary_helpers_source.jsx - Phase G.1 of CDN modularization.
// applyAIConfig + handleGenerateTermEtymology lifted out of AlloFlowANTI.txt
// 2026-04-25 using the (args, deps) shim pattern.

const applyAIConfig = (config, deps) => {
  const { inputText, selectedLanguages, studentInterests, generatedContent, gradeLevel, leveledTextLanguage, setGradeLevel, setSourceTopic, setInputText, setSelectedLanguages, setLeveledTextLanguage, setStudentInterests, setLeveledTextCustomInstructions, setSourceTone, setSourceLength, setTextFormat, setDokLevel, setVisualStyle, setIncludeSourceCitations, setFullPackTargetGroup, setDifferentiationRange, setTargetStandards, setVoiceSpeed, setVoiceVolume, setSelectedVoice, setIsGeneratingEtymology, setGeneratedContent, setHistory, callGemini, warnLog, addToast, t } = deps;
  try { if (window._DEBUG_GLOSSARY) console.log("[GlossaryHelpers] applyAIConfig fired"); } catch(_) {}
    if (!config) return [];
    const changes = [];
    if (config.gradeLevel) {
      let mappedGrade = config.gradeLevel;
      const input = config.gradeLevel.toLowerCase().trim();
      if (input.includes('kinder') || input === 'k') mappedGrade = 'Kindergarten';
      else if (input.includes('1st') || input === '1') mappedGrade = '1st Grade';
      else if (input.includes('2nd') || input === '2') mappedGrade = '2nd Grade';
      else if (input.includes('3rd') || input === '3') mappedGrade = '3rd Grade';
      else if (input.includes('4th') || input === '4') mappedGrade = '4th Grade';
      else if (input.includes('5th') || input === '5') mappedGrade = '5th Grade';
      else if (input.includes('6th') || input === '6') mappedGrade = '6th Grade';
      else if (input.includes('7th') || input === '7') mappedGrade = '7th Grade';
      else if (input.includes('8th') || input === '8') mappedGrade = '8th Grade';
      else if (input.includes('9th') || input === '9') mappedGrade = '9th Grade';
      else if (input.includes('10th') || input === '10') mappedGrade = '10th Grade';
      else if (input.includes('11th') || input === '11') mappedGrade = '11th Grade';
      else if (input.includes('12th') || input === '12') mappedGrade = '12th Grade';
      else if (input.includes('college') || input.includes('univ')) mappedGrade = 'College';
      else if (input.includes('grad')) mappedGrade = 'Graduate Level';
      setGradeLevel(mappedGrade);
      changes.push(`Grade Level set to ${mappedGrade}`);
    }
    if (config.topic) {
      setSourceTopic(config.topic);
      if (!inputText || inputText.length < 50) {
          setInputText(config.topic);
      }
      changes.push(`Topic set to "${config.topic}"`);
    }
    if (config.language) {
      const lang = config.language;
      if (!selectedLanguages.includes(lang)) {
          if (selectedLanguages.length < 4) {
              setSelectedLanguages(prev => [...prev, lang]);
              changes.push(`Added ${lang} to languages`);
          }
      }
      setLeveledTextLanguage(lang);
      changes.push(`Output language set to ${lang}`);
    }
    if (config.interests) {
        if (studentInterests.length < 5 && !studentInterests.includes(config.interests)) {
            setStudentInterests(prev => [...prev, config.interests]);
            changes.push(`Added interest: "${config.interests}"`);
        } else if (studentInterests.includes(config.interests)) {
            changes.push(`Interest "${config.interests}" is already selected.`);
        } else {
            changes.push(`Could not add "${config.interests}" (Max 5 interests reached).`);
        }
    }
    if (config.customInstructions) {
      setLeveledTextCustomInstructions(config.customInstructions);
      changes.push(`Custom Instructions updated`);
    }
    if (config.tone) {
      setSourceTone(config.tone);
      changes.push(`Tone: ${config.tone}`);
    }
    if (config.length) {
      // sourceLength UI is a numeric word-count input ('250' default). Map
      // categorical values from the AI ('short' | 'standard' | 'detailed' |
      // 'exhaustive') to word counts; pass through plain numeric strings.
      const _rawLen = String(config.length).trim().toLowerCase();
      const _lenMap = { short: '150', standard: '250', medium: '250', normal: '250', detailed: '500', long: '500', exhaustive: '1000' };
      let _mappedLen = _lenMap[_rawLen];
      if (!_mappedLen) {
        const _n = parseInt(_rawLen, 10);
        if (!Number.isNaN(_n) && _n > 0) _mappedLen = String(_n);
      }
      if (_mappedLen) {
        setSourceLength(_mappedLen);
        changes.push(`Length: ~${_mappedLen} words`);
      }
    }
    if (config.format) {
      setTextFormat(config.format);
      changes.push(`Format: ${config.format}`);
    }
    if (config.dokLevel) {
      setDokLevel(config.dokLevel);
      changes.push(`DOK: ${config.dokLevel}`);
    }
    if (config.imageStyle) {
      setVisualStyle(config.imageStyle);
      changes.push(`Image Style: ${config.imageStyle}`);
    }
    if (typeof config.includeCitations === 'boolean') {
      setIncludeSourceCitations(config.includeCitations);
      changes.push(`Citations: ${config.includeCitations ? 'On' : 'Off'}`);
    }
    if (config.targetGroup) {
      setFullPackTargetGroup(config.targetGroup);
      changes.push(`Full Pack Group: ${config.targetGroup}`);
    }
    if (config.differentiationRange) {
      setDifferentiationRange(config.differentiationRange);
      changes.push(`Differentiation: ${config.differentiationRange}`);
    }
    if (config.addStandard && typeof config.addStandard === 'string') {
      const std = config.addStandard.trim();
      if (std) {
        setTargetStandards(prev => {
          const arr = Array.isArray(prev) ? prev : [];
          if (arr.includes(std)) return arr;
          return [...arr, std];
        });
        changes.push(`Added Standard: ${std}`);
      }
    }
    if (typeof config.voiceSpeed === 'number' && !Number.isNaN(config.voiceSpeed)) {
      const clampedSpeed = Math.max(0.5, Math.min(2, config.voiceSpeed));
      setVoiceSpeed(clampedSpeed);
      changes.push(`Voice Speed: ${clampedSpeed}`);
    }
    if (typeof config.voiceVolume === 'number' && !Number.isNaN(config.voiceVolume)) {
      const clampedVolume = Math.max(0, Math.min(1, config.voiceVolume));
      setVoiceVolume(clampedVolume);
      changes.push(`Voice Volume: ${clampedVolume}`);
    }
    if (config.selectedVoice && typeof config.selectedVoice === 'string') {
      setSelectedVoice(config.selectedVoice);
      changes.push(`Voice: ${config.selectedVoice}`);
    }
    return changes;
};

const handleGenerateTermEtymology = async (index, term, deps) => {
  const { inputText, selectedLanguages, studentInterests, generatedContent, gradeLevel, leveledTextLanguage, setGradeLevel, setSourceTopic, setInputText, setSelectedLanguages, setLeveledTextLanguage, setStudentInterests, setLeveledTextCustomInstructions, setSourceTone, setSourceLength, setTextFormat, setDokLevel, setVisualStyle, setIncludeSourceCitations, setFullPackTargetGroup, setDifferentiationRange, setTargetStandards, setVoiceSpeed, setVoiceVolume, setSelectedVoice, setIsGeneratingEtymology, setGeneratedContent, setHistory, callGemini, warnLog, addToast, t } = deps;
  try { if (window._DEBUG_GLOSSARY) console.log("[GlossaryHelpers] handleGenerateTermEtymology fired"); } catch(_) {}
    if (!generatedContent || generatedContent.type !== 'glossary') return;
    setIsGeneratingEtymology(prev => ({ ...prev, [index]: true }));
    const hangGuard = setTimeout(() => {
        setIsGeneratingEtymology(prev => ({ ...prev, [index]: false }));
        warnLog("Etymology hang guard tripped for:", term);
    }, 30000);
    try {
        const def = generatedContent?.data[index]?.def || "";
        const isElementary = gradeLevel && /K|1st|2nd|3rd|4th|5th/.test(gradeLevel);
        const existingTranslationLangs = Object.keys(generatedContent?.data?.[index]?.translations || {});
        const targetLanguages = Array.from(new Set(
            ['English']
                .concat(Array.isArray(selectedLanguages) ? selectedLanguages : [])
                .concat(existingTranslationLangs)
        ));
        const prompt = `
          Etymology of "${term}" (context: ${def}) for a ${gradeLevel} student.
          MANDATORY:
          (a) Name the ACTUAL root morpheme(s) — put them verbatim in the "roots" array. Do NOT just say "from Greek" without the specific morpheme.
          (b) Include brief word history when known (when/how it entered English, meaning-shift). Skip this sentence if unknown — do not invent.
          (c) Mention 1-3 related modern English words that share the root (word family).
          ${isElementary
              ? 'Use simple wording: "Comes from the Greek/Latin/Old English word X meaning Y — the same root appears in [related word]."'
              : 'Break into prefix / root / suffix where useful; name source languages; note entry-into-English date if known.'}
          ${targetLanguages.length > 1
              ? `Produce the prose in ALL of these languages: ${targetLanguages.join(', ')}. Keep root morphemes in their source-language script regardless of prose language.`
              : ''}
          If the word has no meaningful etymology (proper noun, recent coinage), return exactly: {"prosePerLanguage":{"English":"NONE"},"roots":[]}

          Return ONLY a JSON object, no markdown fences, no extra text, with exactly this shape:
          {
            "prosePerLanguage": {
              ${targetLanguages.map(L => `"${L}": "Two to four plain sentences in ${L} explaining origin + optional history + related-word family (max 400 chars)."`).join(',\n              ')}
            },
            "roots": [
              {
                "root": "photo",
                "lang": "Greek",
                "meaning": "light",
                "related": ["photograph", "photon", "photogenic"],
                "langByLocale": { ${targetLanguages.map(L => `"${L}": "origin language name in ${L}"`).join(', ')} },
                "meaningByLang":  { ${targetLanguages.map(L => `"${L}": "1-4 word meaning in ${L}"`).join(', ')} }
              }
            ]
          }
          The "roots" array should have 1-4 entries — prefixes, roots, or suffixes.
          "root" = the source-language word/morpheme (e.g. "bio", "pre-", "-ology"). Keep verbatim.
          "lang" = origin language in English (Greek / Latin / Old English / French / etc.) — kept for backward compat.
          "meaning" = the modern English meaning, 1-4 words — kept for backward compat.
          "related" = 1-3 modern English words sharing this root (optional per-root; include when genuine).
          "langByLocale" = REQUIRED. An object mapping EACH of [${targetLanguages.join(', ')}] → the origin language name rendered in THAT locale (e.g. Latin → "latin" in French, "lateinisch" in German, "латинский" in Russian, "اللاتينية" in Arabic). Use native-script, lowercase-unless-grammar-requires-caps.
          "meaningByLang" = REQUIRED. An object mapping EACH of [${targetLanguages.join(', ')}] → the 1-4 word meaning in that locale (e.g. "light" → "lumière" French, "licht" German). Keep meaning plain, no quotes.
        `;
        const raw = await callGemini(prompt, true);
        const stripped = (raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        let etymologyByLang = {};
        let roots = [];
        try {
            const parsed = JSON.parse(stripped);
            if (parsed && parsed.prosePerLanguage && typeof parsed.prosePerLanguage === 'object') {
                Object.keys(parsed.prosePerLanguage).forEach(lang => {
                    const val = parsed.prosePerLanguage[lang];
                    if (typeof val === 'string' && val.trim()) {
                        const cleaned = val.trim().length > 600 ? val.trim().substring(0, 597) + '…' : val.trim();
                        etymologyByLang[lang] = cleaned;
                    }
                });
            } else if (parsed && typeof parsed.prose === 'string') {
                etymologyByLang['English'] = parsed.prose.trim();
            }
            if (parsed && Array.isArray(parsed.roots)) {
                roots = parsed.roots
                    .filter(r => r && typeof r.root === 'string' && r.root.trim())
                    .slice(0, 4)
                    .map(r => {
                        const related = Array.isArray(r.related)
                            ? r.related
                                .filter(w => typeof w === 'string' && w.trim())
                                .map(w => String(w).trim().slice(0, 40))
                                .slice(0, 3)
                            : [];
                        const normalizeLocaleMap = (obj) => {
                            if (!obj || typeof obj !== 'object') return undefined;
                            const out = {};
                            Object.keys(obj).forEach(k => {
                                const v = obj[k];
                                if (typeof v === 'string' && v.trim()) out[k] = v.trim().slice(0, 60);
                            });
                            return Object.keys(out).length > 0 ? out : undefined;
                        };
                        return {
                            root: String(r.root).trim().slice(0, 40),
                            lang: String(r.lang || '').trim().slice(0, 30),
                            meaning: String(r.meaning || '').trim().slice(0, 60),
                            related: related.length > 0 ? related : undefined,
                            langByLocale: normalizeLocaleMap(r.langByLocale),
                            meaningByLang: normalizeLocaleMap(r.meaningByLang),
                        };
                    });
            }
        } catch (parseErr) {
            warnLog('Etymology JSON parse failed — falling back to raw prose:', parseErr?.message, 'raw response preview:', (stripped || '').substring(0, 200));
            etymologyByLang['English'] = stripped;
        }
        const primaryProse = etymologyByLang[leveledTextLanguage] || etymologyByLang['English']
            || etymologyByLang[Object.keys(etymologyByLang)[0]] || '';
        if (!primaryProse || primaryProse === 'NONE') {
            addToast(t('glossary.actions.etymology_none') || "No useful etymology for this term.", "info");
            return;
        }
        setGeneratedContent(prev => {
            if (!prev || prev.type !== 'glossary' || !Array.isArray(prev.data)) return prev;
            const liveIdx = prev.data.findIndex(d => d && d.term === term);
            if (liveIdx === -1) {
                warnLog("Term no longer exists, discarding etymology for:", term);
                return prev;
            }
            const newData = [...prev.data];
            newData[liveIdx] = {
                ...newData[liveIdx],
                etymology: primaryProse, // legacy single-string field
                etymologyByLang, // new per-language map
                roots: roots.length ? roots : undefined,
            };
            const updated = { ...prev, data: newData };
            setHistory(h => h.map(item => item.id === prev.id ? updated : item));
            return updated;
        });
        addToast(t('glossary.actions.etymology_generated') || "Word roots added.", "success");
    } catch (e) {
        warnLog("Etymology generation failed:", e);
        addToast(t('glossary.actions.etymology_failed') || "Couldn't generate word roots right now.", "error");
    } finally {
        clearTimeout(hangGuard);
        setIsGeneratingEtymology(prev => ({ ...prev, [index]: false }));
    }
};

window.AlloModules = window.AlloModules || {};
window.AlloModules.GlossaryHelpers = {
  applyAIConfig,
  handleGenerateTermEtymology,
};

window.AlloModules.GlossaryHelpersModule = true;
console.log('[GlossaryHelpers] 2 helpers registered (applyAIConfig + handleGenerateTermEtymology)');
})();
