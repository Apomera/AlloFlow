/**
 * AlloFlow — Guided Mode Banner Module
 *
 * Sticky banner shown atop the sidebar when the user enables Guided Mode, now a
 * hands-on tutorial rather than a passive table of contents:
 *   - Tier 1 (anchor + explain): a per-step "do this now" instruction plus a
 *     pulsing highlight applied directly to the active tool (the monolith scrolls
 *     it into view and owns the target class lifecycle).
 *   - Tier 2 (do-it-with-me): clicking the highlighted tool flips guidedEngaged,
 *     which surfaces the primary "Next step" button. The encouraging success note
 *     (✅), however, only appears once the step's work has *actually happened* — a
 *     new history item was produced (generate steps), real source text was entered
 *     (source step), or the tool was opened (the few interaction-only steps). This
 *     keeps "Analysis done" honest: it no longer flashes on the click that merely
 *     starts the (async) run.
 * Plus the expandable "About this step" markdown panel (now with a read-aloud
 * button reusing window.callTTS); on the source step, a "Try this example"
 * affordance that loads a real starter passage to run the genuine tools on; and
 * on every other step, a tabbed info panel (How it works / Worked example, from the
 * codebase-verified GUIDED_DETAIL) plus a "View the full worked lesson" showcase modal.
 *
 * Extracted from AlloFlowANTI.txt (May 2026); hands-on tutorial pass (Jun 2026);
 * completion-gating + About TTS + example passage + per-step examples (Jun 2026).
 *
 * Required props:
 *   GUIDED_STEPS, GUIDED_TOUR_MAP, guidedStep, guidedEngaged,
 *   handleExitGuidedMode, handleGuidedSkip, setGuidedStep, setShowGuidedTip,
 *   showGuidedTip, t, tourSteps, history
 * Optional props:
 *   inputText, setInputText (enable the source-step "Try this example" button)
 *
 * The target highlight does not add an interactive overlay and goes static under
 * prefers-reduced-motion.
 */
// A real starter passage for the source step's "Try this example" affordance — a teacher exploring
// Guided Mode gets concrete text to run the *actual* tools on (no canned/faked tool output is ever
// shown; everything downstream is genuinely generated from this). Content-rich + structured so the
// analysis, glossary, organizer, etc. each have something meaningful to work with.
const GUIDED_SAMPLE_TEXT = "Photosynthesis is the process that plants, algae, and some bacteria use to turn sunlight into food. Inside a plant's leaves, a green pigment called chlorophyll captures energy from the sun. The plant takes in carbon dioxide from the air through tiny openings called stomata, and it absorbs water from the soil through its roots. Using the sun's energy, the plant combines the carbon dioxide and water to make glucose, a kind of sugar that stores energy for later. As a by-product, the plant releases oxygen back into the air — the same oxygen that animals and people need to breathe. Without photosynthesis, most life on Earth could not survive.";

// GUIDED_DETAIL — polished, codebase-accurate "How it works" + "Worked Example"
// content for AlloFlow Guided Mode. One entry per Guided section id (22 total).
// Derived from verified findings in guided_sections.json. Example strings use \n
// line breaks and keep one coherent photosynthesis lesson across every section.

