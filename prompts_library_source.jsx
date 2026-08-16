// prompts_library_source.jsx — Pure prompt-builder CDN module for AlloFlow.
// Extracted from AlloFlowANTI.txt 2026-04-24 (Phase A of CDN modularization).
//
// Contains three pure functions that build long-form Gemini prompts for the
// content-generation pipeline:
//   - buildLessonPlanPrompt — UDL-aligned scripted lesson plan
//   - buildParentGuidePrompt — family-friendly home-learning guide
//   - buildStudyGuidePrompt — student-facing study guide
//
// Design: each function takes an OPTIONS OBJECT (not positional args) so
// AlloFlowANTI.txt's existing positional-arg shims can pass closure-captured
// gradeLevel + sourceTopic explicitly without changing every callsite.
//
// Closure dependencies on the monolith side:
//   - gradeLevel   (React state — passed at call time)
//   - sourceTopic  (React state — passed at call time)
//   - STEM_TOOL_REGISTRY  (window global — passed at factory creation time)

const createPromptsLibrary = ({ STEM_TOOL_REGISTRY } = {}) => {
  // Default to empty array if not provided so the JSON.stringify in
  // buildLessonPlanPrompt produces "[]" rather than throwing.
  const stemToolRegistry = Array.isArray(STEM_TOOL_REGISTRY) ? STEM_TOOL_REGISTRY : [];

  // ── STEM tool catalog for the lesson-plan prompt ────────────────────────
  // Two problems this replaces:
  //   1. The old payload was {id,name,subjects,tags} for EVERY tool — names
  //      without capabilities, and `subjects` fell through to a generic
  //      'STEM' for 39% of tools. The model was asked to match tools to a
  //      lesson while being told almost nothing about what they do.
  //   2. STEM_TOOL_REGISTRY is populated by registerTool, which only runs
  //      once the STEM plugins load ON DEMAND. A teacher who never opened
  //      the STEAM Lab got an EMPTY list and silently lost every
  //      recommendation.
  // tool_index.json is built at build time (dev-tools/build_tool_index.cjs)
  // from each tool's own self-description, so it is complete regardless of
  // load state — and it is RANKED AND CAPPED here rather than dumped, which
  // keeps the prompt smaller than the old one while carrying far more signal.
  // Tool SOURCE never enters this path; a single tool file can exceed 2 MB.
  const TOOL_CATALOG_LIMIT = 24;
  let toolIndex = null;
  const readToolIndex = () => {
    if (toolIndex) return toolIndex;
    try {
      if (typeof window !== 'undefined' && window.ALLO_TOOL_INDEX && Array.isArray(window.ALLO_TOOL_INDEX.tools)) {
        toolIndex = window.ALLO_TOOL_INDEX.tools;
      }
    } catch (_) { /* fall through to the registry */ }
    return toolIndex;
  };
  const STOPISH = /^(the|and|for|with|from|that|this|about|into|your|their|what|when|how|why|a|an|of|to|in|on|is|are|it|as)$/i;
  const selectStemTools = (topic, gradeLevel) => {
    const idx = readToolIndex();
    // No index available (older build, fetch failed): fall back to the registry
    // payload. Read the global LIVE rather than using `stemToolRegistry` — this
    // factory auto-instantiates when the module loads, which is BEFORE the STEM
    // plugins load on demand, so the constructor-time snapshot is an empty array
    // for the life of the page. That snapshot is why lesson plans have been
    // shipping an empty tool list; reading live at least degrades to real data
    // once a user has opened the STEAM Lab.
    if (!idx || !idx.length) {
      let live = stemToolRegistry;
      try {
        if (typeof window !== 'undefined' && Array.isArray(window.STEM_TOOL_REGISTRY) && window.STEM_TOOL_REGISTRY.length) {
          live = window.STEM_TOOL_REGISTRY;
        }
      } catch (_) { /* keep the snapshot */ }
      return live.map((t) => ({ id: t.id, name: t.name, subjects: t.subjects, tags: t.tags }));
    }
    const terms = String(topic || '').toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) || [];
    const query = terms.filter((w) => !STOPISH.test(w));
    const scored = idx.map((t) => {
      const hayTop = ((t.label || '') + ' ' + (t.topics || []).join(' ')).toLowerCase();
      const hayAll = hayTop + ' ' + ((t.desc || '') + ' ' + (t.keywords || []).join(' ') + ' ' + (t.section || '')).toLowerCase();
      let score = 0;
      for (const w of query) {
        if (hayTop.indexOf(w) !== -1) score += 3;      // title/heading hit weighs most
        else if (hayAll.indexOf(w) !== -1) score += 1;
      }
      return { t: t, score: score };
    });
    scored.sort((a, b) => b.score - a.score || a.t.id.localeCompare(b.t.id));
    // With no usable topic every score is 0; the slice still yields a stable,
    // bounded sample instead of the whole catalog.
    return scored.slice(0, TOOL_CATALOG_LIMIT).map((s) => ({
      id: s.t.id,
      name: s.t.label,
      section: s.t.section || undefined,
      // The tool's OWN description, trimmed — this is the part that was
      // missing entirely, and it is what lets the model match on capability.
      about: String(s.t.desc || '').slice(0, 200),
      covers: (s.t.topics || []).slice(0, 6)
    }));
  };

  // Translation policy, resolved by the HOST and passed in. These three
  // builders are reached from two different entry points (the sidebar button
  // via concept_map_handlers, and Full Pack via the dispatcher) which used to
  // disagree about which language variable to send. Taking the resolved policy
  // as a parameter means neither entry point can re-derive it differently.
  // A missing policy reproduces the historical behaviour: gloss into English
  // whenever the content is not English.
  const _xlateFor = (policy, language) => {
    if (policy && typeof policy === 'object') return policy;
    const lang = String(language == null ? '' : language).trim();
    const on = !!lang && lang !== 'English' && lang !== 'All Selected Languages';
    return { enabled: on, target: on ? 'English' : '', mode: 'auto' };
  };

  const buildLessonPlanPrompt = ({ context, assetManifest, language, customAdditions, gradeLevel, sourceTopic, translationPolicy }) => {
    const _x = _xlateFor(translationPolicy, language);
    const hasCustom = customAdditions && customAdditions.trim().length > 0;
    const extensionInstruction = hasCustom
      ? `USER CUSTOM REQUESTS: "${customAdditions}"\nTASK: Generate 3 specific, actionable lesson extensions/activities STRICTLY based on these requests. Do not generate unrelated generic ideas. If the request is singular, break it down into 3 distinct variations or steps.`
      : `TASK: Generate 3 distinct, creative UDL Lesson Extensions (e.g. interdisciplinary connections, real-world projects, digital creation).`;
    return `
        You are an expert UDL Curriculum Designer and Master Teacher.
        Create a detailed, scripted UDL-Aligned Lesson Plan based on the following context.
        ${context}
        ${assetManifest || "No specific asset inventory provided."}
        Target Grade: ${gradeLevel}
        Topic: "${sourceTopic || "General"}"
        Language: ${language}
        CRITICAL INSTRUCTION: THE DYNAMIC MANIFEST & DIGITAL CONTEXT
        1. Do NOT write generic instructions like "Give students a quiz."
        2. Instead, you MUST reference the exact titles from the Asset Inventory.
           Example: "Direct students to the 'Water Cycle Diagram' [Image]..."
        3. **DYNAMIC LINKING:** When you mention a specific resource from the Inventory, you MUST create a clickable link using the ID provided in the manifest.
           Format: [Resource Title](resource:THE_ID_HERE)
           Example: "Start the class by displaying the [Water Cycle Diagram](resource:12345)..."
        4. **MEDIUM NEUTRALITY:** Assume the teacher might be projecting this on a screen, sharing links, OR printing it.
           - **DO NOT** assume physical materials unless it's a specific hands-on craft.
           - **AVOID** phrases like "cut out strips," "glue to paper," "hand out copies," or "shuffle physical cards" when referring to digital tools (Timeline, Concept Sort, etc.).
           - **USE** neutral verbs like "Display," "Assign," "Review," "Complete," "Solve," or "Analyze."
        REQUIREMENTS:
        1. **Materials Needed:** A comprehensive checklist. You MUST explicitly list every specific resource found in the "Asset Inventory" provided above (e.g., "Leveled Text", "Concept Sort Activity", "Visual Diagram"). Also include standard classroom supplies (pencils, paper, devices).
        2. Learning Objectives (SWBAT): Specific, measurable, aligned with the target standards provided.
        3. Essential Question: A provocative, open-ended question to guide inquiry.
        4. "Hook" Activity: An engaging opening script (2-3 mins). **Explicitly reference** the "Visual Support" or "Adventure Mode" if available in context.
        5. Direct Instruction Script (Mini-Lesson): A DETAILED, STEP-BY-STEP SCRIPT (10-15 mins).
           - Include specific dialogue for the teacher (using labels like "Teacher says:" translated into ${language}).
           - Break down the core concept clearly using analogies appropriate for ${gradeLevel}.
           - Include specific "Check for Understanding" questions to ask the class, along with expected student responses.
           - Highlight specific vocabulary from the Glossary.
           - **Explicitly instruct the teacher to use** the "Leveled Text" and "Glossary" provided as part of the instruction.
        6. Guided Practice: An interactive group activity script. **Explicitly reference** the "Sequence Builder", "Concept Sort", or "Gamified Review" (Quiz) if available. Explain exactly how to facilitate it.
        7. Independent Practice: Instructions for individual work. **Explicitly reference** the "Writing Scaffolds" or "Worksheets" (Leveled Text) if available.
        8. Closure & Assessment: A closing discussion script. **Explicitly reference** the "Exit Ticket" (Quiz) provided.
        9. EXTENSIONS:
           ${extensionInstruction}
        10. STEAM Lab Tools (if applicable):
           Review these interactive STEAM Lab simulation tools and recommend 1-3 that align with this lesson's learning objectives:
           ${JSON.stringify(selectStemTools(sourceTopic, gradeLevel))}
           If any tools are relevant, include a "recommendedStemTools" array in the output JSON. Each entry should have: id (tool ID), rationale (1 sentence tied to a learning objective), and suggestedActivity (short activity description).
           If no tools are relevant, omit the field entirely.
        INSTRUCTION:
        For every section of the lesson plan (except extensions), check the CONTEXT provided. If a generated resource exists for that section, specifically name it and explain how to use it.
        ${_x.enabled ? `
        BILINGUAL FORMATTING RULES (CRITICAL):
        The delimiter text "--- ENGLISH TRANSLATION ---" is a FIXED MACHINE MARKER. Use it verbatim
        even though the translation below it is in ${_x.target}. Do not rename or translate the marker.
        1. For "essentialQuestion", "hook", "directInstruction", "guidedPractice", "independentPractice", "closure":
           - Write the content in ${language} FIRST.
           - Add a new line with exactly: "--- ENGLISH TRANSLATION ---"
           - Write the ${_x.target} translation below it.
        2. For "objectives" AND "materialsNeeded" (Arrays):
           - Each item in the array must be a single string containing BOTH languages separated by the delimiter.
           - Format: "${language} Text... --- ENGLISH TRANSLATION --- ${_x.target} Text..."
        3. For "extensions" (Array of Objects):
           - "title": "${language} Title --- ENGLISH TRANSLATION --- ${_x.target} Title"
           - "description": "${language} Description... --- ENGLISH TRANSLATION --- ${_x.target} Description..."
        ` : `
        SINGLE LANGUAGE OUTPUT: write every field in ${language} only. Do NOT add a translation
        into any other language, and do NOT emit the "--- ENGLISH TRANSLATION ---" delimiter.
        `}
        NEGATIVE CONSTRAINTS:
        - Do NOT include "Note:" or meta-commentary about the user's request (e.g. "Since the user requested None...").
        - Do NOT summarize what you are doing. Just provide the content.
        - **DO NOT** mention scissors, glue, or physical cutting for digital assets like Timelines or Concept Sorts.
        FORMAT:
        Return ONLY JSON with this structure:
        {
            "materialsNeeded": ["..."],
            "objectives": ["..."],
            "essentialQuestion": "...",
            "hook": "...",
            "directInstruction": "...",
            "guidedPractice": "...",
            "independentPractice": "...",
            "closure": "...",
            "extensions": [
                { "title": "Title of Activity", "description": "Description of activity..." },
                { "title": "Title of Activity", "description": "Description of activity..." },
                { "title": "Title of Activity", "description": "Description of activity..." }
            ],
            "recommendedStemTools": [
                { "id": "toolId", "rationale": "Why this tool helps", "suggestedActivity": "What to do with it" }
            ]
        }
      `;
  };

  const buildParentGuidePrompt = ({ context, language, gradeLevel, sourceTopic, customAdditions, translationPolicy }) => {
    const _x = _xlateFor(translationPolicy, language);
    // customAdditions added 2026-07-28: the Lesson Plan panel's instructions box
    // is one field, but only the default mode's builder read it, so the same box
    // silently did nothing once a teacher switched to Family or Study Guide.
    const hasCustom = customAdditions && customAdditions.trim().length > 0;
    return `
        You are a friendly, encouraging Family Tutor helping a parent support their child's learning at home.
        Create a simple "Family Learning Guide" based on the following context.
        ${context}
        Target Grade: ${gradeLevel}
        Topic: "${sourceTopic || "General"}"
        Language: ${language}
        ${hasCustom ? `TEACHER REQUESTS: "${customAdditions}" — honour these while keeping the family-friendly tone.` : ''}
        INSTRUCTIONS:
        Translate complex educational jargon into simple, fun, everyday language for a parent.
        The goal is to foster connection and curiosity, not just drill facts.
        ${_x.enabled ? `
        BILINGUAL FORMATTING RULES (CRITICAL):
        1. For "essentialQuestion", "hook", "directInstruction", "guidedPractice", "independentPractice", "closure":
           - Write the content in ${language} FIRST.
           - Add a new line with exactly: "--- ENGLISH TRANSLATION ---"
           - Write the ${_x.target} translation below it.
        2. For "objectives" (Array):
           - Each item in the array must be a single string containing BOTH languages separated by the delimiter.
           - Format: "${language} Objective text... --- ENGLISH TRANSLATION --- ${_x.target} Objective text..."
        ` : ''}
        MAPPING REQUIREMENTS (You MUST use these exact JSON keys to fit the app structure, but write content for parents):
        1. "objectives": List 2-3 simple bullet points on "What your child is learning today".
        2. "essentialQuestion": Provide 1 "Fun Starter Question" to ask in the car or at the start.
        3. "hook": A "Quick Activity (2 mins)" - something silly or hands-on to grab attention.
        4. "directInstruction": "The Kitchen Table Script" - A very simple, conversational way for the parent to explain the concept. Use analogies (e.g. baking, sports, LEGOs).
        5. "guidedPractice": "Activity to do Together" - A game or interaction. **Explicitly reference** any generated games (Bingo, Memory, Sort) if in context.
        6. "independentPractice": "Challenge for the Child" - A fun task for them to show off what they know.
        7. "closure": "Dinner Table Reflection" - One question to ask later to see if it stuck.
        FORMAT:
        Return ONLY JSON with this structure:
        {
            "objectives": ["..."],
            "essentialQuestion": "...",
            "hook": "...",
            "directInstruction": "...",
            "guidedPractice": "...",
            "independentPractice": "...",
            "closure": "..."
        }
      `;
  };

  const buildStudyGuidePrompt = ({ context, language, gradeLevel, sourceTopic, customAdditions, translationPolicy }) => {
    const _x = _xlateFor(translationPolicy, language);
    // See buildParentGuidePrompt — same one-field/three-builders gap.
    const hasCustom = customAdditions && customAdditions.trim().length > 0;
    return `
        You are a supportive Study Tutor creating a personal study guide for a student.
        ${context}
        Target Grade: ${gradeLevel}
        Topic: "${sourceTopic || "General"}"
        Language: ${language}
        ${hasCustom ? `TEACHER REQUESTS: "${customAdditions}" — honour these while keeping the student-facing tone.` : ''}
        INSTRUCTIONS:
        - Write directly to the student using "You".
        - Keep the tone encouraging, clear, and structured.
        - Focus on what they need to know for a test or project.
        ${_x.enabled ? `
        BILINGUAL FORMATTING RULES (CRITICAL):
        1. For "essentialQuestion", "hook", "directInstruction", "guidedPractice", "independentPractice", "closure":
           - Write the content in ${language} FIRST.
           - Add a new line with exactly: "--- ENGLISH TRANSLATION ---"
           - Write the ${_x.target} translation below it.
        2. For "objectives" (Array):
           - Each item in the array must be a single string containing BOTH languages separated by the delimiter.
           - Format: "${language} Objective text... --- ENGLISH TRANSLATION --- ${_x.target} Objective text..."
        ` : ''}
        MAPPING REQUIREMENTS (You MUST use these exact JSON keys to fit the app structure, but the content should match the new section titles):
        1. "objectives": List 2-3 bullet points on "What you will master today".
        2. "essentialQuestion": The "Big Question" you should be able to answer by the end.
        3. "hook": A "Quick Start" thought experiment or connection to real life.
        4. "directInstruction": "Core Concept Summary" - A concise, easy-to-read summary of the main ideas. Use bolding for keywords.
        5. "guidedPractice": "Practice Exercises" - Specific things to try or solve using the generated tools (e.g. "Use the Flashcards to test your vocab", "Try the Quiz to check understanding").
        6. "independentPractice": "Challenge Task" - A specific writing or creative task to deepen understanding.
        7. "closure": "Self-Reflection Questions" - 2-3 questions to ask yourself to check if you're ready.
        FORMAT:
        Return ONLY JSON with this structure:
        {
            "objectives": ["..."],
            "essentialQuestion": "...",
            "hook": "...",
            "directInstruction": "...",
            "guidedPractice": "...",
            "independentPractice": "...",
            "closure": "..."
        }
      `;
  };

  return { buildLessonPlanPrompt, buildParentGuidePrompt, buildStudyGuidePrompt };
};

// Window registration — the build script wraps this in an IIFE so window
// registration only fires once per page load.
window.AlloModules = window.AlloModules || {};
window.AlloModules.createPromptsLibrary = createPromptsLibrary;