// Codebase-verified deep input/output detail + a consistent worked example per Guided step
// (photosynthesis through-line). Distilled from a read-only verification of the real generators.
const GUIDED_DETAIL = {
  "source-input": {
    "headline": "Capture the lesson text every tool reads",
    "inputs": [
      "Pasted or typed lesson text (inputText)",
      "File upload (PDF / DOCX / image OCR via handleFileUpload)",
      "URL fetch (handleUrlFetch / urlToFetch)",
      "AI-generated source (sourceTopic, sourceLevel, sourceTone, sourceLength, includeSourceCitations)"
    ],
    "outputs": [
      "The source text itself, held in the single inputText string",
      "Optional inline citation markers + a Source Text References block",
      "Bilingual sources split on the '--- ENGLISH TRANSLATION ---' delimiter",
      "Persisted to project save (sourceText) and the _final resource pack"
    ],
    "how": "This is the entry point: paste, type, upload a file, fetch a URL, or AI-generate from a topic, and all four paths converge on the one inputText string. It has no transform step of its own; every later tool reads this text as its textToProcess.",
    "example": "SOURCE MATERIAL (captured into inputText)\n\n[Pasted by the teacher]\n\nPhotosynthesis is the process that plants, algae, and some bacteria use to turn sunlight into food. Inside a plant's leaves, a green pigment called chlorophyll captures energy from the sun. The plant takes in carbon dioxide from the air through tiny openings called stomata, and it absorbs water from the soil through its roots. Using the sun's energy, the plant combines the carbon dioxide and water to make glucose, a kind of sugar that stores energy for later. As a by-product, the plant releases oxygen back into the air — the same oxygen that animals and people need to breathe. Without photosynthesis, most life on Earth could not survive.\n\n— — — — —\nWord count: 118  ·  Status: Source captured\nGuided banner: \"Source captured. Now let's find what students will struggle with.\"\n\nIf instead generated with the AI \"Generate\" button:\nTopic: \"How plants make food (photosynthesis)\"  ·  Reading level: Grade 5  ·  Length: ~250 words  ·  Tone: Engaging Narrative  ·  Citations: ON\n\nHave you ever wondered how a plant feeds itself without ever taking a bite? The answer is photosynthesis [¹].\n\nDeep inside every leaf is a green pigment called chlorophyll, which catches energy from sunlight like a solar panel. At the same time the plant breathes in carbon dioxide through tiny openings called stomata, and drinks up water from the soil through its roots. Using the sun's energy, the plant mixes the carbon dioxide and water to build glucose — a sugar it stores for later — and gives off oxygen as a by-product [²].\n\nWithout photosynthesis, most life on Earth could not survive.\n\nSource Text References\n1. Britannica Kids — Photosynthesis\n2. National Geographic — Photosynthesis"
  },

  "analysis": {
    "headline": "Read the passage for level, concepts, accuracy",
    "inputs": [
      "Source text (textToProcess, English block)",
      "Verify accuracy with Google Search toggle (checkAccuracyWithSearch, default on)",
      "UI language (currentUiLanguage) — adds translatedText when non-English",
      "Differentiation/standards context (differentiationContext)"
    ],
    "outputs": [
      "readingLevel { range (grade band), explanation }",
      "concepts: string[] of key-concept chips",
      "accuracy { rating, reason, verifiedFacts[], discrepancies[], citations }",
      "grammar: string[] of issues (or 'None detected')",
      "localStats: deterministic Flesch-Kincaid { score, words, sentences, syllables }"
    ],
    "how": "The handler resolves the English source, optionally runs Google-Search-grounded fact-checking, then asks Gemini for one JSON object (reading level, concepts, accuracy, grammar). It computes the Flesch-Kincaid score locally in code — not from the model — and rehydrates citation markers into clickable superscript links.",
    "example": "READING LEVEL\nRange: 6th–8th Grade\nWhy: Sentences are moderate with embedded clauses, and domain terms (chlorophyll, carbon dioxide, stomata, glucose) raise vocabulary load — though inline glosses like \"glucose, a kind of sugar\" keep it out of the high-school band.\n\nKEY CONCEPTS\n• Photosynthesis\n• Chlorophyll captures sunlight\n• Carbon dioxide intake via stomata\n• Water absorption through roots\n• Glucose as stored energy\n• Oxygen as a by-product\n\nACCURACY: High\nReason: Core claims align with established biology — chlorophyll as the light-capturing pigment, stomata as the gas-exchange openings, glucose and oxygen as products.\nVerified facts:\n  ✓ Chlorophyll is the green pigment that absorbs light energy. [¹]\n  ✓ Stomata are the pores for taking in CO₂ and releasing O₂. [²]\n  ✓ Photosynthesis combines CO₂ and water using light to make glucose and release oxygen. [¹]\nDiscrepancies:\n  ⚠ \"Turns sunlight into food\" is a reasonable simplification, but light energy is converted and stored as chemical energy in glucose. [³]\n\nGRAMMAR: None detected\n\nREADABILITY (computed in code)\nFlesch-Kincaid grade: 8.7  ·  words: 109  ·  sentences: 6  ·  syllables: 168"
  },

  "glossary": {
    "headline": "Build tiered vocabulary cards with translations",
    "inputs": [
      "Source text (latest analysis originalText, else inputText)",
      "Tier-2 & Tier-3 term counts (glossaryTier2Count / glossaryTier3Count)",
      "Definition level (glossaryDefinitionLevel)",
      "Target languages (selectedLanguages / leveledTextLanguage)",
      "includeEtymology, useEmojis, glossaryImageStyle"
    ],
    "outputs": [
      "A JSON array of term objects",
      "Each: { term, def, tier ('Academic'/'Domain-Specific') }",
      "translations keyed by language name ('Term: Definition')",
      "Optional etymology, etymologyByLang, roots[]",
      "Optional AI icon per term (image base64)"
    ],
    "how": "The handler finds exactly the requested counts of Academic (Tier 2) and Domain-Specific (Tier 3) terms, defines each at the chosen level, and optionally adds translations, emojis, and word roots. Each term is then enriched with an AI-drawn icon via callImagen in batches.",
    "example": "[ 2 Tier-2 / 4 Tier-3 Terms — Spanish, Haitian Creole ]\n\nTERM: Photosynthesis  [Tier 3 · Domain-Specific]\n  Def: The process plants, algae, and some bacteria use to turn sunlight, carbon dioxide, and water into food (glucose), releasing oxygen as a by-product.\n  Spanish: Fotosíntesis: El proceso que usan las plantas para convertir la luz solar, el dióxido de carbono y el agua en alimento (glucosa).\n  Haitian Creole: Fotosentèz: Pwosesis plant yo itilize pou transfòme limyè solèy, gaz kabonik ak dlo an manje (glikoz).\n  Roots: photo (Greek, 'light') + synthesis (Greek, 'putting together') → related: photograph, photon\n  [AI icon: flat-vector leaf-and-sun]\n\nTERM: Chlorophyll  [Tier 3 · Domain-Specific]\n  Def: The green pigment inside a plant's leaves that captures energy from the sun so photosynthesis can happen.\n  Spanish: Clorofila: El pigmento verde dentro de las hojas que captura la energía del sol.\n  Roots: chloro (Greek, 'pale green') + phyll (Greek, 'leaf')\n\nTERM: Stomata  [Tier 3 · Domain-Specific]\n  Def: Tiny openings on a leaf that let the plant take in carbon dioxide and let oxygen out.\n\nTERM: Glucose  [Tier 3 · Domain-Specific]\n  Def: A kind of sugar the plant makes during photosynthesis and uses to store energy for later.\n\nTERM: Absorb  [Tier 2 · Academic]\n  Def: To take in or soak up something, such as the way a plant's roots absorb water from the soil.\n\nTERM: Combine  [Tier 2 · Academic]\n  Def: To join two or more things together, like the way a plant combines carbon dioxide and water to make glucose."
  },

  "simplified": {
    "headline": "Rewrite the passage at a target reading level",
    "inputs": [
      "Source text (textToProcess, chunked at ~9000 chars)",
      "Reading grade level (effectiveGrade, ~9 complexity bands)",
      "Target language (effectiveLanguage) — adds a bilingual block",
      "Length target (leveledTextLength) + textFormat",
      "useEmojis, keepCitations, includeCharts, studentInterests"
    ],
    "outputs": [
      "A plain markdown/text STRING (not a JSON object)",
      "The passage rewritten at the chosen grade band",
      "Optional [[CHART: {...}]] blocks and markdown tables",
      "Non-English runs append '--- ENGLISH TRANSLATION ---' + the English version"
    ],
    "how": "For each ~9000-char chunk the tool picks a grade-band complexity guide and rewrites the text, then runs a deterministic word-count check and condenses or expands (tagging '(Refined)') if it lands out of range. The result is stored as a plain markdown string, not parsed JSON.",
    "example": "Leveled Text (5th Grade) — meta: \"5th Grade - English\"\n\nHow Plants Make Their Own Food\n\nHave you ever wondered how a plant eats? Plants don't eat food the way you do. Instead, they make their own food using sunlight. This amazing process is called photosynthesis, and plants, algae, and even some tiny bacteria all use it.\n\nThe work happens inside a plant's leaves, which are full of a green coloring called chlorophyll. Chlorophyll acts like a tiny solar panel — it captures energy from the sun and traps it for the plant to use.\n\nTo build food, a plant needs two main ingredients. First, it pulls in a gas called carbon dioxide from the air through tiny openings on the leaves called stomata. Second, it soaks up water from the soil through its roots, almost like sipping through a straw.\n\nNow the plant puts it all together. Using the sun's trapped energy, it combines the carbon dioxide and water to make glucose — a kind of sugar that stores energy for later, like packing a lunch for the day.\n\nThere's also a helpful by-product. As the plant makes glucose, it releases oxygen back into the air — the very same oxygen that animals and people breathe!\n\nWithout photosynthesis, plants couldn't make food and the air would run low on oxygen. Most life on Earth depends on this quiet, green process happening in leaves every single day.\n\n[[CHART: { \"type\": \"bar\", \"title\": \"What Goes In and What Comes Out\", \"data\": [{\"label\": \"Carbon Dioxide (in)\", \"value\": 6}, {\"label\": \"Water (in)\", \"value\": 6}, {\"label\": \"Glucose (out)\", \"value\": 1}, {\"label\": \"Oxygen (out)\", \"value\": 6}] }]]"
  },

  "ui-tool-wordsounds": {
    "headline": "Build phonics drills from the lesson's words",
    "inputs": [
      "A word list (not the prose) from sourceVocabulary / glossary terms",
      "Reading grade level (gradeLevel, default 'Early Readers (K-2)')",
      "Per-activity {enabled, count} over 17 phonics activities",
      "masteryThreshold (3 consecutive correct)",
      "wordSoundsLanguage, optional imageTheme"
    ],
    "outputs": [
      "A processed[] array of per-word phonics objects",
      "Each: { term, phonemes[], syllables[], rhymes[], familyMembers[], manipulationTask }",
      "A lessonPlanConfig + activity sequence[] driving the game",
      "Probe CSV export (accuracy, items/min, easy/medium/hard bands)"
    ],
    "how": "In Guided Mode this step launches the standalone Word Sounds generator. The teacher assembles a word list and toggles which phonics activities to include; each word is sent to Gemini for a strict phoneme analysis, and the result drives self-grading drills with per-phoneme mastery tracking.",
    "example": "WORD LIST pulled from the photosynthesis vocabulary: sunlight, leaf, root, stomata, glucose, oxygen\nGrade: Early Readers (K-2)  ·  Mastery: 3 consecutive correct\nActivities: Find Sounds (5) → Break It Down (5) → Sound Mapping (5) → Rhyme Time (5) → Word Families (5) → Sound Swap (5)\ntotalItems: 30  ·  estimatedMinutes: 15\n\nPER-WORD PHONICS OBJECTS\n\n1) \"sun\" (from sunlight)\n   phonemes: [s][u][n]  ·  rhymes with: fun\n   word family -un: fun, run, bun, nun, pun\n   manipulationTask: \"Say 'sun'. Change the /s/ to /f/. What word?\" → fun\n\n2) \"leaf\"\n   phonemes: [l][ē][f]  (ea = long e)\n   rhymes with: beef\n   manipulationTask: \"Say 'leaf'. Now say it without the /f/.\" → lea\n\n3) \"root\"\n   phonemes: [r][ū][t]  (oo = long u)\n   word family -oot: boot, hoot, loot, toot, shoot\n   manipulationTask: \"Say 'root'. Change the /r/ to /b/.\" → boot\n\n4) \"stomata\"  [_fallbackUsed: true]\n   7 phonemes, 3+ syllables — flagged as outside the K-2 decodable range, routed to the 'older readers' bucket rather than the phoneme drills.\n\nTEACHER EXPORT (Probe CSV)\nDate,Grade,Activity,Items Attempted,Items Correct,Accuracy %,Items/Min,Duration\n6/30/2026,K,segmentation,5,4,80,9.2,33s"
  },

  "outline": {
    "headline": "Generate a graphic organizer from the text",
    "inputs": [
      "Source text (textToProcess)",
      "Organizer type (outlineType) — one of 13 (Venn, Flow Chart, Frayer, etc.)",
      "Reading grade level (gradeLevel)",
      "Target language (effectiveLanguage), standards, useEmojis",
      "Custom instructions (outlineCustomInstructions)"
    ],
    "outputs": [
      "A JSON object { main, branches: [...] }",
      "Each branch: { title, items: string[], connectsTo? }",
      "structureType stamped with the chosen organizer",
      "Non-English runs add main_en / title_en / items_en"
    ],
    "how": "The handler picks the chosen organizer type, builds a type-specific prompt (e.g. Venn demands exactly 3 branches ending in 'Shared'), and asks Gemini for a { main, branches } JSON object. The renderer switches on structureType to draw the matching diagram, with an optional sorting game when there are enough items.",
    "example": "Type: Key Concept Map  ·  Grade: 5  ·  Language: English\n\nMAIN: Photosynthesis: How Plants Make Food\n\nBranch — Who Does It\n  • Plants\n  • Algae\n  • Some bacteria\n\nBranch — What Goes In\n  • Sunlight (energy)\n  • Carbon dioxide from air\n  • Water from soil\n\nBranch — Where It Happens\n  • Inside the leaves\n  • Chlorophyll captures sunlight\n  • Stomata let in carbon dioxide\n  • Roots absorb water\n\nBranch — What Comes Out\n  • Glucose (stored sugar energy)\n  • Oxygen released to the air\n\nBranch — Why It Matters\n  • Animals and people breathe the oxygen\n  • Most life on Earth depends on it\n\nOn screen: a central node radiates five branch cards (alternating indigo/teal borders). Because there are 15 items across 5 branches, a 'practice sorting game' button also appears, and Edit mode lets the teacher rename the center, titles, or any item.\n\nSame passage as a Flow Chart would instead yield a numbered vertical spine: Capture Energy → Take In Materials → Combine Ingredients → Make Glucose → Release Oxygen → END."
  },

  "anchor-chart": {
    "headline": "Make a classroom anchor chart poster",
    "inputs": [
      "Source text (up to 2500 chars for context)",
      "Topic label (sourceTopic)",
      "Chart type (chartType / anchorChartType: auto / reference / process / concept-map / comparison / strategy / vocabulary / routine / worked-example / criteria-success / misconception / question-guide)",
      "Reading grade level (effectiveGrade)"
    ],
    "outputs": [
      "content { title, chartType, sections[] }",
      "Each section: { id, label, bullets[], iconPrompt, iconUrl }",
      "Hand-drawn marker icon filled per section on mount (callImagen)",
      "interactive settings (optional student fill-in mode) + lessonRef"
    ],
    "how": "The handler builds a type-specific prompt, or lets Auto choose the strongest structure, then asks for a { chartType, title, sections } object capped at 6 sections. On render the chart adds type-aware captions, badges, grid/step layouts, and a hand-drawn marker icon per section; teachers can edit inline, optionally arm Interactive Mode, and export PNG.",
    "example": "TITLE: HOW PLANTS MAKE FOOD\nChart type: process → 5 numbered steps with ↓ connectors, each with a marker icon.\n\n① CATCH THE LIGHT\n   • Chlorophyll is the green pigment\n   • Lives inside the leaves\n   • Grabs energy from sunlight\n   [icon: a green leaf with a small sun]\n   ↓\n② BREATHE IN CO₂\n   • Air enters tiny holes = stomata\n   • Takes in carbon dioxide\n   [icon: tiny pores on a leaf surface]\n   ↓\n③ DRINK WATER\n   • Roots pull water from soil\n   • Water travels up the stem to the leaves\n   [icon: roots soaking up water drops]\n   ↓\n④ MAKE GLUCOSE\n   • Sun energy mixes CO₂ + water\n   • Builds glucose, a sugar\n   • Stores energy for later\n   [icon: a sugar cube glowing with energy]\n   ↓\n⑤ RELEASE OXYGEN\n   • Oxygen leaves as a by-product\n   • Goes back into the air\n   • The air we breathe!\n   [icon: an oxygen bubble floating up]\n\nOn screen: a paper-textured poster, Permanent Marker title, five marker-colored blocks (red/blue/green/orange/purple) with step badges. If Interactive mode is armed, students fill blank rows and the AI grader returns a 'What you did well' card, a 'One thing to try next' card, and a '+80 XP' pill."
  },

  "image": {
    "headline": "Generate a labeled diagram of the concept",
    "inputs": [
      "Source text (full text analyzed; first 500 chars for multi-panel)",
      "Visual style (effectiveVisualStyle)",
      "Layout mode (visualLayoutMode: single / auto / forced template)",
      "Reading grade level + target language (label/altText language)",
      "Toggles: noText, fillInTheBlank, creativeMode (labeled 'Enhanced'), useLowQualityVisuals"
    ],
    "outputs": [
      "Single path: { prompt, style, imageUrl (base64), altText }",
      "Multi-panel path: visualPlan { layout, title, panels[] }",
      "Each panel: { imagenPrompt, caption, imageUrl, labels[] }",
      "Each label: { text, position, anchorX, anchorY }"
    ],
    "how": "The handler first asks Gemini for the visual elements and alt text, then builds an Imagen prompt. For multi-panel mode an art-director plans 2–4 panels and runs them through callImagen, stripping stray text; otherwise it renders a single labeled image with alt text and a label challenge.",
    "example": "SINGLE-IMAGE RESULT\nprompt: \"Educational diagram: green leaf cross-section, glowing sun with energy rays, chlorophyll inside leaf cells, blue CO₂ molecules entering through stomata, water rising from roots, glucose forming inside the leaf, oxygen bubbles released, arrows showing inputs and outputs. Clean educational vector art. White background, high contrast.\"\naltText: \"A diagram of a plant leaf showing how sunlight, carbon dioxide entering through stomata, and water from the roots combine to make glucose and release oxygen during photosynthesis.\"\n\nMULTI-PANEL RESULT (layout 'sequence', title 'How Photosynthesis Works')\n\nPanel 1 — Capturing Sunlight\n  Caption: Chlorophyll inside the leaf captures energy from the sun.\n  Labels: Sunlight (top-right), Chlorophyll (center)\n\nPanel 2 — Taking In Materials\n  Caption: The plant takes in carbon dioxide through stomata and water through its roots.\n  Labels: Carbon dioxide (top-left), Stomata (bottom-center), Water from roots (bottom-left)\n\nPanel 3 — Making Food\n  Caption: The plant combines them into glucose for energy and releases oxygen back into the air.\n  Labels: Glucose (center-left), Oxygen released (top-right)\n\nEnvelope meta: \"Multi-Panel (3 panels)\""
  },

  "faq": {
    "headline": "Answer the questions students will ask",
    "inputs": [
      "Source text (textToProcess)",
      "Number of questions (faqCount: 3 / 5 / 8 / 10, default 5)",
      "Reading grade level (gradeLevel)",
      "Target language (effectiveLanguage) — adds _en fields",
      "studentInterests, useEmojis, custom instructions"
    ],
    "outputs": [
      "A flat JSON array of FAQ objects",
      "Each: { question, answer }",
      "Non-English adds { question_en, answer_en }",
      "No category / difficulty / misconception fields — only Q/A (+ _en)"
    ],
    "how": "A single Gemini call asks for faqCount question/answer pairs at the given grade and language, optionally weaving in interests and emojis. The result is parsed straight into a card array — there is no two-pass analysis — and rendered as expandable accordion cards with read-aloud.",
    "example": "[\n  Q: What is photosynthesis and why does it matter?\n  A: It's the process plants, algae, and some bacteria use to turn sunlight into food. It matters because the glucose it makes feeds the plant and the oxygen it releases is what animals and people breathe. Without photosynthesis, most life on Earth could not survive.\n\n  Q: What does chlorophyll actually do?\n  A: Chlorophyll is the green pigment inside a plant's leaves, and its job is to capture energy from the sun. That captured sunlight is the energy the plant uses to combine carbon dioxide and water.\n\n  Q: Where do the carbon dioxide and water come from?\n  A: The plant takes in carbon dioxide from the air through tiny openings called stomata, and absorbs water from the soil through its roots — one ingredient from above ground, one from below.\n\n  Q: What is glucose, and what happens to it?\n  A: Glucose is a sugar the plant makes by combining carbon dioxide and water using the sun's energy. It stores energy so the plant can use it later — like the plant's packed lunch.\n\n  Q: Is oxygen the goal of photosynthesis, or a by-product?\n  A: A common mix-up is thinking plants make oxygen on purpose for us. Oxygen is actually a by-product, released while the plant makes its own food (glucose). It just happens to be the oxygen animals and people need to breathe.\n]\n\n(Spanish run adds question_en / answer_en translation fields to each card.)"
  },

  "sentence-frames": {
    "headline": "Scaffold student writing with frames and a rubric",
    "inputs": [
      "Source text (textToProcess)",
      "Frame type (frameType: Sentence Starters / Paragraph Frame / Discussion Prompts)",
      "Reading grade level (gradeLevel)",
      "Target language (effectiveLanguage), standards, useEmojis",
      "Custom instructions (frameCustomInstructions)"
    ],
    "outputs": [
      "A JSON object with mode 'list' or 'paragraph'",
      "List mode: items[] of { text } (+ text_en when non-English)",
      "Paragraph mode: text with [bracketed] fill-in tokens",
      "Always a rubric (markdown table, Criteria × Levels 1–5)"
    ],
    "how": "The handler builds a prompt from the text, frame type, grade and language, then asks Gemini for a JSON object whose shape it defensively repairs after parsing. List mode renders numbered starter cards with response boxes; paragraph mode turns [tokens] into fill-in inputs; both always show the markdown rubric.",
    "example": "mode: list\n\nSENTENCE STARTERS\n1. Photosynthesis is the process that plants, algae, and some bacteria use to...\n2. Inside a plant's leaves, the green pigment called chlorophyll is important because it...\n3. The plant takes in carbon dioxide through tiny openings called stomata, and it absorbs water from the soil through its...\n4. Using the sun's energy, the plant combines carbon dioxide and water in order to make...\n5. One reason photosynthesis matters to animals and people is that, as a by-product, the plant releases...\n6. If there were no photosynthesis, most life on Earth could not survive because...\n\nRUBRIC\n| Criteria | L1 Beginning | L3 Proficient | L5 Mastery |\n| --- | --- | --- | --- |\n| Content | Confuses inputs and outputs (e.g. plants breathe in oxygen). | Explains chlorophyll captures sunlight and the plant combines CO₂ and water to make glucose. | Precisely explains stomata, chlorophyll, glucose as stored energy, and oxygen as a by-product animals breathe. |\n| Use of Scaffolds | Starter copied with no added content. | Completes 3–4 starters with accurate endings. | Integrates every starter into a complete explanation. |\n| Mechanics | Errors obscure meaning. | Some errors, meaning stays clear. | Clean, correctly punctuated sentences. |\n\n(Choosing 'Paragraph Frame' instead returns mode 'paragraph': \"...combines these to make [glucose], a sugar that stores energy, and releases [oxygen] back into the air.\")"
  },

  "note-taking": {
    "headline": "Pre-seed a fillable note-taking template",
    "inputs": [
      "Source text (textToProcess, capped at 3000 chars)",
      "Template type (templateType: cornell-notes default, lab-report, reading-response, double-entry, guided-notes, q-and-a)",
      "Reading grade level (effectiveGrade)",
      "Topic (sourceTopic) for the title fallback"
    ],
    "outputs": [
      "A templateType-specific content object",
      "Cornell: { cues[], notes[] (empty rows), summary, connections }",
      "Guided-notes / Q-and-A / double-entry: blanks[], pairs[], or entries[]",
      "lessonRef metadata; the 'Get AI Feedback' loop returns a separate rubric → XP"
    ],
    "how": "This step only PRE-POPULATES a scaffold: one Gemini call seeds a few fields (Cornell cues, lab question, guided-notes blanks, Q&A pairs) and leaves the rest empty for the student. The student fills it in, and a separate strengths-first feedback loop scores the work into XP.",
    "example": "TEMPLATE: cornell-notes — 5th Grade\nTitle: How Photosynthesis Works\n\nWhat the AI seeds (left cue column only; right notes start empty):\nCues / Questions\n  1. What is chlorophyll?\n  2. Where does CO₂ enter?\n  3. Role of stomata\n  4. Where does water come from?\n  5. What is glucose for?\n  6. By-product released?\n  7. Why does it matter for life?\n\nAfter the student fills it in:\n  1. What is chlorophyll?    | Green pigment inside leaves; captures the sun's energy.\n  2. Where does CO₂ enter?   | From the air, taken in through the leaves.\n  3. Role of stomata         | Tiny openings that let carbon dioxide in.\n  4. Where does water come?  | Pulled up from the soil through the roots.\n  5. What is glucose for?    | A sugar the plant makes that stores energy for later.\n  6. By-product released?    | Oxygen goes back into the air.\n  7. Why does it matter?     | Animals and people breathe that oxygen.\n\nSUMMARY: Plants use chlorophyll to catch sunlight, mix carbon dioxide (through stomata) with water from the roots to make glucose, and release the oxygen other living things need.\n\nGet AI Feedback returns:\n  Strength: \"Your cues are real retrieval questions, not just headings.\"\n  Growth nudge: \"In your summary, explain WHY the plant releases oxygen — it's a leftover from making glucose.\"\n  Rubric: completion 3, quality 13, alignment 5  →  26 XP"
  },

  "brainstorm": {
    "headline": "Generate hands-on activity ideas for the lesson",
    "inputs": [
      "Source text (textToProcess)",
      "Reading grade level (gradeLevel)",
      "Independent-vs-class mode (isIndependentMode)",
      "studentInterests, standards, lesson DNA",
      "Prior resources in history (steer the ideas)"
    ],
    "outputs": [
      "A JSON array of activity objects",
      "Each exactly: { title, description, connection }",
      "Lazily added per card: idea.guide (teacher guide markdown)",
      "Lazily added: idea.worksheet (student worksheet) + idea.coverImage"
    ],
    "how": "The handler builds one creative-pedagogy prompt from the source, grade, interests, standards and prior resources, then returns an array of { title, description, connection } ideas. Per-card buttons then lazily generate a teacher guide, a printable student worksheet, and an optional cover illustration.",
    "example": "[\n  TITLE: Backyard Sunlight Detectives\n  Description: In pairs, students cover one leaf of a living plant with foil and leave a matching leaf uncovered. Over four days they observe both, predict what happens when chlorophyll can't capture sunlight, and compare the pale, energy-starved leaf to its green neighbor.\n  Connection: Demonstrates that chlorophyll needs sunlight to make glucose — the foil blocks the sun's energy, so the covered leaf can't run photosynthesis.\n\n  TITLE: The Stomata Breathing Game\n  Description: Students become a leaf's gas-exchange system. Half are 'carbon dioxide' molecules entering through hula-hoop stomata; the other half are 'oxygen' molecules exiting. Players only swap when the 'sunlight' caller says the sun is shining.\n  Connection: Brings the stomata, CO₂ intake, and oxygen release to life, reinforcing that gas exchange is powered by the sun.\n\n  TITLE: Recipe Card for Glucose\n  Description: Students design a cookbook 'recipe card' for plant food: ingredients (carbon dioxide, water), energy source (sunlight via chlorophyll), the kitchen (the leaf), the dish (glucose), and leftover scraps (oxygen).\n  Connection: Reframes CO₂ + water + sunlight → glucose + oxygen as a familiar recipe.\n\n  TITLE: Soil-to-Leaf Water Relay\n  Description: An outdoor relay passing water from a 'soil' bucket up through 'roots' and a 'stem' to a 'leaf' station where it meets carbon dioxide and a sunlight flashlight. Only when all three arrive can the team flip a 'GLUCOSE MADE!' card and release an oxygen balloon.\n  Connection: Models how the plant absorbs water and combines it with CO₂ using the sun's energy — all three inputs must be present.\n]\n\n(Clicking 'Generate Teacher Guide' on a card adds idea.guide with Materials Needed / Preparation Steps / Step-by-Step Instructions in markdown.)"
  },

  "persona": {
    "headline": "Interview historical figures and experts about the topic",
    "inputs": [
      "Source text (latest analysis originalText, capped at 3000 chars)",
      "Topic label (sourceTopic)",
      "Reading grade level (gradeLevel)",
      "Target language (leveledTextLanguage)",
      "Custom instructions (personaCustomInstructions)"
    ],
    "outputs": [
      "A JSON array of exactly 6 persona objects",
      "Each: { name, role, year, nationality, context, greeting }",
      "voice + voiceProfile, artStyle, visualDescription",
      "quests[] (3 hidden objectives) + suggestedQuestions[] (3)"
    ],
    "how": "A single Google-Search-grounded Gemini call identifies 6 interviewable figures or expert archetypes from the source, verifies each one's era and look, assigns an art style and TTS voice, and returns profiles with a greeting, three quests, and three suggested questions. Selecting a card generates a portrait and opens an in-character chat.",
    "example": "[\n  NAME: Dr. Jan Ingenhousz  (1779, Dutch)\n  Role: 18th-century physiologist who discovered photosynthesis\n  Context: Ingenhousz proved that the green parts of plants release oxygen only in sunlight — the discovery behind the lesson's claim that plants release oxygen using the sun's energy.\n  Voice: Charon (refined Dutch accent, measured, scholarly)\n  Greeting: \"Good day, young scholar. I have spent many summer afternoons watching bubbles rise from leaves held under water in the sun. Ask, and I shall tell you what those bubbles mean.\"\n  Quests:\n    • (20) Get him to explain why his pondweed only bubbled in sunlight, not shade.\n    • (50) Uncover that the bubbles were oxygen, the gas animals need to breathe.\n    • (75) Coax him to admit he didn't yet know about chlorophyll or glucose.\n\n  NAME: A Chloroplast  (Present day)\n  Role: The sunlight-capturing organelle inside a leaf cell\n  Context: Speaking AS the chloroplast lets students hear photosynthesis from the inside — how chlorophyll grabs light and how CO₂ and water become glucose while oxygen is set free.\n  Voice: Aoede (bright, friendly, uses kitchen and factory metaphors)\n  Greeting: \"Hi! I'm a chloroplast, and I live inside one of this leaf's cells. My green chlorophyll is soaking up sunlight right now. Want to know what I'm building in here?\"\n  Quests:\n    • (20) Find out which raw materials it pulls in (CO₂ from stomata, water from roots).\n    • (50) Get it to name the food it makes (glucose) and why a plant stores it.\n    • (75) Discover what it releases (oxygen) and why animals depend on it.\n\n  ...4 more figures (e.g. Joseph Priestley, Melvin Calvin, A Water Molecule, A Stoma) for 6 total.\n]"
  },

  "timeline": {
    "headline": "Order the process into a sortable sequence",
    "inputs": [
      "Source text (textToProcess)",
      "Item count (timelineItemCount, clamped 4–10)",
      "Sequence mode (timelineMode: auto / chronological / procedural / cause-effect / ...)",
      "Reading grade level + target language",
      "includeTimelineVisuals (per-item icon)"
    ],
    "outputs": [
      "A JSON object { progressionLabel, items[], mode, autoDetected }",
      "Each item: { date, event } (+ _en, + image when visuals on)",
      "Optional validationIssues[] flagging duplicate/out-of-order steps",
      "Renderer shows an axis label + a 'Detected/locked' mode chip"
    ],
    "how": "A 'Sequence Validation Expert' prompt hard-codes the grade, language, ordering mode, and an item-count rule, then returns a JSON sequence. The code tolerantly parses items, resolves the final mode, and runs structural validation (duplicate positions, non-monotonic dates) before rendering a drag-to-order card per item.",
    "example": "Order by: Causal Chain — Initial cause (sunlight captured) → Final effect (oxygen released)\n[Mode chip: \"Detected: Cause → Effect\"]\n\nStep 1 — Chlorophyll, the green pigment inside a leaf's cells, captures energy from sunlight.\n   [icon: a green leaf with sun rays striking it]\nStep 2 — Tiny openings called stomata open and let carbon dioxide from the air move into the leaf.\n   [icon: leaf surface with stomata pores and CO₂ arrows]\nStep 3 — The plant's roots absorb water from the soil, which travels up the stem to the leaves.\n   [icon: roots drawing water upward]\nStep 4 — Using the captured sunlight energy, the leaf combines the carbon dioxide and water.\n   [icon: two molecules merging with a spark of light]\nStep 5 — This reaction produces glucose, a sugar the plant stores to use as energy later.\n   [icon: a glucose molecule / energy-storage symbol]\nStep 6 — Oxygen is released back into the air as a by-product — the same oxygen animals and people breathe.\n   [icon: a leaf releasing O₂ bubbles]\n\nTeacher-only structural-issues panel: empty here — all 6 positions are unique and the causal chain is monotonic, so validation returns OK with no issues."
  },

  "concept-sort": {
    "headline": "Sort key terms into the right categories",
    "inputs": [
      "Source text (first 10,000 chars of textToProcess)",
      "Reading grade level (gradeLevel) — drives short cards for K–5",
      "Item count (conceptItemCount, blank = auto 6–30)",
      "Locked categories (selectedConcepts, max 5) — else AI picks 2–3",
      "Image mode (conceptImageMode) + style"
    ],
    "outputs": [
      "A JSON object { categories[], items[] }",
      "categories: { id, label, color }",
      "items: { id, content, categoryId } (+ image when generated)",
      "The 'answer key' is each item's categoryId — no separate key field"
    ],
    "how": "The handler asks Gemini for 2–3 contrasting categories (or the teacher's locked ones) plus a grade-tuned set of cards, parses { categories, items }, and optionally draws a vector icon per short card. Students drag cards in the sort game and are scored against each item's categoryId.",
    "example": "{\n  categories:\n    c1 — Inputs (Raw Materials & Energy Taken In)   [bg-indigo-500]\n    c2 — Outputs (Made or Released)                 [bg-emerald-500]\n    c3 — Structures (Where It Happens)              [bg-pink-500]\n\n  items:\n    i1 — \"Sunlight energy captured by the leaf\"              → c1  [icon: sun]\n    i2 — \"Carbon dioxide taken in from the air\"             → c1  [icon: CO₂ molecule]\n    i3 — \"Water absorbed from the soil through the roots\"   → c1  [icon: water drop + roots]\n    i4 — \"Glucose, a sugar that stores energy for later\"    → c2  [icon: sugar/energy]\n    i5 — \"Oxygen released back into the air\"                → c2  [icon: O₂ bubbles]\n    i6 — \"Chlorophyll, the green pigment in the leaf\"       → c3  [icon: green pigment]\n    i7 — \"Stomata, the tiny openings on the leaf\"           → c3  [icon: leaf pore]\n    i8 — \"Roots that pull water from the soil\"              → c3  [icon: roots]\n}\n\nBecause item count was left blank, the auto rule produced 8 short cards; every card is ≤ 6 words, so each also got a generated vector icon. The implicit answer key: i5 (Oxygen) → c2 (Outputs), and so on."
  },

  "dbq": {
    "headline": "Build a document-based question investigation",
    "inputs": [
      "Source text (truncated by grade band: 6000/10000/15000 chars)",
      "Reading grade level (gradeLevel) — scales doc count, excerpt length, rigor",
      "Target language (effectiveLanguage)",
      "DBQ mode (_dbqMode: standard / perspectives / search / links / custom)",
      "Custom instructions + optional web-searched primary-source URLs"
    ],
    "outputs": [
      "A JSON object { title, historicalContext, documents[] }",
      "Each doc: { id, documentType, source, excerpt, happPrompts, sourcingQuestions[], analysisQuestions[] }",
      "corroborationClaims[], synthesisPrompt, thesisStarter",
      "rubric[] (Thesis / Evidence / Analysis / Organization) + teacherNotes"
    ],
    "how": "The handler reads grade-scaled flags and the DBQ mode, optionally web-searches real primary-source URLs, then builds one large inline prompt for a JSON document set. The renderer turns it into a four-tab student workspace (Docs / Corroborate / Essay / Rubric) with HAPP analysis, reliability checks, and AI essay grading.",
    "example": "TITLE: How Do Plants Make Their Own Food? A Photosynthesis Investigation\nHistorical context: For most of history people believed plants 'ate' soil. Over centuries, scientists discovered that plants build their own food from air, water, and sunlight.\n\nDocument A (secondary — life-science textbook, 2021)\n  Excerpt: \"...chlorophyll captures energy from the sun. The plant takes in carbon dioxide through stomata and water through its roots, combining them to make glucose and releasing oxygen.\"\n  Analysis Q: According to Document A, what THREE ingredients does a plant combine, and what does it produce?\n\nDocument B (data — leaf gas-exchange experiment, 2022)\n  Excerpt: \"In the dark: 0 oxygen bubbles/min. Dim light: 6/min. Bright light: 22/min. When the lamp switched off, production stopped almost immediately.\"\n  Analysis Q: What relationship do the numbers show between light and oxygen released?\n\nDocument C (secondary — environmental science article, 2020)\n  Excerpt: \"The oxygen released during photosynthesis is the same oxygen animals and people breathe... without it, most life on Earth could not survive.\"\n  Analysis Q: What TWO things does Document C say animals get from plants?\n\nCorroboration claim: \"Sunlight is the energy source that powers photosynthesis.\"\n  Supporting: A, B  —  Guide: How does Document B (bubbles stopping in the dark) confirm what Document A states in words?\n\nSynthesis prompt: Using evidence from at least two documents, explain how plants make their own food and why that process matters for life on Earth.\nThesis starter: \"I believe that plants make their own food by ___ because Document A shows ___ and Document B shows ___.\"\n\nRubric: Thesis / Evidence Use / Analysis / Organization, each scored 1–4."
  },

  "math": {
    "headline": "Generate a themed STEM problem set",
    "inputs": [
      "Source text (first 1500 chars as Source Context)",
      "Topic/skill box (mathInput)",
      "Math mode (mathMode, default 'Problem Set Generator')",
      "Subject (mathSubject, e.g. Biology)",
      "Reading grade level + studentInterests + isMathGraphEnabled"
    ],
    "outputs": [
      "A JSON object { title, problems[], graphData }",
      "Each problem: { question, answer, steps[], realWorld }",
      "Each step: { explanation, latex }",
      "graphData null unless an SVG was requested/generated"
    ],
    "how": "In Problem Set mode the handler builds a 'Math Curriculum Designer' prompt that themes word problems with characters and settings from the source, tuned to grade and interests. The result is parsed through a repair cascade and normalized into uniform problem cards with reveal-able steps, answers, and real-world connections.",
    "example": "Title: Problem Set: Photosynthesis Rates & Gas Exchange   [Subject: BIOLOGY]\n\nProblem 1\n  A maple leaf produces 12 glucose molecules every 5 minutes. At this rate, how many does it make in 1 hour?\n  Step 1 — Rate per minute: 12 ÷ 5 = 2.4 glucose/min\n  Step 2 — Per hour: 2.4 × 60 = 144\n  Answer: 144 glucose molecules\n  Real-World: Botanists measure photosynthesis rates to compare which crop varieties grow fastest.\n\nProblem 2\n  A bean plant takes in 6 CO₂ molecules through its stomata for every 1 glucose it makes. If it builds 35 glucose, how many CO₂ molecules did it absorb?\n  Step 1 — Ratio CO₂ : glucose = 6 : 1\n  Step 2 — 35 × 6 = 210\n  Answer: 210 carbon dioxide molecules\n  Real-World: Climate researchers track CO₂ uptake by forests to estimate carbon pulled from the atmosphere.\n\nProblem 3\n  A water lily releases 8 oxygen bubbles every 2 minutes. How many in 15 minutes?\n  Step 1 — Proportion: 8/2 = x/15\n  Step 2 — 2x = 120 → x = 60\n  Answer: 60 oxygen bubbles\n  Real-World: Aquarium techs watch oxygen bubble rates to make sure fish have enough to breathe.\n\nProblem 4\n  To make 9 glucose, a plant uses 54 water molecules. How many per glucose, and how many for 20 glucose?\n  Step 1 — 54 ÷ 9 = 6 water per glucose\n  Step 2 — 6 × 20 = 120\n  Answer: 6 water per glucose; 120 water for 20 glucose\n\ngraphData: null"
  },

  "adventure": {
    "headline": "Turn the lesson into a choose-your-path story",
    "inputs": [
      "Source text (first 3000 chars of textToProcess)",
      "Reading grade level (gradeLevel)",
      "Target language (effectiveLanguage)",
      "Story-vs-standard tone (isAdventureStoryMode)",
      "studentInterests + custom/lesson-DNA context"
    ],
    "outputs": [
      "An opening-scene JSON object",
      "{ text (scene), options (exactly 4 strings) }",
      "inventoryUpdate, voices map, soundParams { atmosphere, element }",
      "Per-turn fields (XP, energy, gold, next scene) come on later turns"
    ],
    "how": "A 'dungeon master' prompt embeds the lesson plus grade, tone, and interests and returns one opening scene: descriptive text, exactly 4 choice options, a voices map, and sound parameters. From there each clicked choice calls Gemini again for a turn object that updates XP, energy, and the next scene.",
    "example": "{\n  text: \"You are Dr. Mira Solano, a botanist shrunk to the size of a pollen grain to find out why the greenhouse maples have stopped growing. You land on a broad green leaf where sunlight pours down in golden shafts and the surface glows emerald where chlorophyll packs the cells beneath your feet.\n\n  A low hiss draws your eye to a pair of guard cells flexing open and shut like tiny mouths — the stomata — with carbon dioxide streaming in. Far below, you feel a cool pull of water rising from the roots. The factory is running... but one patch of leaf has gone pale and still, its chlorophyll faded, and no oxygen bubbles rise from it.\n\n  Your wrist-scanner blinks: GLUCOSE OUTPUT FALLING. Where do you begin?\",\n\n  options: [\n    \"Climb toward a glowing chloroplast to watch chlorophyll capture sunlight\",\n    \"Slip through an open stoma to track the incoming carbon dioxide\",\n    \"Follow a vein down toward the roots to check the water supply\",\n    \"Investigate the pale patch where no oxygen is bubbling out\"\n  ],\n  inventoryUpdate: { add: { name: \"Botanist's Wrist-Scanner\", type: \"permanent\" } },\n  voices: { \"Dr. Mira Solano\": \"Leda\", \"Guard Cell\": \"Zephyr\" },\n  soundParams: { atmosphere: \"Ethereal\", element: \"Nature\" }\n}\n\nmetaInfo: \"Opening Scene\". A separate Imagen call fills the scene image; the three paragraphs split into tap-to-read-aloud sentences. The first choice returns a turn object, e.g. { evaluation: \"Smart — chlorophyll is exactly where light energy is captured.\", xpAwarded: 15, energyChange: -5, scene: {...} }."
  },

  "quiz": {
    "headline": "Build an exit ticket to check understanding",
    "inputs": [
      "Source text (textToProcess)",
      "MCQ count (quizMcqCount) + reflection count (quizReflectionCount)",
      "Depth of Knowledge (dokLevel: 'Mixed' or a Webb level)",
      "Reading grade level + target language",
      "passAnalysisToQuiz (pulls concepts from the analysis artifact)"
    ],
    "outputs": [
      "A quiz object { questions[], reflections[], mode 'exit-ticket' }",
      "Default mix: 3 MCQ + 1 fill-blank + 1 short-answer",
      "MCQ: { question, options[4], correctAnswer, factCheck }",
      "fill-blank: { expectedFill, acceptableAlternatives[] }; short-answer: { expectedAnswer }"
    ],
    "how": "The handler resolves the exit-ticket strategy (3 MCQ + 1 fill-blank + 1 short-answer by default), builds one prompt with the DOK instruction and source, then normalizes each item by type. A second per-MCQ Gemini pass adds a fact-check that verifies the keyed answer and debunks each distractor.",
    "example": "Exit Ticket  📝\n\nQ1 (MCQ) — What is the main job of photosynthesis for a plant?\n  A) To turn sunlight into food (glucose) for energy  ✓\n  B) To pull nitrogen out of the soil to build new leaves\n  C) To keep the plant cool on hot, sunny days\n  D) To help the plant move toward the sun\n  Fact-check: Verified — chlorophyll captures light to combine CO₂ and water into glucose. Nitrogen, cooling (transpiration), and bending toward light (phototropism) are different processes.\n\nQ2 (MCQ) — What does the green pigment chlorophyll do inside a leaf?\n  A) It captures energy from sunlight  ✓\n  B) It absorbs water from the soil\n  C) It releases oxygen into the air\n  D) It stores glucose for winter\n\nQ3 (MCQ) — Through which tiny leaf openings does a plant take in carbon dioxide?\n  A) Stomata  ✓   B) Roots   C) Chlorophyll   D) Veins\n\nQ4 (fill-blank) — Using the sun's energy, a plant combines carbon dioxide and ___ to make glucose.\n  expectedFill: water   (also accepts: H2O, water from the soil)\n\nQ5 (short-answer) — Why is the oxygen a plant releases important for animals and people?\n  Reference answer: Oxygen is released as a by-product of photosynthesis, and animals and people need it to breathe and survive.\n\nReflection: In your own words, explain what would happen to most life on Earth if photosynthesis suddenly stopped."
  },

  "alignment": {
    "headline": "Audit the whole lesson for standards and UDL",
    "inputs": [
      "All prior artifacts in history (not the raw passage)",
      "Target standards (targetStandards / standardsPromptString)",
      "Reading grade level (gradeLevel)",
      "DOK-tagged quiz items from history"
    ],
    "outputs": [
      "reports[]: per-standard text/activity/assessment alignment + Pass/Revise",
      "comprehensive{}: 9 dimensions (standards, vocabulary, engagement, accessibility, udl, accuracy, differentiation, cognitiveLoad, culturalResponsiveness)",
      "udl pillars: representation / engagement / actionExpression (CAST v3.0)",
      "overall: readiness score 0–100 + status + blockingIssues[]"
    ],
    "how": "This step audits the artifacts already generated rather than re-reading the passage. It optionally calls Gemini per target standard, then runs deterministic computes plus parallel specialist reviews across nine dimensions and rolls everything into an equal-weighted 0–100 readiness score where any 'Not Aligned' dimension blocks a Pass.",
    "example": "CURRICULUM AUDIT — Score 78 / 100  ·  Pass with notes\n8 of 9 dimensions evaluated (Cultural responsiveness: Not applicable)\n\nTop suggested fixes:\n  [Engagement ↓] DOK skews recall-heavy (80% L1); add 2 application items.\n  [Accessibility ↓] The leaf diagram has no alt text — a screen-reader user misses the chlorophyll/stomata labels.\n  [Vocabulary ↓] Add the Tier-2 word \"convert\" to bridge \"combines ... to make glucose.\"\n\nSTANDARDS ALIGNMENT (NGSS MS-LS1-6) — Revise\n  Text · Aligned: simplified text states chlorophyll captures the sun's energy and the plant combines CO₂ and water to make glucose.\n  Activities · Partially Aligned: the Concept Sort practices inputs vs. outputs but doesn't require explaining WHY energy is stored.\n  Assessment · Partially Aligned: exit-ticket items check recall; none ask students to construct an explanation of energy flow.\n  Recommendation: add a constructed-response item — \"Explain how a plant turns sunlight into stored food, using chlorophyll, glucose, and oxygen.\"\n\nUDL PRINCIPLES (CAST v3.0)\n  Representation · Partially Aligned — add a labeled diagram and a read-aloud.\n  Engagement · Partially Aligned — offer a choice of task.\n  Action & Expression · Not Aligned — only multiple-choice recall; let students diagram or record a spoken explanation.\n\nACCESSIBILITY · Partially Aligned\n  1 image, 0 with alt text; 1 color-only reference (\"the green pigment\"); longest unbroken passage 96 words.\n\nCULTURAL RESPONSIVENESS · Not applicable (pure-science process lesson; excluded from the score)."
  },

  "lesson-plan": {
    "headline": "Synthesize a scripted plan linking every resource",
    "inputs": [
      "Lesson context assembled from history (getLessonContext)",
      "Asset manifest of deep-linkable artifacts (getAssetManifest)",
      "Reading grade level (effectiveGrade) + topic (sourceTopic)",
      "Target language + custom additions (lessonCustomAdditions)",
      "STEM tool registry (for recommendations)"
    ],
    "outputs": [
      "A JSON object with materialsNeeded[], objectives[], essentialQuestion",
      "hook, directInstruction, guidedPractice, independentPractice, closure",
      "extensions[] of { title, description }",
      "Optional recommendedStemTools[] of { id, rationale, suggestedActivity }"
    ],
    "how": "The handler builds a CONTEXT from the run history plus a deep-link inventory, then asks an 'expert UDL Curriculum Designer' to write a scripted plan that names and [Title](resource:ID)-links the previously generated assets. The plan is placed last so it can cite everything already created.",
    "example": "ESSENTIAL QUESTION\nHow does a plant turn sunlight, air, and water into the food it needs — and why does that matter for us?\n\nOBJECTIVES\n• SWBAT explain that plants use sunlight to make their own food through photosynthesis.\n• SWBAT identify the inputs (sunlight, carbon dioxide, water) and outputs (glucose, oxygen).\n• SWBAT describe the roles of chlorophyll, stomata, and roots.\n\nHOOK (2–3 min)\nDisplay the [Inside a Leaf Diagram](resource:img-9912). Teacher says: \"Every bite of food you've ever eaten started with a leaf catching sunlight. Where do you think the plant's food gets made?\" Take a few predictions.\n\nDIRECT INSTRUCTION (12–15 min)\nRead the [Leveled Text](resource:lt-3481). Step 1 — chlorophyll captures the sun's energy. Step 2 — the plant takes in carbon dioxide through stomata and water through its roots (CFU: which gas comes IN, and where does water come from?). Step 3 — it combines them into glucose, \"a charged battery the plant saves.\" Step 4 — it releases oxygen, the same oxygen we breathe (CFU: why should an animal be glad a plant is doing photosynthesis?).\n\nGUIDED PRACTICE (10 min)\nAs a class, work the [Inputs vs. Outputs Concept Sort](resource:cs-5530), pausing on 'chlorophyll' — a tool, not an input.\n\nINDEPENDENT PRACTICE (8 min)\nStudents draw a labeled leaf with arrows for CO₂, water, sunlight, and oxygen, then finish: \"A plant makes glucose by ______.\"\n\nCLOSURE (5 min)\nAssign the [Exit Ticket Quiz](resource:qz-7741), then discuss: \"Without photosynthesis, most life on Earth could not survive — explain why in one sentence.\"\n\nRECOMMENDED STEM LAB TOOLS\n• cellInterior — see the chloroplasts where chlorophyll captures light.\n• moleculeBuilder — assemble CO₂ and H₂O and watch glucose and O₂ form."
  },

  "_final": {
    "headline": "Export the full pack with a readiness report",
    "inputs": [
      "The entire history[] of kept artifacts (serialized to a ~30K-char audit context)",
      "Target standards / standardsPromptString + gradeLevel",
      "DOK-tagged quiz items",
      "Export config (getExportableHistory, isWorksheet, isTeacher answer-key gating)"
    ],
    "outputs": [
      "A Standards & Readiness Report (reports[] + comprehensive{} across 9 dimensions)",
      "comprehensive.overall: readiness score 0–100, status, blockingIssues[]",
      "Status points: Aligned=20, Partially=12, Not Aligned=0 (a Not-Aligned dimension blocks auto-Pass)",
      "A single self-contained .html file bundling every kept artifact"
    ],
    "how": "Two things happen at the final step. The Standards Report runs a holistic audit — serializing every prior artifact, optionally checking each target standard, then scoring nine comprehensive dimensions into a 0–100 readiness roll-up. Separately, the teacher downloads the Full Resource Pack: one offline HTML file bundling every kept artifact.",
    "example": "STANDARDS & READINESS REPORT — \"How Plants Make Food: Photosynthesis\" (Grade 5)\n\nCURRICULUM READINESS SCORE: 78 / 100 — Pass with notes\nDimensions evaluated: 8 of 9 (Cultural responsiveness: Not applicable)\n\nSTANDARDS ALIGNMENT (NGSS 5-LS1-1 / 5-PS3-1) — Revise\n  Text · Aligned: the Simplified Text and Glossary teach that chlorophyll captures the sun's energy and the plant combines CO₂ and water to make glucose.\n  Activities · Partially Aligned: the Visual Organizer maps sunlight → glucose → oxygen, but no artifact asks students to MODEL the matter-and-energy transfer.\n  Assessment · Partially Aligned: exit-ticket items check recall; none trace energy from the Sun.\n  Recommendation: add a diagram/constructed-response item tracing energy from sunlight to stored glucose.\n\nVOCABULARY FIT · Partially Aligned — Tier 3 strong (chlorophyll, stomata, glucose, photosynthesis); add Tier-2 words (absorb, release, convert).\nENGAGEMENT VARIETY · Aligned — 6 artifact types, diversity 0.81; mix skews recall-heavy.\nACCESSIBILITY · Partially Aligned — 1 image with no alt text; 1 color-only reference (\"green pigment\").\nCONTENT ACCURACY · Aligned — 7 verified facts, 0 discrepancies.\nUDL · Partially Aligned — most pressing pillar: Action & Expression (only multiple-choice available).\nDIFFERENTIATION · Partially Aligned — add sentence frames for ELLs.\nCOGNITIVE LOAD · Aligned — claimed 45 min, estimated 41 min.\nCULTURAL RESPONSIVENESS · Not applicable.\n\nFULL RESOURCE PACK DOWNLOAD\nOne self-contained .html file bundling every kept artifact (Analysis, Glossary, Simplified Text, Visual Organizer, Exit Ticket, Lesson Plan) + this report, ready to open or print offline; students can save their answers to a file to hand in. (Answer keys and rubrics render only in the teacher answer-key section, which is included when the export's teacher-key option is on.)"
  }
};

function GuidedModeBanner({
  GUIDED_STEPS,
  allGuidedSteps,
  guidedSelectedIds,
  toggleGuidedStepId,
  GUIDED_TOUR_MAP,
  guidedStep,
  guidedEngaged,
  handleExitGuidedMode,
  handleGuidedSkip,
  setGuidedStep,
  setShowGuidedTip,
  showGuidedTip,
  t,
  tourSteps,
  history,
  getDefaultTitle,
  inputText,
  setInputText,
  guidedCompletedIds,
  guidedSkippedIds,
  guidedCreatedHistoryIds,
  wordSoundsHistory,
  currentUiLanguage,
  markGuidedStepDone,
  resetGuidedProgress,
  guidedPresets,
  applyGuidedPreset,
  guidedStepError,
  retryGuidedStep,
  isGuidedRetrying,
  openGuidedHistoryItem,
  guidedAutoAdvance,
  setGuidedAutoAdvance,
}) {
  // Every Guided step declares the existing translated tour strings it reuses.
  // This avoids heuristic title/text lookup and prevents English step content
  // from leaking into a non-English Guided session.
  const GUIDED_STEP_I18N_KEYS = {
    'source-input': ['tour.input_panel_title', 'tour.input_panel_text'],
    'analysis': ['tour.analysis_title', 'tour.analysis_text'],
    'glossary': ['tour.glossary_title', 'tour.glossary_text'],
    'simplified': ['tour.simplified_title', 'tour.simplified_text'],
    'ui-tool-wordsounds': ['tour.wordsounds_title', 'tour.wordsounds_text'],
    'outline': ['tour.outline_title', 'tour.outline_text'],
    'anchor-chart': ['tour.anchor_chart_title', 'tour.anchor_chart_text'],
    'image': ['tour.visual_title', 'tour.visual_text'],
    'faq': ['tour.faq_title', 'tour.faq_text'],
    'sentence-frames': ['tour.scaffolds_title', 'tour.scaffolds_text'],
    'note-taking': ['tour.note_taking_title', 'tour.note_taking_text'],
    'brainstorm': ['tour.brainstorm_title', 'tour.brainstorm_text'],
    'persona': ['tour.persona_title', 'tour.persona_text'],
    'timeline': ['tour.timeline_title', 'tour.timeline_text'],
    'concept-sort': ['tour.concept_sort_title', 'tour.concept_sort_text'],
    'dbq': ['tour.dbq_title', 'tour.dbq_text'],
    'math': ['tour.math_title', 'tour.math_text'],
    'adventure': ['tour.adventure_title', 'tour.adventure_text'],
    'quiz': ['tour.quiz_title', 'tour.quiz_text'],
    'alignment': ['tour.alignment_title', 'tour.alignment_text'],
    'lesson-plan': ['tour.lesson_plan_title', 'tour.lesson_plan_text'],
    '_final': ['tour.fullpack_title', 'tour.fullpack_text'],
  };
  const localizeStep = (sourceStep, field) => {
    if (!sourceStep || !sourceStep.id) return sourceStep?.[field] || '';
    const key = 'guided.steps.' + sourceStep.id + '.' + field;
    const translated = t(key);
    if (translated && translated !== key) return translated;
    if (currentUiLanguage && currentUiLanguage !== 'English' && (field === 'label' || field === 'action')) {
      const declaredKey = GUIDED_STEP_I18N_KEYS[sourceStep.id]?.[field === 'label' ? 0 : 1];
      const declaredValue = declaredKey ? t(declaredKey) : null;
      if (declaredValue && declaredValue !== declaredKey) return declaredValue;
      const tourId = GUIDED_TOUR_MAP[sourceStep.id];
      const tourEntry = tourId ? (tourSteps || []).find(entry => entry.id === tourId) : null;
      const tourValue = field === 'label' ? tourEntry?.title : tourEntry?.text;
      if (tourValue) return tourValue;
    }
    if (currentUiLanguage && currentUiLanguage !== 'English' && field === 'success') {
      return localizeStep(sourceStep, 'label') + ' ✓';
    }
    return sourceStep[field] || '';
  };
  const rawStep = GUIDED_STEPS[guidedStep] || {};
  const step = { ...rawStep, label: localizeStep(rawStep, 'label'), action: localizeStep(rawStep, 'action'), success: localizeStep(rawStep, 'success') };
  const isLast = guidedStep >= GUIDED_STEPS.length - 1;
  const _savedUiState = React.useRef((() => { try { return JSON.parse(localStorage.getItem('allo_guided_ui_state') || '{}'); } catch (_) { return {}; } })()).current;
  const [showPicker, setShowPicker] = React.useState(!!_savedUiState.showPicker);
  const [infoTab, setInfoTab] = React.useState(['how', 'example'].includes(_savedUiState.infoTab) ? _savedUiState.infoTab : null); // null | 'how' | 'example'
  const [isCollapsed, setIsCollapsed] = React.useState(!!_savedUiState.collapsed);
  const [showFullLesson, setShowFullLesson] = React.useState(false);
  const [sourceStale, setSourceStale] = React.useState(false);
  const [feedbackStepId, setFeedbackStepId] = React.useState('');
  const [feedbackSaved, setFeedbackSaved] = React.useState(false);
  const [pendingPreset, setPendingPreset] = React.useState(null);
  const [pendingStepId, setPendingStepId] = React.useState(null);
  const [showErrorDetails, setShowErrorDetails] = React.useState(false);
  const guidedBusy = !!isGuidedRetrying;
  const _sourceBaselineRef = React.useRef(String(inputText || '').trim());
  React.useEffect(() => { try { localStorage.setItem('allo_guided_ui_state', JSON.stringify({ collapsed: isCollapsed, showPicker, showAbout: !!showGuidedTip, infoTab })); } catch (_) {} }, [isCollapsed, showPicker, showGuidedTip, infoTab]);
  React.useEffect(() => { if (_savedUiState.showAbout && !showGuidedTip) setShowGuidedTip(true); }, []);
  React.useEffect(() => {
    const current = String(inputText || '').trim();
    const hasResources = Array.isArray(guidedCreatedHistoryIds) && guidedCreatedHistoryIds.length > 0;
    if (!hasResources) { _sourceBaselineRef.current = current; setSourceStale(false); return; }
    if (current !== _sourceBaselineRef.current) setSourceStale(true);
  }, [inputText, Array.isArray(guidedCreatedHistoryIds) ? guidedCreatedHistoryIds.length : 0]);
  // SR announce on detail-panel open and on the full-lesson modal opening — the visual
  // change is otherwise silent to screen-reader users.
  React.useEffect(() => {
    if (!infoTab || typeof window === 'undefined' || !window.alloAnnounce) return;
    window.alloAnnounce(infoTab === 'how' ? (t('guided.tab_how') || 'How it works') : (t('guided.tab_example') || 'Worked example'), 'polite');
  }, [infoTab]);
  React.useEffect(() => {
    if (showFullLesson && typeof window !== 'undefined' && window.alloAnnounce) window.alloAnnounce(t('guided.full_lesson_title') || 'The full worked lesson', 'polite');
  }, [showFullLesson]);
  const _modalRef = React.useRef(null);
  const _modalReturnRef = React.useRef(null);
  // Full-lesson modal a11y: trap focus inside the dialog, close on Escape, restore focus to the opener (dialog pattern).
  React.useEffect(() => {
    if (!showFullLesson) return;
    _modalReturnRef.current = (typeof document !== 'undefined') ? document.activeElement : null;
    const root = _modalRef.current;
    try { if (root) { const f = root.querySelector('button, a[href], [tabindex]:not([tabindex="-1"])'); (f || root).focus(); } } catch (_) {}
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); setShowFullLesson(false); return; }
      if (e.key === 'Tab' && root) {
        const items = root.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])');
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); try { last.focus(); } catch (_) {} }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); try { first.focus(); } catch (_) {} }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      try { const r = _modalReturnRef.current; if (r && r.focus && document.contains(r)) r.focus(); } catch (_) {}
    };
  }, [showFullLesson]);

  // --- "Done" must mean the step's tool actually produced output, not merely that the teacher
  // clicked the ringed tool. The monolith flips `guidedEngaged` on the first *click* of the
  // highlighted control (so the "Next step" affordance can appear), but the ✅ success note has to
  // wait for the real, often-async result — otherwise "Analysis done" flashed the instant the
  // panel was clicked, before Analyze had even run. Completion signal = a new history item appeared
  // since we arrived at this step. (2026-06-30)
  // Interaction-only steps create no generated history item, so they keep a real-but-coarse signal:
  // the source step keys on actual entered text; Word Sounds / STEM Lab / Adventure / the final
  // download fall back to the click (`guidedEngaged`) — the best signal available for those.
  const GUIDED_CLICK_STEPS = ['math'];
  // Which history types complete each generate step. Without this, ANY new history item
  // (a stray Ctrl+K generation, the unit builder, a different panel) flashed the current
  // step "done" — the baseline only checked that history GREW, not what grew.
  const STEP_HISTORY_TYPES = {
    'analysis': ['analysis'], 'glossary': ['glossary'], 'simplified': ['simplified'],
    'outline': ['outline'], 'anchor-chart': ['anchor-chart'], 'image': ['image'],
    'faq': ['faq'], 'sentence-frames': ['sentence-frames'], 'note-taking': ['note-taking'],
    'brainstorm': ['brainstorm'], 'persona': ['persona'], 'timeline': ['timeline'],
    'concept-sort': ['concept-sort'], 'dbq': ['dbq'], 'adventure': ['adventure'], 'quiz': ['quiz'],
    'alignment': ['alignment-report'], 'lesson-plan': ['lesson-plan'],
  };
  const _histLen = Array.isArray(history) ? history.length : 0;
  const _stepBaseRef = React.useRef(_histLen);
  const _prevStepRef = React.useRef(guidedStep);
  if (_prevStepRef.current !== guidedStep) {
    _prevStepRef.current = guidedStep;          // re-baseline synchronously on step change so a
    _stepBaseRef.current = _histLen;            // prior step's output can't flash this one "done"
  }
  const _matchTypes = STEP_HISTORY_TYPES[step.id] || null;
  const _newItems = (Array.isArray(history) && _histLen > _stepBaseRef.current) ? history.slice(_stepBaseRef.current) : [];
  const _generatedDone = _matchTypes
    ? _newItems.some(h => h && _matchTypes.indexOf(h.type) !== -1)
    : (_histLen > _stepBaseRef.current); // unknown future steps keep the coarse growth signal
  const _wordSoundsBaseRef = React.useRef(Array.isArray(wordSoundsHistory) ? wordSoundsHistory.length : 0);
  const _wordSoundsDone = Array.isArray(wordSoundsHistory) && wordSoundsHistory.length > _wordSoundsBaseRef.current;
  const _computedDone =
    step.id === 'source-input' ? ((inputText || '').trim().length > 20) :
    step.id === 'ui-tool-wordsounds' ? _wordSoundsDone :
    GUIDED_CLICK_STEPS.indexOf(step.id) !== -1 ? !!guidedEngaged :
    _generatedDone;
  // Completion survives navigation: once a step's tool produced output, revisiting it via
  // Back keeps the ✅ (the host persists guidedCompletedIds in saves + localStorage). The
  // source step stays live-computed — its "done" legitimately un-does if the text is cleared.
  const _completedSet = Array.isArray(guidedCompletedIds) ? guidedCompletedIds : [];
  const stepDone = _computedDone || (step.id !== 'source-input' && _completedSet.indexOf(step.id) !== -1);
  React.useEffect(() => {
    if (_computedDone && step.id && step.id !== 'source-input' && typeof markGuidedStepDone === 'function') markGuidedStepDone(step.id);
  }, [_computedDone, step.id]);

  // --- About-panel read-aloud: reuse the app's TTS (window.callTTS, the teacher's selected voice)
  // so a step explanation can be listened to instead of read. Leak-safe: the blob URL is revoked
  // when playback ends, the step changes, the panel closes, or the banner unmounts. A generation
  // token cancels an in-flight synth cleanly if the teacher stops or navigates mid-load. (2026-06-30)
  const [ttsState, setTtsState] = React.useState('idle'); // 'idle' | 'loading' | 'playing'
  const _ttsAudioRef = React.useRef(null);
  const _ttsUrlRef = React.useRef(null);
  const _ttsGenRef = React.useRef(0);
  const _stopTts = React.useCallback(() => {
    _ttsGenRef.current++;
    const a = _ttsAudioRef.current; _ttsAudioRef.current = null;
    if (a) { try { a.pause(); a.src = ''; } catch (_) {} }
    const u = _ttsUrlRef.current; _ttsUrlRef.current = null;
    if (u) { try { URL.revokeObjectURL(u); } catch (_) {} }
    setTtsState('idle');
  }, []);
  React.useEffect(() => _stopTts, [_stopTts]);                         // stop on unmount
  React.useEffect(() => { _stopTts(); }, [guidedStep, showGuidedTip, _stopTts]); // ...and on step/panel change
  const playAbout = async (rawText) => {
    if (ttsState !== 'idle') { _stopTts(); return; }                  // toggle: a second click stops
    if (typeof window === 'undefined' || typeof window.callTTS !== 'function') return;
    const plain = String(rawText || '').replace(/[#*`_>]/g, '').replace(/\s+/g, ' ').trim();
    if (!plain) return;
    const myGen = ++_ttsGenRef.current;
    setTtsState('loading');
    let url = null;
    try { url = await window.callTTS(plain, (window.__alloSelectedVoice || 'Puck'), (window.__alloPlaybackRate || 1), { maxRetries: 2 }); } catch (_) { url = null; }
    if (myGen !== _ttsGenRef.current) { if (url) { try { URL.revokeObjectURL(url); } catch (_) {} } return; } // superseded
    if (!url) { setTtsState('idle'); return; }
    _ttsUrlRef.current = url;
    const audio = new Audio(url); _ttsAudioRef.current = audio;
    audio.onended = _stopTts; audio.onerror = _stopTts;
    try { await audio.play(); if (myGen === _ttsGenRef.current) setTtsState('playing'); else _stopTts(); }
    catch (_) { _stopTts(); }
  };
  const allSteps = allGuidedSteps || GUIDED_STEPS;
  // null selection = every step on; source-input is always on (the pipeline needs it).
  const isStepOn = (id) => !guidedSelectedIds || id === 'source-input' || guidedSelectedIds.indexOf(id) !== -1;
  // End-of-flow recap: what the teacher actually built (from history).
  const humanize = (type) => (getDefaultTitle ? getDefaultTitle(type) : String(type || '').replace(/[-_]/g, ' '));
  const _createdIdSet = new Set(Array.isArray(guidedCreatedHistoryIds) ? guidedCreatedHistoryIds : []);
  const recapItems = isLast ? (history || []).filter(h => h && h.id && _createdIdSet.has(h.id)).map(item => ({ item, title: item.title || humanize(item.type) })) : [];
  const skippedStepEntries = (GUIDED_STEPS || []).map((item, index) => ({ item, index })).filter(entry => (guidedSkippedIds || []).includes(entry.item.id));
  const _activeIdSet = new Set((GUIDED_STEPS || []).map(s => s && s.id).filter(Boolean));
  const _effectiveCompletedSet = new Set((guidedCompletedIds || []).filter(id => _activeIdSet.has(id)));
  if (String(inputText || '').trim().length > 20 && _activeIdSet.has('source-input')) _effectiveCompletedSet.add('source-input');
  const completedCount = _effectiveCompletedSet.size;
  const skippedCount = (guidedSkippedIds || []).filter(id => _activeIdSet.has(id)).length;
  const hasGuidedProgress = completedCount > 0 || skippedCount > 0 || (guidedCreatedHistoryIds || []).length > 0;
  const detailEntry = (typeof GUIDED_DETAIL !== 'undefined' && GUIDED_DETAIL[step.id]) || null;
  const _gdTab = (on) => ({ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '7px 8px', fontSize: '12px', fontWeight: 700, color: on ? '#fde68a' : '#c7d2fe', background: on ? 'rgba(251,191,36,0.16)' : 'rgba(255,255,255,0.06)', border: '1px solid ' + (on ? 'rgba(251,191,36,0.55)' : 'rgba(165,180,252,0.3)'), borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' });
  const _gdPanel = { marginBottom: '10px', padding: '11px 13px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' };
  const _gdIo = { fontSize: '12px', fontWeight: 800, color: 'rgba(129,140,248,0.95)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '8px 0 4px' };
  const _gdLi = { fontSize: '12px', color: 'rgba(203,213,225,0.92)', lineHeight: '1.5', marginBottom: '3px', display: 'flex', gap: '6px' };
  const _gdPre = { margin: '6px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px', lineHeight: '1.6', color: 'rgba(226,232,240,0.92)', fontFamily: 'inherit', background: 'rgba(15,23,42,0.55)', borderRadius: '8px', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)' };
  const STEP_META = { 'source-input': ['1–2 min', 'manual'], 'ui-tool-wordsounds': ['2–4 min', 'interactive'], math: ['3–8 min', 'interactive'], image: ['1–3 min', 'image_ai'], '_final': ['1 min', 'export'] };
  const stepMeta = STEP_META[step.id] || ['1–2 min', 'ai_generation'];
  const guidedErrorText = !guidedStepError ? '' : typeof guidedStepError === 'string' ? guidedStepError : guidedStepError.message || (() => { try { return JSON.stringify(guidedStepError); } catch (_) { return String(guidedStepError); } })();
  const _errorLower = guidedErrorText.toLowerCase();
  const guidedErrorGuidance = _errorLower.includes('network') || _errorLower.includes('fetch') || _errorLower.includes('connection') ? (t('guided.error_network') || 'Check your connection, then try again.') : _errorLower.includes('rate') || _errorLower.includes('quota') ? (t('guided.error_rate_limit') || 'The service is busy. Wait a moment, then retry.') : step.id === 'image' ? (t('guided.error_image') || 'Check the image settings or try a simpler visual request.') : (t('guided.error_default') || 'Review the source and settings, then retry. Your completed work is safe.');
  const presetStepIds = (preset) => Array.isArray(preset?.stepIds) ? Array.from(new Set(['source-input', ...preset.stepIds, '_final'])) : allSteps.map(item => item.id);
  const isPresetActive = (preset) => { const a = presetStepIds(preset).slice().sort(); const b = (guidedSelectedIds || allSteps.map(item => item.id)).slice().sort(); return a.length === b.length && a.every((id, index) => id === b[index]); };
  const choosePreset = (preset) => { if (guidedBusy) return; if (hasGuidedProgress && !isPresetActive(preset)) setPendingPreset(preset); else { applyGuidedPreset(preset); setShowPicker(false); } };
  const confirmPreset = () => { if (!pendingPreset) return; applyGuidedPreset(pendingPreset); setPendingPreset(null); setShowPicker(false); };
  const chooseStepToggle = (id) => { if (guidedBusy) return; if (hasGuidedProgress) setPendingStepId(id); else toggleGuidedStepId(id); };
  const confirmStepToggle = () => { if (!pendingStepId) return; toggleGuidedStepId(pendingStepId); setPendingStepId(null); };
  const saveFeedback = () => {
    if (!feedbackStepId) return;
    try { const prior = JSON.parse(localStorage.getItem('allo_guided_feedback') || '[]'); const entry = { stepId: feedbackStepId === 'none' ? null : feedbackStepId, completedCount, skippedCount, at: new Date().toISOString() }; localStorage.setItem('allo_guided_feedback', JSON.stringify([...(Array.isArray(prior) ? prior : []), entry].slice(-50))); setFeedbackSaved(true); } catch (_) {}
  };
  return (
    <>
      <style>{`@keyframes alloGuidedTargetPulse{0%,100%{outline-color:rgba(99,102,241,.8);box-shadow:0 0 0 2px rgba(99,102,241,.7),0 0 22px rgba(99,102,241,.45)}50%{outline-color:rgba(129,140,248,1);box-shadow:0 0 0 3px rgba(129,140,248,.95),0 0 36px rgba(99,102,241,.65)}}.allo-guided-target{outline:3px solid rgba(99,102,241,.8)!important;outline-offset:3px;animation:alloGuidedTargetPulse 2s ease-in-out infinite}.allo-guided-banner button,.allo-guided-banner select{min-height:40px}.allo-guided-banner button:disabled,.allo-guided-banner select:disabled{cursor:not-allowed!important;opacity:.58!important}body:has([aria-modal="true"]) .allo-guided-target{animation-play-state:paused!important;outline-color:transparent!important;box-shadow:none!important}@media (forced-colors:active){.allo-guided-target{outline:3px solid Highlight!important;box-shadow:none!important}.allo-guided-banner{border:1px solid CanvasText!important}}@media (max-width:480px){.allo-guided-banner{padding:12px!important;border-radius:14px!important;overflow-wrap:anywhere}}@media (prefers-reduced-motion: reduce){.allo-guided-target{animation:none !important}.allo-guided-banner *,.allo-guided-dialog *{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important;scroll-behavior:auto !important}}`}</style>
      <div className="allo-guided-banner" role="region" aria-label={t('guided.indicator_title') || 'Guided mode'} style={{ background: 'linear-gradient(135deg, #312e81, #1e3a5f)', borderRadius: '20px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(99,102,241,0.3)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: isCollapsed ? 0 : '8px' }}>
          <div style={{ minWidth: 0 }}><span style={{ fontSize: '13px', fontWeight: 800, color: 'white', display: 'block' }}>{t('guided.indicator_title')}</span>{isCollapsed && <span style={{ display: 'block', fontSize: '12px', color: '#c7d2fe', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{step.label || 'Complete!'}</span>}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}><span style={{ fontSize: '12px', color: '#c7d2fe', fontWeight: 600 }}>{t('guided.step_of').replace('{current}', Math.min(guidedStep + 1, GUIDED_STEPS.length)).replace('{total}', GUIDED_STEPS.length)}</span><button type="button" aria-expanded={!isCollapsed} aria-controls="guided-banner-details" aria-label={isCollapsed ? (t('guided.expand') || 'Expand Guided Mode') : (t('guided.collapse') || 'Collapse Guided Mode')} onClick={() => setIsCollapsed(v => !v)} style={{ minWidth: '38px', minHeight: '38px', padding: '6px 9px', color: 'white', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', borderRadius: '9px', cursor: 'pointer' }}>{isCollapsed ? '▾' : '▴'}</button></div>
        </div>
        {!isCollapsed && <div id="guided-banner-details">
        <p style={{ fontSize: '13px', color: '#e0e7ff', margin: '0 0 6px', fontWeight: 700 }}>{step.label || (t('guided.complete') || 'Complete!')}</p>
        <div role="group" aria-label={t('guided.estimate_label') || 'Step estimate'} style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}><span style={{ fontSize: '12px', color: '#e0e7ff', background: 'rgba(255,255,255,.08)', borderRadius: '999px', padding: '3px 8px' }}>{stepMeta[0]}</span><span style={{ fontSize: '12px', color: '#e0e7ff', background: 'rgba(255,255,255,.08)', borderRadius: '999px', padding: '3px 8px' }}>{t('guided.kind_' + stepMeta[1]) || stepMeta[1]}</span></div>
        <label htmlFor="guided-step-jump" style={{ display: 'block', fontSize: '12px', color: '#c7d2fe', marginBottom: '4px', fontWeight: 700 }}>{t('guided.jump_to_step') || 'Jump to step'}</label>
        <select id="guided-step-jump" value={guidedStep} disabled={guidedBusy} onChange={(event) => setGuidedStep(Number(event.target.value))} style={{ width: '100%', minHeight: '40px', marginBottom: '10px', padding: '7px 9px', borderRadius: '9px', border: '1px solid rgba(165,180,252,.45)', background: '#172554', color: 'white', fontSize: '13px', opacity: guidedBusy ? .65 : 1 }}>{GUIDED_STEPS.map((item, index) => <option key={item.id} value={index}>{index + 1}. {localizeStep(item, 'label')}</option>)}</select>
        {/* Segmented progress: one tick per active step — completed (green) / current (glowing indigo) /
            upcoming (dim). Makes "you've finished N steps" visible, especially after resuming a saved tour
            (mirrors the persisted completedSteps = steps before the current index). */}
        <div role="progressbar" aria-valuenow={Math.min(guidedStep + 1, GUIDED_STEPS.length)} aria-valuemin={1} aria-valuemax={GUIDED_STEPS.length} aria-label={(t('guided.progress_label') || 'Guided tour progress') + ': ' + Math.min(guidedStep + 1, GUIDED_STEPS.length) + '/' + GUIDED_STEPS.length} style={{ display: 'flex', gap: GUIDED_STEPS.length > 14 ? '2px' : '3px', marginBottom: '12px' }}>
          {GUIDED_STEPS.map((s, i) => {
            const done = _effectiveCompletedSet.has(s.id);
            const skipped = Array.isArray(guidedSkippedIds) && guidedSkippedIds.includes(s.id);
            const current = i === guidedStep;
            return <div key={s.id || i} aria-hidden="true" title={localizeStep(s, 'label')} style={{ flex: 1, height: '5px', borderRadius: '3px', background: current ? 'linear-gradient(90deg, #818cf8, #6366f1)' : done ? 'linear-gradient(90deg, #34d399, #10b981)' : skipped ? 'repeating-linear-gradient(135deg, rgba(251,191,36,.7) 0 3px, rgba(251,191,36,.25) 3px 6px)' : 'rgba(255,255,255,0.12)', boxShadow: current ? '0 0 8px rgba(99,102,241,0.6)' : 'none', transition: 'background 0.3s ease-out' }} />;
          })}
        </div>
        {step.action && (
          <div role="status" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: stepDone ? 'rgba(34,197,94,0.14)' : 'rgba(99,102,241,0.18)', border: '1px solid ' + (stepDone ? 'rgba(74,222,128,0.4)' : 'rgba(129,140,248,0.35)'), borderRadius: '12px', padding: '10px 12px', marginBottom: '10px' }}>
            <span aria-hidden="true" style={{ fontSize: '14px', lineHeight: '1.4' }}>{stepDone ? '✅' : '👉'}</span>
            <span style={{ fontSize: '13px', color: 'white', fontWeight: 600, lineHeight: '1.5' }}>{stepDone ? (step.success || step.action) : step.action}</span>
          </div>
        )}
        {guidedBusy && <div role="status" aria-live="polite" style={{ marginBottom: '10px', padding: '9px 11px', borderRadius: '10px', background: 'rgba(59,130,246,.18)', border: '1px solid rgba(147,197,253,.4)', color: '#dbeafe', fontSize: '12px', fontWeight: 700 }}>{t('guided.generating_lock') || 'Generating this resource. Step navigation is paused until it finishes.'}</div>}
        {guidedStepError && (
          <div role="alert" style={{ marginBottom: '10px', padding: '11px 12px', background: 'rgba(127,29,29,.35)', border: '1px solid rgba(248,113,113,.65)', borderRadius: '12px' }}>
            <div style={{ color: 'white', fontSize: '13px', fontWeight: 800 }}>{t('guided.error_title') || 'This step did not finish'}</div>
            <div style={{ color: '#fecaca', fontSize: '12px', lineHeight: 1.5, margin: '4px 0 8px' }}>{guidedErrorGuidance}</div>
            <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}><button type="button" disabled={guidedBusy} onClick={retryGuidedStep} style={{ minHeight: '40px', padding: '7px 11px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.25)', background: '#b91c1c', color: 'white', fontWeight: 800, opacity: guidedBusy ? .65 : 1 }}>{guidedBusy ? (t('guided.retrying') || 'Retrying…') : (t('guided.retry') || 'Retry')}</button>{guidedStep > 0 && <button type="button" disabled={guidedBusy} onClick={() => handleGuidedSkip(true)} style={{ minHeight: '40px', padding: '7px 11px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.25)', background: 'rgba(255,255,255,.08)', color: 'white', opacity: guidedBusy ? .65 : 1 }}>{t('guided.skip_for_now') || 'Skip for now'}</button>}<button type="button" aria-expanded={showErrorDetails} onClick={() => setShowErrorDetails(value => !value)} style={{ minHeight: '40px', padding: '7px 11px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.25)', background: 'transparent', color: '#fecaca' }}>{showErrorDetails ? (t('guided.hide_details') || 'Hide details') : (t('guided.view_details') || 'View details')}</button></div>
            {showErrorDetails && <pre style={{ margin: '8px 0 0', padding: '8px', maxHeight: '100px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', borderRadius: '7px', background: 'rgba(15,23,42,.65)', color: '#fecaca', fontSize: '12px' }}>{guidedErrorText}</pre>}
          </div>
        )}
        {sourceStale && (
          <div role="alert" style={{ marginBottom: '10px', padding: '11px 12px', background: 'rgba(120,53,15,.3)', border: '1px solid rgba(251,191,36,.55)', borderRadius: '12px', color: '#fef3c7', fontSize: '12px' }}><strong style={{ display: 'block', color: 'white', marginBottom: '4px', fontSize: '13px' }}>{t('guided.source_changed_title') || 'Source changed after resources were created'}</strong>{t('guided.source_changed_text') || 'Earlier resources may no longer match this source.'}<div style={{ display: 'flex', gap: '7px', marginTop: '8px', flexWrap: 'wrap' }}><button type="button" disabled={guidedBusy} onClick={() => setGuidedStep(0)} style={{ minHeight: '40px', padding: '7px 10px', borderRadius: '7px', border: 0, fontWeight: 800, opacity: guidedBusy ? .65 : 1 }}>{t('guided.review_source') || 'Review source'}</button><button type="button" disabled={guidedBusy} onClick={() => { _sourceBaselineRef.current = String(inputText || '').trim(); setSourceStale(false); }} style={{ minHeight: '40px', padding: '7px 10px', borderRadius: '7px', border: '1px solid rgba(255,255,255,.25)', background: 'transparent', color: 'white', opacity: guidedBusy ? .65 : 1 }}>{t('guided.keep_working') || 'Keep working'}</button></div></div>
        )}
        {step.id === 'source-input' && !stepDone && typeof setInputText === 'function' && (
          <button type="button" disabled={guidedBusy} onClick={() => setInputText(GUIDED_SAMPLE_TEXT)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', padding: '8px 12px', marginBottom: '10px', fontSize: '12px', fontWeight: 700, color: '#e0e7ff', background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(165,180,252,0.5)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <span aria-hidden="true">✨</span>{t('guided.try_example') || 'New here? Try it with an example passage'}
          </button>
        )}
        {detailEntry && step.id !== 'source-input' && (
          <div style={{ marginBottom: '10px' }}>
            <div role="group" aria-label={t('guided.detail_tablist') || 'Section detail'} style={{ display: 'flex', gap: '6px', marginBottom: infoTab ? '8px' : '0' }}>
              <button type="button" id="gd-detail-how" aria-expanded={infoTab === 'how'} aria-controls="gd-panel-how" onClick={() => setInfoTab(infoTab === 'how' ? null : 'how')} style={_gdTab(infoTab === 'how')}>
                <span aria-hidden="true">⚙️</span>{t('guided.tab_how') || 'How it works'}
              </button>
              <button type="button" id="gd-detail-example" aria-expanded={infoTab === 'example'} aria-controls="gd-panel-example" onClick={() => setInfoTab(infoTab === 'example' ? null : 'example')} style={_gdTab(infoTab === 'example')}>
                <span aria-hidden="true">💡</span>{t('guided.tab_example') || 'Worked example'}
              </button>
            </div>
            {infoTab === 'how' && (
              <div role="region" id="gd-panel-how" aria-labelledby="gd-detail-how" style={_gdPanel}>
                {detailEntry.headline && <div style={{ fontSize: '12px', fontWeight: 800, color: 'rgba(199,210,254,0.96)', marginBottom: '2px' }}>{detailEntry.headline}</div>}
                <div style={_gdIo}>{t('guided.io_inputs') || 'Inputs'}</div>
                {(detailEntry.inputs || []).map((x, i) => <div key={'in' + i} style={_gdLi}><span aria-hidden="true" style={{ color: '#818cf8' }}>▸</span><span>{x}</span></div>)}
                <div style={_gdIo}>{t('guided.io_outputs') || 'Outputs'}</div>
                {(detailEntry.outputs || []).map((x, i) => <div key={'out' + i} style={_gdLi}><span aria-hidden="true" style={{ color: '#34d399' }}>▸</span><span>{x}</span></div>)}
                {detailEntry.how && <React.Fragment><div style={_gdIo}>{t('guided.io_how') || 'How it works'}</div><p style={{ fontSize: '12px', color: 'rgba(203,213,225,0.92)', lineHeight: '1.6', margin: '0' }}>{detailEntry.how}</p></React.Fragment>}
                <div style={{ fontSize: '12px', color: 'rgba(148,163,184,0.75)', marginTop: '8px', fontStyle: 'italic' }}>{t('guided.io_verified') || 'Verified against the actual tool behavior in AlloFlow.'}</div>
              </div>
            )}
            {infoTab === 'example' && (
              <div role="region" id="gd-panel-example" aria-labelledby="gd-detail-example" style={_gdPanel}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#fde68a', marginBottom: '2px' }}>💡 {t('guided.example_heading') || 'Example output'} · {t('guided.example_lesson') || 'Photosynthesis'}</div>
                <div style={{ fontSize: '12px', color: 'rgba(148,163,184,0.8)', marginBottom: '2px' }}>{t('guided.example_consistent') || 'The same lesson runs through every step.'}</div>
                <pre style={_gdPre}>{detailEntry.example}</pre>
                <button type="button" onClick={() => setShowFullLesson(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', marginTop: '8px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, color: '#e0e7ff', background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(129,140,248,0.45)', borderRadius: '10px', cursor: 'pointer' }}>
                  <span aria-hidden="true">📖</span>{t('guided.view_full_lesson') || 'View the full worked lesson'}
                </button>
              </div>
            )}
          </div>
        )}
        {isLast && (
          <div role="status" style={{ marginBottom: '10px', padding: '11px 13px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(74,222,128,0.35)', borderRadius: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'white', marginBottom: '6px' }}>🎉 {t('guided.recap_title') || 'Your lesson is built'}</div>
            <div role="list" aria-label={t('guided.summary_label') || 'Guided Mode completion summary'} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px', marginBottom: '9px' }}>
              {[
                [t('guided.summary_completed') || 'Completed', completedCount, '#6ee7b7'],
                [t('guided.summary_skipped') || 'Skipped', skippedCount, '#fcd34d'],
                [t('guided.summary_resources') || 'Resources', recapItems.length, '#c7d2fe'],
              ].map(([label, value, color]) => (
                <div role="listitem" key={label} style={{ minWidth: 0, padding: '7px 6px', textAlign: 'center', borderRadius: '9px', background: 'rgba(15,23,42,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '15px', lineHeight: 1, fontWeight: 900, color }}>{value}</div>
                  <div style={{ marginTop: '3px', fontSize: '12px', lineHeight: 1.2, fontWeight: 800, color: 'rgba(226,232,240,0.82)', textTransform: 'uppercase', letterSpacing: '0.04em', overflowWrap: 'anywhere' }}>{label}</div>
                </div>
              ))}
            </div>
            {recapItems.length > 0 ? (
              <>
                <div style={{ fontSize: '12px', color: 'rgba(203,213,225,0.9)', marginBottom: '6px' }}>{(t('guided.recap_count') || 'You created {n} resources:').replace('{n}', recapItems.length)}</div>
                <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                  {recapItems.slice(0, 12).map((entry, i) => (
                    <button type="button" key={entry.item.id || i} onClick={() => openGuidedHistoryItem && openGuidedHistoryItem(entry.item)} disabled={!openGuidedHistoryItem} style={{ width: '100%', fontSize: '12px', color: 'white', display: 'flex', gap: '6px', marginBottom: '2px', alignItems: 'flex-start', textAlign: 'left', padding: '3px 4px', border: 0, borderRadius: '6px', background: 'transparent', cursor: openGuidedHistoryItem ? 'pointer' : 'default' }}>
                      <span aria-hidden="true" style={{ color: '#4ade80' }}>✓</span><span>{entry.title}</span>
                    </button>
                  ))}
                  {recapItems.length > 12 && <div style={{ fontSize: '12px', color: 'rgba(203,213,225,0.7)' }}>+{recapItems.length - 12} {t('guided.recap_more') || 'more'}</div>}
                </div>
              </>
            ) : (
              <div style={{ fontSize: '12px', color: 'rgba(203,213,225,0.9)' }}>{t('guided.recap_empty') || 'Generate resources from the tools, then download your full pack below.'}</div>
            )}
            {skippedStepEntries.length > 0 && <div style={{ marginTop: '10px' }}><div style={{ color: '#fde68a', fontSize: '12px', fontWeight: 800, marginBottom: '5px' }}>{t('guided.review_skipped') || 'Review skipped steps'}</div><div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>{skippedStepEntries.map(entry => <button type="button" disabled={guidedBusy} key={entry.item.id} onClick={() => setGuidedStep(entry.index)} style={{ padding: '7px 9px', borderRadius: '7px', border: '1px solid rgba(251,191,36,.35)', background: 'rgba(251,191,36,.08)', color: '#fef3c7', fontSize: '12px' }}>{localizeStep(entry.item, 'label')}</button>)}</div></div>}
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,.1)' }}><label htmlFor="guided-feedback-step" style={{ display: 'block', color: '#c7d2fe', fontSize: '12px', marginBottom: '5px', lineHeight: 1.45 }}>{t('guided.feedback_prompt') || 'Optional reflection (saved only on this device): which step was most confusing?'}</label><div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}><select id="guided-feedback-step" value={feedbackStepId} onChange={e => { setFeedbackStepId(e.target.value); setFeedbackSaved(false); }} style={{ minWidth: '160px', flex: 1, padding: '7px', borderRadius: '7px' }}><option value="">{t('guided.feedback_choose') || 'Choose a step'}</option><option value="none">{t('guided.feedback_none') || 'No confusing step'}</option>{GUIDED_STEPS.map(item => <option key={item.id} value={item.id}>{localizeStep(item, 'label')}</option>)}</select><button type="button" disabled={!feedbackStepId || guidedBusy} onClick={saveFeedback} style={{ padding: '7px 10px', borderRadius: '7px', border: 0, fontWeight: 800 }}>{t('guided.feedback_save') || 'Save reflection'}</button></div>{feedbackSaved && <div role="status" style={{ color: '#6ee7b7', fontSize: '12px', marginTop: '5px' }}>{t('guided.feedback_saved') || 'Thanks — your reflection is saved only on this device.'}</div>}</div>
            <div style={{ fontSize: '12px', color: 'rgba(203,213,225,0.8)', marginTop: '8px', fontStyle: 'italic' }}>{t('guided.recap_hub') || 'Looking for more? The Learning Hub has StoryForge, PoetTree, and LitLab.'}</div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {guidedStep > 0 && <button type="button" disabled={guidedBusy} onClick={() => setGuidedStep(s => Math.max(0, s - 1))} aria-label={t('guided.back') || 'Back'} title={t('guided.back') || 'Back'} style={{ padding: '6px 10px', fontSize: '12px', fontWeight: 800, color: '#c7d2fe', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}>{t('guided.back') || '← Back'}</button>}
          {step.id === 'source-input' && !stepDone && <span style={{ flex: 1, padding: '6px 12px', fontSize: '12px', fontWeight: 700, color: 'rgba(199,210,254,0.85)', fontStyle: 'italic', textAlign: 'center' }}>{t('guided.source_prompt')}</span>}
          {!isLast && stepDone && <button type="button" disabled={guidedBusy} onClick={() => handleGuidedSkip(false)} style={{ flex: 1, padding: '6px 12px', fontSize: '12px', fontWeight: 800, color: 'white', background: 'linear-gradient(135deg, #818cf8, #6366f1)', border: '1px solid rgba(129,140,248,0.45)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>{t('guided.next_step') || 'Next step →'}</button>}
          {!isLast && !stepDone && guidedStep > 0 && <button type="button" disabled={guidedBusy} onClick={() => handleGuidedSkip(true)} style={{ flex: 1, padding: '6px 12px', fontSize: '12px', fontWeight: 800, color: '#c7d2fe', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>{t('guided.skip_step') || t('guided.skip') || 'Skip step'}</button>}
          {isLast && <button type="button" disabled={guidedBusy} onClick={() => { if (typeof resetGuidedProgress === 'function') resetGuidedProgress(); else setGuidedStep(0); handleExitGuidedMode(); }} style={{ flex: 1, padding: '6px 12px', fontSize: '12px', fontWeight: 700, color: 'white', background: 'linear-gradient(135deg, #818cf8, #6366f1)', border: 'none', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>{t('guided.all_done')}</button>}
          {toggleGuidedStepId && <button type="button" disabled={guidedBusy} onClick={() => setShowPicker(p => !p)} aria-label={t('guided.customize') || 'Choose which steps to include'} aria-expanded={showPicker} aria-controls="guided-step-picker" title={t('guided.customize') || 'Choose which steps to include'} style={{ padding: '6px 10px', fontSize: '12px', fontWeight: 700, color: showPicker ? 'white' : '#c7d2fe', background: showPicker ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>⚙</button>}
          <button type="button" onClick={() => setShowGuidedTip(p => !p)} aria-expanded={showGuidedTip} aria-controls="guided-about-panel" style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 700, color: showGuidedTip ? 'white' : '#c7d2fe', background: showGuidedTip ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>{showGuidedTip ? '✕' : 'ℹ️'} {t('guided.about')}</button>
          <button type="button" disabled={guidedBusy} onClick={handleExitGuidedMode} title={t('guided.resume_later_hint') || 'Save your place and return from Setup'} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 700, color: '#fde68a', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>{t('guided.resume_later') || 'Resume later'}</button>
        </div>
        {showPicker && toggleGuidedStepId && (
          <div id="guided-step-picker" role="group" aria-label={t('guided.choose_steps') || 'Choose which steps to include'} style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '340px', overflowY: 'auto', animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'rgba(165,180,252,0.95)', marginBottom: '8px' }}>{t('guided.choose_steps') || 'Choose which steps to include'} ({allSteps.filter(s => isStepOn(s.id)).length}/{allSteps.length})</div>
            {Array.isArray(guidedPresets) && typeof applyGuidedPreset === 'function' && <div role="group" aria-label={t('guided.preset_group') || 'Goal-based Guided Mode paths'} style={{ display: 'grid', gap: '7px', marginBottom: '10px' }}>{guidedPresets.map(preset => { const active = isPresetActive(preset); const count = presetStepIds(preset).length; return <button type="button" key={preset.id} disabled={guidedBusy} aria-pressed={active} onClick={() => choosePreset(preset)} style={{ textAlign: 'left', padding: '9px 10px', borderRadius: '9px', border: '1px solid ' + (active ? '#6ee7b7' : 'rgba(129,140,248,.35)'), background: active ? 'rgba(16,185,129,.18)' : 'rgba(99,102,241,.12)', color: 'white' }}><strong style={{ display: 'block', fontSize: '13px' }}>{t('guided.preset_' + preset.id + '_label') || preset.label}{active ? ' ' + (t('guided.preset_active') || '(active)') : ''}</strong><span style={{ display: 'block', color: '#c7d2fe', fontSize: '12px', marginTop: '3px', lineHeight: 1.4 }}>{t('guided.preset_' + preset.id + '_description') || preset.description}</span><span style={{ display: 'block', color: '#a7f3d0', fontSize: '12px', marginTop: '4px' }}>{(t('guided.preset_meta') || '{count} steps · about {minutes} min').replace('{count}', count).replace('{minutes}', Math.max(4, count * 2))}</span></button>; })}</div>}
            {pendingPreset && <div role="alert" style={{ marginBottom: '10px', padding: '10px', borderRadius: '9px', border: '1px solid rgba(251,191,36,.55)', background: 'rgba(120,53,15,.3)', color: '#fef3c7', fontSize: '12px' }}><strong style={{ display: 'block', color: 'white', marginBottom: '4px' }}>{t('guided.preset_confirm_title') || 'Change Guided path?'}</strong>{t('guided.preset_confirm_text') || 'This restarts Guided progress. Your generated resources remain in History.'}<div style={{ display: 'flex', gap: '7px', marginTop: '8px' }}><button type="button" onClick={confirmPreset} style={{ flex: 1, padding: '7px', borderRadius: '7px', border: 0, fontWeight: 800 }}>{t('guided.change_path') || 'Change path'}</button><button type="button" onClick={() => setPendingPreset(null)} style={{ flex: 1, padding: '7px', borderRadius: '7px', border: '1px solid rgba(255,255,255,.25)', background: 'transparent', color: 'white' }}>{t('common.cancel') || 'Cancel'}</button></div></div>}
            {pendingStepId && <div role="alert" style={{ marginBottom: '10px', padding: '10px', borderRadius: '9px', border: '1px solid rgba(251,191,36,.55)', background: 'rgba(120,53,15,.3)', color: '#fef3c7', fontSize: '12px' }}><strong style={{ display: 'block', color: 'white', marginBottom: '4px' }}>{t('guided.step_change_confirm_title') || 'Change included steps?'}</strong>{t('guided.step_change_confirm_text') || 'This returns Guided Mode to step 1. Completed resources remain in History.'}<div style={{ display: 'flex', gap: '7px', marginTop: '8px' }}><button type="button" onClick={confirmStepToggle} style={{ flex: 1, padding: '7px', borderRadius: '7px', border: 0, fontWeight: 800 }}>{t('guided.change_steps') || 'Change steps'}</button><button type="button" onClick={() => setPendingStepId(null)} style={{ flex: 1, padding: '7px', borderRadius: '7px', border: '1px solid rgba(255,255,255,.25)', background: 'transparent', color: 'white' }}>{t('common.cancel') || 'Cancel'}</button></div></div>}            {typeof setGuidedAutoAdvance === 'function' && <button type="button" role="switch" aria-checked={!!guidedAutoAdvance} disabled={guidedBusy} onClick={() => setGuidedAutoAdvance(value => !value)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: '100%', padding: '9px 10px', marginBottom: '10px', borderRadius: '9px', border: '1px solid rgba(165,180,252,.35)', background: 'rgba(255,255,255,.06)', color: 'white', textAlign: 'left' }}><span><strong style={{ display: 'block', fontSize: '13px' }}>{t('guided.auto_advance') || 'Automatically continue'}</strong><span style={{ display: 'block', color: '#c7d2fe', fontSize: '12px', marginTop: '2px' }}>{t('guided.auto_advance_hint') || 'Move to the next step after a resource finishes.'}</span></span><span aria-hidden="true" style={{ flexShrink: 0, width: '34px', height: '20px', borderRadius: '999px', padding: '2px', background: guidedAutoAdvance ? '#10b981' : '#475569' }}><span style={{ display: 'block', width: '16px', height: '16px', borderRadius: '50%', background: 'white', transform: guidedAutoAdvance ? 'translateX(14px)' : 'translateX(0)', transition: 'transform .15s' }} /></span></button>}
            {allSteps.map(s => {
              const on = isStepOn(s.id);
              const locked = s.id === 'source-input' || s.id === '_final';
              return (
                <button type="button" key={s.id} role="checkbox" aria-checked={on} disabled={locked || guidedBusy} onClick={() => { if (!locked && !guidedBusy) chooseStepToggle(s.id); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '5px 6px', marginBottom: '2px', background: on ? 'rgba(99,102,241,0.16)' : 'transparent', border: 'none', borderRadius: '8px', cursor: locked ? 'default' : 'pointer', opacity: locked ? 0.6 : 1 }}>
                  <span aria-hidden="true" style={{ width: '14px', height: '14px', borderRadius: '4px', border: '1.5px solid ' + (on ? '#818cf8' : 'rgba(255,255,255,0.3)'), background: on ? '#6366f1' : 'transparent', color: 'white', fontSize: '12px', lineHeight: '12px', textAlign: 'center', flexShrink: 0 }}>{on ? '✓' : ''}</span>
                  <span style={{ fontSize: '12px', color: on ? 'white' : 'rgba(203,213,225,0.75)', fontWeight: 600 }}>{localizeStep(s, 'label')}{locked ? ' ' + (t('guided.required') || '(required)') : ''}</span>
                </button>
              );
            })}
          </div>
        )}
        {showGuidedTip && (() => {
          const stepId = GUIDED_STEPS[guidedStep]?.id;
          const tourId = stepId ? GUIDED_TOUR_MAP[stepId] : null;
          const tourEntry = tourId ? tourSteps.find(s => s.id === tourId) : null;
          return tourEntry ? (
            <div id="guided-about-panel" role="region" aria-label={(t('guided.about_prefix') || 'About') + ' ' + tourEntry.title} style={{ marginTop: '10px', padding: '12px 14px', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', animation: 'fadeIn 0.3s ease-out' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'rgba(165,180,252,0.95)', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{t('guided.about_prefix')} {tourEntry.title}</span>
                {typeof window !== 'undefined' && typeof window.callTTS === 'function' && (
                  <button type="button"
                    onClick={() => playAbout((tourEntry.title || '') + '. ' + (tourEntry.text || ''))}
                    disabled={ttsState === 'loading'}
                    aria-label={ttsState === 'playing' ? (t('guided.stop_listening') || 'Stop reading aloud') : (t('guided.listen') || 'Read this aloud')}
                    title={ttsState === 'playing' ? (t('guided.stop_listening') || 'Stop reading aloud') : (t('guided.listen') || 'Read this aloud')}
                    style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', fontSize: '12px', fontWeight: 700, color: ttsState === 'playing' ? 'white' : '#c7d2fe', background: ttsState === 'playing' ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '8px', cursor: ttsState === 'loading' ? 'wait' : 'pointer', opacity: ttsState === 'loading' ? 0.7 : 1 }}
                  >
                    <span aria-hidden="true">{ttsState === 'loading' ? '⏳' : ttsState === 'playing' ? '⏹' : '🔊'}</span>
                    {ttsState === 'playing' ? (t('guided.stop') || 'Stop') : (t('guided.listen_short') || 'Listen')}
                  </button>
                )}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(203,213,225,0.85)', lineHeight: '1.6', margin: 0 }}>
                {(tourEntry.text || '').split(/\r?\n/).map((line, i) => {
                  const cleanLine = line.trim();
                  if (!cleanLine) return <div key={i} className="h-1.5" />;
                  const formatText = (text) => {
                    if (!text) return null;
                    return text.split('**').map((part, bIdx) => {
                      if (bIdx % 2 === 1) return <strong key={'b-'+bIdx} style={{ fontWeight: 800, color: 'rgba(199,210,254,0.95)' }}>{part}</strong>;
                      return part.split('*').map((sub, iIdx) => {
                        if (iIdx % 2 === 1) return <em key={'i-'+bIdx+'-'+iIdx} style={{ fontStyle: 'italic', color: '#c7d2fe' }}>{sub}</em>;
                        return sub;
                      });
                    });
                  };
                  if (cleanLine.startsWith('###')) {
                    const headerText = cleanLine.replace(/^###\s*/, '').trim();
                    return <h5 key={i} style={{ color: 'rgba(129,140,248,0.95)', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '10px', marginBottom: '4px', paddingBottom: '3px', borderBottom: '1px solid rgba(129,140,248,0.2)' }}>{formatText(headerText)}</h5>;
                  }
                  const isBullet = cleanLine.startsWith('•') || cleanLine.startsWith('-') || cleanLine.startsWith('* ');
                  if (isBullet) {
                    const bulletMarker = cleanLine.startsWith('* ') ? '* ' : cleanLine.charAt(0);
                    const bulletText = cleanLine.substring(bulletMarker.length).trim();
                    return <div key={i} style={{ display: 'grid', gridTemplateColumns: '10px 1fr', gap: '4px', marginBottom: '2px', alignItems: 'start' }}><span style={{ marginTop: '6px', width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(129,140,248,0.6)', display: 'inline-block' }} /><span style={{ color: 'rgba(203,213,225,0.9)', fontSize: '12px', lineHeight: '1.6' }}>{formatText(bulletText)}</span></div>;
                  }
                  return <p key={i} style={{ color: 'rgba(203,213,225,0.85)', margin: '0 0 4px', lineHeight: '1.6' }}>{formatText(cleanLine)}</p>;
                })}
              </div>
            </div>
          ) : null;
        })()}
        </div>}
      </div>
      {showFullLesson && (
        <div role="presentation" onClick={() => setShowFullLesson(false)} style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(2,6,23,0.82)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="allo-guided-dialog" ref={_modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="guided-full-lesson-title" aria-describedby="guided-full-lesson-description" onClick={(e) => e.stopPropagation()} style={{ background: 'linear-gradient(150deg, #0f172a, #1e1b4b)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '20px', width: '100%', maxWidth: '760px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 70px rgba(0,0,0,0.55)' }}>
            <div style={{ flexShrink: 0, padding: '18px 22px', borderBottom: '1px solid rgba(99,102,241,0.22)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <h2 id="guided-full-lesson-title" style={{ fontSize: '16px', fontWeight: 800, color: 'white', margin: 0 }}><span aria-hidden="true">📖</span> {t('guided.full_lesson_title') || 'The full worked lesson'}</h2>
                <div id="guided-full-lesson-description" style={{ fontSize: '12px', color: '#c7d2fe', marginTop: '3px', lineHeight: '1.5' }}>{t('guided.full_lesson_sub') || 'One consistent example — a photosynthesis passage — carried through every Guided step, end to end.'}</div>
              </div>
              <button type="button" onClick={() => setShowFullLesson(false)} aria-label={t('common.close') || 'Close'} style={{ flexShrink: 0, width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: '16px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
            <div tabIndex={0} role="region" aria-label={t('guided.full_lesson_scroll') || 'Worked lesson steps'} style={{ overflowY: 'auto', padding: '16px 22px' }}>
              {(GUIDED_STEPS || []).map((s, i) => {
                const d = (typeof GUIDED_DETAIL !== 'undefined' && GUIDED_DETAIL[s.id]) || null;
                if (!d || !d.example) return null;
                return (
                  <div key={s.id} style={{ marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', marginBottom: '2px' }}>
                      <span style={{ flexShrink: 0, fontSize: '12px', fontWeight: 800, color: '#a5b4fc', background: 'rgba(99,102,241,0.18)', borderRadius: '6px', padding: '1px 6px' }}>{i + 1}</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'rgba(199,210,254,0.97)' }}>{localizeStep(s, 'label')}</span>
                    </div>
                    {d.headline && <div style={{ fontSize: '12px', color: 'rgba(148,163,184,0.85)', marginBottom: '6px', marginLeft: '26px' }}>{d.headline}</div>}
                    <pre style={{ margin: '0 0 0 26px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px', lineHeight: '1.6', color: 'rgba(226,232,240,0.92)', fontFamily: 'inherit', background: 'rgba(15,23,42,0.55)', borderRadius: '8px', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)' }}>{d.example}</pre>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
