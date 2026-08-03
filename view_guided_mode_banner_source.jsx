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
    "example": "READING LEVEL\nRange: 6th–8th Grade\nWhy: Sentences are moderate with embedded clauses, and domain terms (chlorophyll, carbon dioxide, stomata, glucose) raise vocabulary load — though inline glosses like \"glucose, a kind of sugar\" keep it out of the high-school band.\n\nKEY CONCEPTS\n• Photosynthesis\n• Chlorophyll captures sunlight\n• Carbon dioxide intake via stomata\n• Water absorption through roots\n• Glucose as stored energy\n• Oxygen as a by-product\n\nACCURACY: High\nReason: Core claims align with established biology — chlorophyll as the light-capturing pigment, stomata as the gas-exchange openings, glucose and oxygen as products.\nVerified facts:\n  ✓ Chlorophyll is the green pigment that absorbs light energy. [¹]\n  ✓ Stomata are the pores for taking in CO₂ and releasing O₂. [²]\n  ✓ Photosynthesis combines CO₂ and water using light to make glucose and release oxygen. [¹]\nDiscrepancies:\n  ⊠ \"Turns sunlight into food\" is a reasonable simplification, but light energy is converted and stored as chemical energy in glucose. [³]\n\nGRAMMAR: None detected\n\nREADABILITY (computed in code)\nFlesch-Kincaid grade: 8.7  ·  words: 109  ·  sentences: 6  ·  syllables: 168"
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

  "directions": {
    "headline": "Write the assignment in a student's voice",
    "inputs": [
      "Student-facing task steps and learning goal",
      "Due information, materials, and submission expectations",
      "Success criteria and optional auto-checking goals",
      "The resources students should open or complete"
    ],
    "outputs": [
      "A Directions resource students see with the assignment",
      "Clear sequence, purpose, and completion criteria",
      "A reusable teacher-authored companion to the generated lesson"
    ],
    "how": "Directions are intentionally teacher-authored rather than AI-generated. Open the composer, name the goal, write the steps in the order students will encounter them, and read the result once as a learner before sharing.",
    "example": "LEARNING GOAL\nI can explain how sunlight, water, and carbon dioxide help a plant make glucose and release oxygen.\n\nDO THIS\n1. Read the adapted photosynthesis text.\n2. Use the glossary when you meet a bold word.\n3. Complete the inputs-and-outputs concept sort.\n4. Answer the exit ticket in complete sentences.\n\nSUCCESS LOOKS LIKE\n• I identify all three inputs and both outputs.\n• I use photosynthesis vocabulary accurately.\n• I explain where the Sun's energy goes.\n\nTURN IN\nSubmit the exit ticket by Friday at 3:00 PM."
  },

  "package-deliver": {
    "headline": "Preview the learner experience and choose delivery routes",
    "inputs": [
      "The resources kept in History and the editable Builder document",
      "Audience, destination, answer-key policy, branding, and accessibility needs",
      "A quiz for QTI; compatible quiz or study-card content for H5P",
      "Assignment expiry, mailbox deployment, or live-session choice"
    ],
    "outputs": [
      "Print/editable: PDF, Worksheet, Slides, accessible DOCX, ODT",
      "Web/access: interactive HTML, EPUB, TXT, Markdown, NotebookLM Markdown, BRF",
      "LMS: QTI, H5P, and IMS content packages",
      "Assign/share: Homework QR or self-contained link, Class Mailbox QR, live session, editable project",
      "Resource-specific: Adventure Storybook HTML and Persona JSON/HTML transcript"
    ],
    "how": "Start by opening Document Builder to preflight, edit, theme, and choose the main file format. Use Homework QR or Class Mailbox for asynchronous learners, Live Session for synchronous delivery, and Test latest student link to verify the exact learner view. Conditional formats appear only when their source content is compatible.",
    "example": "DELIVERY PLAN — PHOTOSYNTHESIS\n\n1. Accessible Word (.docx) for students who annotate in Microsoft 365.\n2. Homework QR with a 1-week expiry for independent completion.\n3. QTI quiz package for the LMS gradebook.\n4. Teacher keeps the editable AlloFlow project and the full offline HTML pack.\n5. Open the student link in a new tab and verify directions, answer-key privacy, images, and submission flow before publishing."
  },

  "_final": {
    "headline": "Review the finished lesson before leaving Guided Mode",
    "inputs": [
      "Completed and skipped Guided milestones",
      "Resources created during this Guided run",
      "The chosen export, sharing, or live-session route"
    ],
    "outputs": [
      "A completion summary saved locally on this device",
      "Quick links back to created resources and skipped milestones",
      "An optional private reflection to improve the next Guided run"
    ],
    "how": "The final step is a review, not another generator. Confirm that students have directions, that the learner-facing link or file was tested, and that at least one usable delivery artifact was created. You can revisit skipped steps before finishing.",
    "example": "FINAL CHECK\n✓ Source and learning goal match.\n✓ Student directions name the task and success criteria.\n✓ Answer keys are teacher-only.\n✓ Accessibility preflight has been reviewed.\n✓ Student link opens and the first task is obvious.\n✓ A backup format is available for students who cannot use the primary route."
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
  guidedDeliveryEvidence,
  guidedPlanBrief,
  guidedAdvanceNotice,
  clearGuidedAdvanceNotice,
  undoGuidedAutoAdvance,
  guidedNavigationUndo,
  undoGuidedNavigation,
  clearGuidedNavigationUndo,
  guidedStepCostNote,
  guidedSettingsSummary,
  openUniversalSettings,
  wordSoundsHistory,
  currentUiLanguage,
  markGuidedStepDone,
  resetGuidedProgress,
  guidedPresets,
  applyGuidedPreset,
  applyGuidedPlanToRemaining,
  generateGuidedPlanFromGoal,
  guidedPhases,
  guidedDeliveryGroups,
  openGuidedDocumentBuilder,
  createGuidedHomeworkShare,
  startGuidedLiveSession,
  canPreviewGuidedStudentAssignment,
  previewGuidedStudentAssignment,
  guidedStepError,
  retryGuidedStep,
  isGuidedRetrying,
  openGuidedHistoryItem,
  guidedAutoAdvance,
  setGuidedAutoAdvance,
  handleCompleteGuidedMode,
  handleGuidedJump,
  focusGuidedTarget,
  processingProgress,
  generationStep,
  guidedProviderProfile,
  guidedProgressSaveState,
  retryGuidedProgressSave,
  openGuidedProjectBackup,
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
    'directions': ['directions.title', 'directions.subtitle'],
    'package-deliver': ['tour.fullpack_title', 'tour.fullpack_text'],
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
  const normalizeCompletionSummary = (value) => {
    if (!value || typeof value !== 'object') return null;
    const completedAt = typeof value.completedAt === 'string' && Number.isFinite(Date.parse(value.completedAt)) ? value.completedAt : null;
    if (!completedAt) return null;
    const cleanCount = (item) => Math.max(0, Math.min(999, Number.isFinite(Number(item)) ? Math.floor(Number(item)) : 0));
    return { ...value, completedAt, completedCount: cleanCount(value.completedCount), skippedCount: cleanCount(value.skippedCount), resourceCount: cleanCount(value.resourceCount) };
  };
  const CLASSROOM_SUPPORT_IDS = ['multilingual', 'reading-variability', 'attention-executive', 'sensory-access', 'motor-input', 'extension'];
  const normalizeClassroomContext = (value) => {
    const source = value && typeof value === 'object' ? value : {};
    const clean = (item, max) => String(item || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
    return {
      supports: Array.from(new Set(Array.isArray(source.supports) ? source.supports.filter(id => CLASSROOM_SUPPORT_IDS.includes(id)) : [])).slice(0, CLASSROOM_SUPPORT_IDS.length),
      languages: clean(source.languages, 120),
      devices: ['mixed', 'one-to-one', 'shared', 'paper-first'].includes(source.devices) ? source.devices : 'mixed',
      notes: clean(source.notes, 280),
    };
  };
  const normalizeSavedGuidedPlans = (value) => {
    if (!Array.isArray(value)) return [];
    const clean = (item, max) => String(item || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
    return value.filter(item => item && typeof item === 'object' && Array.isArray(item.stepIds)).slice(-12).map((item, index) => ({
      id: clean(item.id, 80) || ('saved-plan-' + index),
      name: clean(item.name || item.title, 80) || 'Saved Guided plan',
      title: clean(item.title, 90) || 'Saved Guided plan',
      summary: clean(item.summary, 320), rationale: clean(item.rationale, 420), goal: clean(item.goal, 1200), originalGoal: clean(item.originalGoal || item.goal, 1200),
      clarificationAnswers: item.clarificationAnswers && typeof item.clarificationAnswers === 'object' ? Object.fromEntries(Object.entries(item.clarificationAnswers).slice(0, 4).map(([key, answer]) => [clean(key, 30), clean(answer, 120)]).filter(([, answer]) => answer)) : {},
      stepIds: Array.from(new Set(item.stepIds.map(id => clean(id, 60)).filter(Boolean))).slice(0, 14),
      stepReasons: item.stepReasons && typeof item.stepReasons === 'object' ? Object.fromEntries(Object.entries(item.stepReasons).slice(0, 14).map(([id, reason]) => [clean(id, 60), clean(reason, 180)]).filter(([id, reason]) => id && reason)) : {},
      estimatedMinutes: Math.max(5, Math.min(180, Math.round(Number(item.estimatedMinutes) || 20))),
      deliverySetting: ['take-home', 'print', 'live', 'lms'].includes(item.deliverySetting) ? item.deliverySetting : 'take-home',
      deliveryPriority: ['accessible', 'editable', 'assessment', 'interactive', 'low-connectivity'].includes(item.deliveryPriority) ? item.deliveryPriority : 'accessible',
      assumptions: Array.isArray(item.assumptions) ? item.assumptions.map(value => clean(value, 160)).filter(Boolean).slice(0, 4) : [],
      classroomContext: normalizeClassroomContext(item.classroomContext),
      savedAt: typeof item.savedAt === 'string' && Number.isFinite(Date.parse(item.savedAt)) ? item.savedAt : new Date(0).toISOString(),
    }));
  };
  const normalizeGuidedPlannerDraft = (value) => {
    if (!value || typeof value !== 'object') return null;
    const clean = (item, max) => String(item || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
    const goal = clean(value.goal, 1200);
    const plan = value.plan && Array.isArray(value.plan.stepIds) ? normalizeSavedGuidedPlans([{ ...value.plan, id: 'planner-draft', name: value.plan.title || 'Planning draft' }])[0] : null;
    if (!goal && !plan) return null;
    const updatedAt = typeof value.updatedAt === 'string' && Number.isFinite(Date.parse(value.updatedAt)) ? value.updatedAt : new Date().toISOString();
    return {
      version: 1, goal, plan, updatedAt,
      answers: value.answers && typeof value.answers === 'object' ? Object.fromEntries(Object.entries(value.answers).slice(0, 4).map(([key, answer]) => [clean(key, 30), clean(answer, 120)]).filter(([, answer]) => answer)) : {},
      messages: Array.isArray(value.messages) ? value.messages.slice(-8).map(message => ({ role: message?.role === 'teacher' ? 'teacher' : 'planner', text: clean(message?.text, 500) })).filter(message => message.text) : [],
      refinement: clean(value.refinement, 500), savedName: clean(value.savedName, 80), activeSavedId: clean(value.activeSavedId, 80), classroomContext: normalizeClassroomContext(value.classroomContext),
    };
  };
  const rawStep = GUIDED_STEPS[guidedStep] || {};
  const step = { ...rawStep, label: localizeStep(rawStep, 'label'), action: localizeStep(rawStep, 'action'), success: localizeStep(rawStep, 'success') };
  const isLast = guidedStep >= GUIDED_STEPS.length - 1;
  const phaseDefinitions = Array.isArray(guidedPhases) ? guidedPhases : [];
  const activePhaseIds = Array.from(new Set((GUIDED_STEPS || []).map(item => item?.phase || 'guided')));
  const activePhaseDefinitions = activePhaseIds.map(id => phaseDefinitions.find(item => item.id === id) || { id, label: id, description: '' });
  const currentPhase = activePhaseDefinitions.find(item => item.id === (step.phase || 'guided')) || null;
  const currentPhaseIndex = currentPhase ? activePhaseDefinitions.findIndex(item => item.id === currentPhase.id) : -1;
  const phaseLabelKey = currentPhase ? 'guided.phase_' + currentPhase.id : '';
  const translatedPhaseLabel = phaseLabelKey ? t(phaseLabelKey) : '';
  const currentPhaseLabel = currentPhase ? ((translatedPhaseLabel && translatedPhaseLabel !== phaseLabelKey) ? translatedPhaseLabel : currentPhase.label) : '';
  const phaseDescriptionKey = currentPhase ? 'guided.phase_' + currentPhase.id + '_description' : '';
  const translatedPhaseDescription = phaseDescriptionKey ? t(phaseDescriptionKey) : '';
  const currentPhaseDescription = currentPhase ? ((translatedPhaseDescription && translatedPhaseDescription !== phaseDescriptionKey) ? translatedPhaseDescription : currentPhase.description) : '';
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
  const [pendingJump, setPendingJump] = React.useState(null);
  const [phaseTransitionNotice, setPhaseTransitionNotice] = React.useState(null);
  const [showFocusDetails, setShowFocusDetails] = React.useState(!!_savedUiState.focusDetails);
  const [showResumeCheckpoint, setShowResumeCheckpoint] = React.useState(() => guidedStep > 0 || (guidedCompletedIds || []).length > 0 || (guidedSkippedIds || []).length > 0 || (guidedCreatedHistoryIds || []).length > 0);
  const [quickGuideText, setQuickGuideText] = React.useState('');
  const [quickGuideStatus, setQuickGuideStatus] = React.useState('');
  const [quickGuideBusy, setQuickGuideBusy] = React.useState(false);
  const [pendingClearGuidedData, setPendingClearGuidedData] = React.useState(false);
  const [showErrorDetails, setShowErrorDetails] = React.useState(false);
  const [showInitialPath, setShowInitialPath] = React.useState(() => { try { return !!normalizeCompletionSummary(JSON.parse(localStorage.getItem('allo_guided_last_completion') || 'null')) || !localStorage.getItem('allo_guided_path_prompt_seen'); } catch (_) { return true; } });
  const [showFeedbackHistory, setShowFeedbackHistory] = React.useState(false);
  const [feedbackEntries, setFeedbackEntries] = React.useState(() => { try { const value = JSON.parse(localStorage.getItem('allo_guided_feedback') || '[]'); return Array.isArray(value) ? value : []; } catch (_) { return []; } });
  const [lastCompletion, setLastCompletion] = React.useState(() => { try { return normalizeCompletionSummary(JSON.parse(localStorage.getItem('allo_guided_last_completion') || 'null')); } catch (_) { return null; } });
  const [durationStats, setDurationStats] = React.useState(() => { try { const value = JSON.parse(localStorage.getItem('allo_guided_duration_stats') || '{}'); return value && typeof value === 'object' ? value : {}; } catch (_) { return {}; } });
  const _savedDeliveryPreferences = React.useRef((() => { try { const value = JSON.parse(localStorage.getItem('allo_guided_delivery_preferences') || '{}'); return value && typeof value === 'object' ? value : {}; } catch (_) { return {}; } })()).current;
  const [classroomContext, setClassroomContext] = React.useState(() => { try { return normalizeClassroomContext(JSON.parse(localStorage.getItem('allo_guided_classroom_context') || '{}')); } catch (_) { return normalizeClassroomContext({}); } });
  const [deliverySetting, setDeliverySetting] = React.useState(['take-home', 'print', 'live', 'lms'].includes(_savedDeliveryPreferences.setting) ? _savedDeliveryPreferences.setting : 'take-home');
  const [deliveryPriority, setDeliveryPriority] = React.useState(['accessible', 'editable', 'assessment', 'interactive', 'low-connectivity'].includes(_savedDeliveryPreferences.priority) ? _savedDeliveryPreferences.priority : 'accessible');
  const [showAiPlanner, setShowAiPlanner] = React.useState(false);
  const [aiPlannerGoal, setAiPlannerGoal] = React.useState('');
  const [aiPlannerPlan, setAiPlannerPlan] = React.useState(null);
  const [aiPlannerBusy, setAiPlannerBusy] = React.useState(false);
  const [aiPlannerError, setAiPlannerError] = React.useState('');
  const [aiPlannerRefinement, setAiPlannerRefinement] = React.useState('');
  const [aiPlannerMessages, setAiPlannerMessages] = React.useState([]);
  const [aiPlannerLastChanges, setAiPlannerLastChanges] = React.useState([]);
  const [plannerDirty, setPlannerDirty] = React.useState(false);
  const [pendingPlannerClose, setPendingPlannerClose] = React.useState(false);
  const [plannerRecoveryDraft, setPlannerRecoveryDraft] = React.useState(null);
  const [aiPlannerStage, setAiPlannerStage] = React.useState('describe');
  const [aiPlannerUndoStack, setAiPlannerUndoStack] = React.useState([]);
  const [aiPlannerInitialPlan, setAiPlannerInitialPlan] = React.useState(null);
  const [aiPlannerManualEdits, setAiPlannerManualEdits] = React.useState({ steps: [], delivery: false, priority: false });
  const [plannerSaveState, setPlannerSaveState] = React.useState('idle');
  const [plannerSavedAt, setPlannerSavedAt] = React.useState(null);
  const [showSavedAiPlans, setShowSavedAiPlans] = React.useState(false);
  const _aiPlanImportRef = React.useRef(null);
  const [aiPlannerQuestions, setAiPlannerQuestions] = React.useState([]);
  const [aiPlannerAnswers, setAiPlannerAnswers] = React.useState({});
  const [savedAiPlans, setSavedAiPlans] = React.useState(() => { try { return normalizeSavedGuidedPlans(JSON.parse(localStorage.getItem('allo_guided_saved_plans') || '[]')); } catch (_) { return []; } });
  const [savedAiPlanName, setSavedAiPlanName] = React.useState('');
  const [activeSavedAiPlanId, setActiveSavedAiPlanId] = React.useState(null);
  const [savedAiPlanStatus, setSavedAiPlanStatus] = React.useState('');
  const [pendingDeleteSavedAiPlanId, setPendingDeleteSavedAiPlanId] = React.useState(null);
  const [pendingPlanImport, setPendingPlanImport] = React.useState(null);
  const [pendingAiPlanApply, setPendingAiPlanApply] = React.useState(false);
  const plannerConfirmationOpen = !!(pendingPlannerClose || pendingDeleteSavedAiPlanId || pendingAiPlanApply);
  const [readinessChecks, setReadinessChecks] = React.useState(() => { try { const value = JSON.parse(localStorage.getItem('allo_guided_readiness_checks') || '{}'); return value && typeof value === 'object' ? value : {}; } catch (_) { return {}; } });
  const [pendingReadinessAction, setPendingReadinessAction] = React.useState(null); // null | 'teach' | 'finish'
  const [pendingUnsafeExit, setPendingUnsafeExit] = React.useState(false);
  const _busyTimingRef = React.useRef(null);
  const _skipUiPersistRef = React.useRef(false);
  const guidedBusy = !!isGuidedRetrying;
  const _sourceBaselineRef = React.useRef(String(inputText || '').trim());
  React.useEffect(() => { if (_skipUiPersistRef.current) { _skipUiPersistRef.current = false; return; } try { localStorage.setItem('allo_guided_ui_state', JSON.stringify({ collapsed: isCollapsed, showPicker, showAbout: !!showGuidedTip, infoTab, focusDetails: showFocusDetails })); } catch (_) {} }, [isCollapsed, showPicker, showGuidedTip, infoTab, showFocusDetails]);
  React.useEffect(() => { if (_savedUiState.showAbout && !showGuidedTip) setShowGuidedTip(true); }, []);
  React.useEffect(() => { try { localStorage.setItem('allo_guided_readiness_checks', JSON.stringify(readinessChecks)); } catch (_) {} }, [readinessChecks]);
  React.useEffect(() => { try { localStorage.setItem('allo_guided_delivery_preferences', JSON.stringify({ setting: deliverySetting, priority: deliveryPriority })); } catch (_) {} }, [deliverySetting, deliveryPriority]);
  React.useEffect(() => { try { localStorage.setItem('allo_guided_classroom_context', JSON.stringify(classroomContext)); } catch (_) {} }, [classroomContext]);
  React.useEffect(() => { try { localStorage.setItem('allo_guided_saved_plans', JSON.stringify(savedAiPlans)); } catch (_) {} }, [savedAiPlans]);
  React.useEffect(() => {
    if (!showAiPlanner || !plannerDirty || (!String(aiPlannerGoal || '').trim() && !aiPlannerPlan && !String(aiPlannerRefinement || '').trim())) { if (!plannerDirty) setPlannerSaveState('idle'); return; }
    setPlannerSaveState('saving');
    const timer = setTimeout(() => {
      const updatedAt = new Date().toISOString();
      try {
        localStorage.setItem('allo_guided_planner_draft', JSON.stringify({ version: 1, goal: aiPlannerGoal, plan: aiPlannerPlan, answers: aiPlannerAnswers, messages: aiPlannerMessages, refinement: aiPlannerRefinement, savedName: savedAiPlanName, activeSavedId: activeSavedAiPlanId, classroomContext, updatedAt }));
        setPlannerSavedAt(updatedAt); setPlannerSaveState('saved');
      } catch (_) { setPlannerSaveState('idle'); }
    }, 350);
    return () => clearTimeout(timer);
  }, [showAiPlanner, plannerDirty, aiPlannerGoal, aiPlannerPlan, aiPlannerAnswers, aiPlannerMessages, aiPlannerRefinement, savedAiPlanName, activeSavedAiPlanId, classroomContext]);
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
  const _aiPlannerDialogRef = React.useRef(null);
  const _plannerConfirmDialogRef = React.useRef(null);
  const _plannerConfirmPrimaryRef = React.useRef(null);
  const _aiPlannerReturnRef = React.useRef(null);
  const _plannerDirtyRef = React.useRef(plannerDirty);
  const _plannerConfirmationRef = React.useRef({ close: pendingPlannerClose, deleteId: pendingDeleteSavedAiPlanId, apply: pendingAiPlanApply });
  const _phaseCheckpointRef = React.useRef(null);
  const _phaseCheckpointWasReadyRef = React.useRef(false);
  const _phaseNoticeRef = React.useRef(null);
  const _readinessRegionRef = React.useRef(null);
  const _readinessGatePrimaryRef = React.useRef(null);
  const _readinessActionReturnRef = React.useRef(null);
  const _unsafeExitPrimaryRef = React.useRef(null);
  const _unsafeExitReturnRef = React.useRef(null);
  React.useEffect(() => { _plannerDirtyRef.current = plannerDirty; }, [plannerDirty]);
  React.useEffect(() => { _plannerConfirmationRef.current = { close: pendingPlannerClose, deleteId: pendingDeleteSavedAiPlanId, apply: pendingAiPlanApply }; }, [pendingPlannerClose, pendingDeleteSavedAiPlanId, pendingAiPlanApply]);
  // Planning Studio follows the dialog pattern: suppress the Guided ring underneath it,
  // trap keyboard focus, close with Escape, and restore focus to the exact opener.
  React.useEffect(() => {
    if (!showAiPlanner) return;
    _aiPlannerReturnRef.current = (typeof document !== 'undefined') ? document.activeElement : null;
    const root = _aiPlannerDialogRef.current;
    // Ref-counted shared body scroll lock — see window.__alloScrollLockState.
    const scrollLock = window.__alloScrollLockState || (window.__alloScrollLockState = { count: 0, prev: '' });
    let scrollLocked = false;
    try {
      if (typeof document !== 'undefined') {
        scrollLocked = true;
        if (++scrollLock.count === 1) { scrollLock.prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
      }
      if (root) root.focus();
    } catch (_) {}
    const onKey = (event) => {
      const confirmation = _plannerConfirmationRef.current;
      const activeRoot = (confirmation.close || confirmation.deleteId || confirmation.apply) ? _plannerConfirmDialogRef.current : root;
      if (event.key === 'Escape') {
        event.stopPropagation();
        if (confirmation.close) setPendingPlannerClose(false);
        else if (confirmation.deleteId) setPendingDeleteSavedAiPlanId(null);
        else if (confirmation.apply) setPendingAiPlanApply(false);
        else if (_plannerDirtyRef.current) setPendingPlannerClose(true);
        else { setShowAiPlanner(false); setPendingAiPlanApply(false); }
        return;
      }
      if (event.key !== 'Tab' || !activeRoot) return;
      const items = activeRoot.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])');
      if (!items.length) { event.preventDefault(); activeRoot.focus(); return; }
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      try {
        if (scrollLocked) {
          scrollLock.count = Math.max(0, scrollLock.count - 1);
          if (scrollLock.count === 0) document.body.style.overflow = scrollLock.prev;
        }
        const opener = _aiPlannerReturnRef.current; if (opener?.focus && document.contains(opener)) opener.focus();
      } catch (_) {}
    };
  }, [showAiPlanner]);
  React.useEffect(() => {
    if (!plannerConfirmationOpen) return;
    const timer = setTimeout(() => { try { (_plannerConfirmPrimaryRef.current || _plannerConfirmDialogRef.current)?.focus(); } catch (_) {} }, 0);
    return () => clearTimeout(timer);
  }, [plannerConfirmationOpen, pendingPlannerClose, pendingDeleteSavedAiPlanId, pendingAiPlanApply]);

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
    'alignment': ['alignment-report'], 'lesson-plan': ['lesson-plan'], 'directions': ['directions'],
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
  const _deliveryOutcomeDone = !!(guidedDeliveryEvidence?.exportCreated || guidedDeliveryEvidence?.shareCreated || guidedDeliveryEvidence?.liveStarted);
  const _computedDone =
    step.id === 'source-input' ? ((inputText || '').trim().length > 20) :
    step.id === 'ui-tool-wordsounds' ? _wordSoundsDone :
    step.id === 'package-deliver' ? _deliveryOutcomeDone :
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
  const isStepOn = (id) => !guidedSelectedIds || id === 'source-input' || id === 'directions' || id === 'package-deliver' || id === '_final' || guidedSelectedIds.indexOf(id) !== -1;
  // End-of-flow recap: what the teacher actually built (from history).
  const humanize = (type) => (getDefaultTitle ? getDefaultTitle(type) : String(type || '').replace(/[-_]/g, ' '));
  const _createdIdSet = new Set(Array.isArray(guidedCreatedHistoryIds) ? guidedCreatedHistoryIds : []);
  const latestGuidedResourceItem = [...(history || [])].reverse().find(item => item?.id && _createdIdSet.has(item.id)) || null;
  const guidedResourceItems = (history || []).filter(h => h && h.id && _createdIdSet.has(h.id)).map(item => ({ item, title: item.title || humanize(item.type) }));
  const recapItems = isLast ? guidedResourceItems : [];
  const latestLessonPlanItem = isLast ? [...(history || [])].reverse().find(item => item?.id && _createdIdSet.has(item.id) && item.type === 'lesson-plan') : null;
  const latestDirectionsItem = isLast ? [...(history || [])].reverse().find(item => item?.id && _createdIdSet.has(item.id) && item.type === 'directions') : null;
  const skippedStepEntries = (GUIDED_STEPS || []).map((item, index) => ({ item, index })).filter(entry => (guidedSkippedIds || []).includes(entry.item.id));
  const _activeIdSet = new Set((GUIDED_STEPS || []).map(s => s && s.id).filter(Boolean));
  const _effectiveCompletedSet = new Set((guidedCompletedIds || []).filter(id => _activeIdSet.has(id)));
  if (String(inputText || '').trim().length > 20 && _activeIdSet.has('source-input')) _effectiveCompletedSet.add('source-input');
  const completedCount = _effectiveCompletedSet.size;
  const skippedCount = (guidedSkippedIds || []).filter(id => _activeIdSet.has(id)).length;
  const hasGuidedProgress = completedCount > 0 || skippedCount > 0 || (guidedCreatedHistoryIds || []).length > 0;
  // Readiness must describe this Guided run. A directions artifact from an older
  // lesson in History must never make the current lesson look student-ready.
  const hasSavedDirections = !!guidedDeliveryEvidence?.directionsSaved || (history || []).some(item => item?.id && _createdIdSet.has(item.id) && item.type === 'directions');
  const hasDeliveryOutcome = _deliveryOutcomeDone;
  const hasStudentPreview = !!guidedDeliveryEvidence?.studentPreviewed;
  const readinessItems = [
    { id: 'directions', label: t('guided.readiness_directions') || 'Student directions are saved', verified: hasSavedDirections, action: 'directions' },
    { id: 'delivery', label: t('guided.readiness_delivery') || 'A delivery file, link, or session was created', verified: hasDeliveryOutcome, action: 'package-deliver' },
    { id: 'learner-view', label: t('guided.readiness_learner_view') || 'The learner view was tested', verified: hasStudentPreview, action: 'learner-preview' },
    { id: 'answer-keys', label: t('guided.readiness_answers') || 'Answer keys and teacher-only notes are hidden', verified: false },
    { id: 'accessibility', label: t('guided.readiness_accessibility') || 'Accessibility and reading order were reviewed', verified: false },
    { id: 'backup', label: t('guided.readiness_backup') || 'A backup access route is ready', verified: false },
  ];
  const readinessCount = readinessItems.filter(item => item.verified || readinessChecks[item.id]).length;
  const readinessTotal = readinessItems.length;
  const readinessFixes = readinessItems.filter(item => !item.verified && !readinessChecks[item.id] && item.action);
  const readinessRemainingItems = readinessItems.filter(item => !item.verified && !readinessChecks[item.id]);
  const getDeliveryRecommendation = (setting, priority) => {
    if (priority === 'low-connectivity') return { primary: 'Self-contained HTML', backup: 'PDF / Print', why: 'Both routes can be used without a continuous connection.' };
    if (priority === 'editable') return { primary: 'Accessible Word (.docx)', backup: 'OpenDocument (.odt)', why: 'Both preserve an editable teacher copy.' };
    if (priority === 'assessment') return { primary: setting === 'lms' ? 'QTI quiz package' : 'PDF / Print', backup: setting === 'lms' ? 'IMS content package' : 'Accessible Word (.docx)', why: 'This keeps scoring or review practical in the selected setting.' };
    if (priority === 'interactive') return { primary: setting === 'lms' ? 'H5P interactive activity' : (setting === 'live' ? 'Live class session' : 'Interactive HTML'), backup: setting === 'lms' ? 'IMS content package' : 'PDF / Print', why: 'Students get an interactive route plus a broadly compatible fallback.' };
    if (setting === 'print') return { primary: 'PDF / Print', backup: 'Accessible Word (.docx)', why: 'Print is predictable, while Word supports zoom, reflow, and editing.' };
    if (setting === 'live') return { primary: 'Live class session', backup: 'Class Mailbox / hosted QR', why: 'The class can participate together and still reconnect asynchronously.' };
    if (setting === 'lms') return { primary: 'IMS content package', backup: 'Accessible Word (.docx)', why: 'IMS fits most LMS imports and Word provides an accessible fallback.' };
    return { primary: 'Homework QR / self-contained link', backup: 'PDF / Print', why: 'Students get a simple take-home route with an offline fallback.' };
  };
  const deliveryRecommendation = getDeliveryRecommendation(deliverySetting, deliveryPriority);
  const aiPlanRoadmapSteps = aiPlannerPlan ? (allSteps || []).filter(item => ['source-input', 'directions', 'package-deliver', '_final'].includes(item.id) || aiPlannerPlan.stepIds.includes(item.id)) : [];
  const aiPlanPhaseGroups = aiPlannerPlan ? phaseDefinitions.map(phase => ({ ...phase, steps: aiPlanRoadmapSteps.filter(item => item.phase === phase.id) })).filter(phase => phase.steps.length) : [];
  const aiPlanResourceLabels = aiPlanRoadmapSteps.filter(item => !['source-input', 'package-deliver', '_final'].includes(item.id)).map(item => localizeStep(item, 'label'));
  const aiPlanDeliveryRecommendation = aiPlannerPlan ? getDeliveryRecommendation(aiPlannerPlan.deliverySetting || 'take-home', aiPlannerPlan.deliveryPriority || 'accessible') : null;
  const aiPlanReadinessItems = (() => {
    if (!aiPlannerPlan || !aiPlanDeliveryRecommendation) return [];
    const selected = new Set(aiPlannerPlan.stepIds || []);
    const items = [{ id: 'source', state: String(inputText || '').trim().length > 20 ? 'ready' : 'planned', label: String(inputText || '').trim().length > 20 ? (t('guided.ai_plan_ready_source') || 'Source material is already available.') : (t('guided.ai_plan_ready_source_later') || 'Source material is still needed; Guided Mode will request it first.') }];
    if (aiPlanDeliveryRecommendation.primary.includes('QTI')) items.push({ id: 'qti-quiz', state: selected.has('quiz') ? 'ready' : 'attention', label: selected.has('quiz') ? (t('guided.ai_plan_ready_qti') || 'Quiz content is included for the planned QTI package.') : (t('guided.ai_plan_needs_quiz') || 'QTI packaging requires quiz content. Add the Assess step.'), action: 'quiz' });
    if (aiPlanDeliveryRecommendation.primary.includes('H5P')) items.push({ id: 'h5p', state: 'conditional', label: t('guided.ai_plan_h5p_condition') || 'H5P requires compatible generated content and destination libraries; verify these during delivery.' });
    const setting = aiPlannerPlan.deliverySetting || 'take-home';
    if ((setting === 'print' || setting === 'lms') && typeof openGuidedDocumentBuilder !== 'function') items.push({ id: 'documents', state: 'attention', label: t('guided.ai_plan_route_unavailable_documents') || 'Document and LMS packaging is unavailable in this build. Choose another setting.' });
    else if (setting === 'take-home' && typeof createGuidedHomeworkShare !== 'function') items.push({ id: 'share', state: 'attention', label: t('guided.ai_plan_route_unavailable_share') || 'Take-home link creation is unavailable in this build. Choose print or another setting.' });
    else if (setting === 'live' && typeof startGuidedLiveSession !== 'function') items.push({ id: 'live', state: 'attention', label: t('guided.ai_plan_route_unavailable_live') || 'Live sessions are unavailable in this build. Choose another setting.' });
    else items.push({ id: 'delivery', state: 'ready', label: (t('guided.ai_plan_route_ready') || '{route} is available as the planned primary route.').replace('{route}', aiPlanDeliveryRecommendation.primary) });
    items.push({ id: 'milestones', state: 'ready', label: t('guided.ai_plan_ready_milestones') || 'Directions, learner preview, packaging, and final review remain protected milestones.' });
    return items;
  })();
  const aiPlanReadinessAttentionCount = aiPlanReadinessItems.filter(item => item.state === 'attention').length;
  const detailEntry = (typeof GUIDED_DETAIL !== 'undefined' && GUIDED_DETAIL[step.id]) || null;
  const _gdTab = (on) => ({ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '7px 8px', fontSize: '12px', fontWeight: 700, color: on ? '#fde68a' : '#c7d2fe', background: on ? 'rgba(251,191,36,0.16)' : 'rgba(255,255,255,0.06)', border: '1px solid ' + (on ? 'rgba(251,191,36,0.55)' : 'rgba(165,180,252,0.3)'), borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' });
  const _gdPanel = { marginBottom: '10px', padding: '11px 13px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' };
  const _gdIo = { fontSize: '12px', fontWeight: 800, color: 'rgba(129,140,248,0.95)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '8px 0 4px' };
  const _gdLi = { fontSize: '12px', color: 'rgba(203,213,225,0.92)', lineHeight: '1.5', marginBottom: '3px', display: 'flex', gap: '6px' };
  const _gdPre = { margin: '6px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px', lineHeight: '1.6', color: 'rgba(226,232,240,0.92)', fontFamily: 'inherit', background: 'rgba(15,23,42,0.55)', borderRadius: '8px', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)' };
  const STEP_META = { 'source-input': ['1–2 min', 'manual'], 'ui-tool-wordsounds': ['2–4 min', 'interactive'], math: ['3–8 min', 'interactive'], image: ['1–3 min', 'image_ai'], directions: ['2–4 min', 'manual'], 'package-deliver': ['2–5 min', 'export'], '_final': ['1 min', 'manual'] };
  const AI_PLAN_DEFAULT_MINUTES = { analysis: 2, glossary: 2, simplified: 2, 'ui-tool-wordsounds': 3, outline: 2, 'anchor-chart': 2, image: 2, faq: 2, 'sentence-frames': 2, 'note-taking': 2, brainstorm: 2, persona: 4, timeline: 2, 'concept-sort': 2, dbq: 3, math: 6, adventure: 5, quiz: 3, alignment: 2, 'lesson-plan': 3 };
  const estimateAiPlanMinutes = (stepIds) => {
    const optionalMinutes = (Array.isArray(stepIds) ? stepIds : []).reduce((total, id) => {
      const observed = Number(durationStats[String(guidedProviderProfile || 'default') + ':' + id]?.averageMs);
      const minutes = Number.isFinite(observed) && observed >= 1000 && observed <= 20 * 60 * 1000 ? Math.max(1, Math.round(observed / 60000)) : (AI_PLAN_DEFAULT_MINUTES[id] || 2);
      return total + minutes;
    }, 0);
    return Math.max(8, Math.min(180, optionalMinutes + 8)); // source, directions, delivery, and final review
  };
  const _durationKey = String(guidedProviderProfile || 'default') + ':' + step.id;
  const _rawObservedDuration = Number(durationStats[_durationKey]?.averageMs);
  const _observedDuration = Number.isFinite(_rawObservedDuration) && _rawObservedDuration >= 1000 && _rawObservedDuration <= 20 * 60 * 1000 ? _rawObservedDuration : 0;
  const stepMeta = _observedDuration > 0 ? [Math.max(1, Math.round(_observedDuration / 60000)) + ' min observed', (STEP_META[step.id] || [null, 'ai_generation'])[1]] : (STEP_META[step.id] || ['1–2 min', 'ai_generation']);
  const estimateGuidedStepMinutes = (item) => {
    const id = item?.id || '';
    const observed = Number(durationStats[String(guidedProviderProfile || 'default') + ':' + id]?.averageMs);
    if (Number.isFinite(observed) && observed >= 1000 && observed <= 20 * 60 * 1000) return Math.max(1, Math.round(observed / 60000));
    const fixed = { 'source-input': 2, directions: 3, 'package-deliver': 4, '_final': 1 };
    return fixed[id] || AI_PLAN_DEFAULT_MINUTES[id] || 2;
  };
  const estimatedRemainingMinutes = GUIDED_STEPS.slice(guidedStep).filter(item => !_effectiveCompletedSet.has(item.id) && !(guidedSkippedIds || []).includes(item.id)).reduce((total, item) => total + estimateGuidedStepMinutes(item), 0);
  const activeStepReason = guidedPlanBrief?.stepReasons?.[step.id] || '';
  React.useEffect(() => {
    if (guidedBusy && !_busyTimingRef.current) { _busyTimingRef.current = { at: Date.now(), key: _durationKey }; return; }
    if (!guidedBusy && _busyTimingRef.current) {
      const finished = _busyTimingRef.current; _busyTimingRef.current = null;
      if (!_computedDone) return; // failures and stopped/abandoned requests must not skew future estimates
      const sample = Date.now() - finished.at;
      if (sample < 1000 || sample > 20 * 60 * 1000) return;
      setDurationStats(previous => {
        const old = previous[finished.key] || {};
        const priorValues = Array.isArray(old.values) ? old.values.filter(value => Number.isFinite(value) && value >= 1000).slice(-19) : (Number.isFinite(Number(old.averageMs)) ? [Number(old.averageMs)] : []);
        const values = [...priorValues, sample].slice(-20);
        const next = { ...previous, [finished.key]: { averageMs: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length), samples: values.length, values } };
        try { localStorage.setItem('allo_guided_duration_stats', JSON.stringify(next)); } catch (_) {}
        return next;
      });
    }
  }, [guidedBusy, _durationKey, _computedDone]);
  const guidedErrorText = !guidedStepError ? '' : typeof guidedStepError === 'string' ? guidedStepError : guidedStepError.message || (() => { try { return JSON.stringify(guidedStepError); } catch (_) { return String(guidedStepError); } })();
  const _errorLower = guidedErrorText.toLowerCase();
  const guidedErrorGuidance = _errorLower.includes('network') || _errorLower.includes('fetch') || _errorLower.includes('connection') ? (t('guided.error_network') || 'Check your connection, then try again.') : _errorLower.includes('rate') || _errorLower.includes('quota') ? (t('guided.error_rate_limit') || 'The service is busy. Wait a moment, then retry.') : step.id === 'image' ? (t('guided.error_image') || 'Check the image settings or try a simpler visual request.') : (t('guided.error_default') || 'Review the source and settings, then retry. Your completed work is safe.');
  const presetStepIds = (preset) => Array.isArray(preset?.stepIds) ? Array.from(new Set(['source-input', ...preset.stepIds, 'directions', 'package-deliver', '_final'])) : allSteps.map(item => item.id);
  const isPresetActive = (preset) => { const a = presetStepIds(preset).slice().sort(); const b = (guidedSelectedIds || allSteps.map(item => item.id)).slice().sort(); return a.length === b.length && a.every((id, index) => id === b[index]); };
  const rememberPathChoice = () => { setShowInitialPath(false); try { localStorage.setItem('allo_guided_path_prompt_seen', 'true'); } catch (_) {} };
  const choosePreset = (preset) => { if (guidedBusy) return; if (hasGuidedProgress && !isPresetActive(preset)) setPendingPreset(preset); else { applyGuidedPreset(preset); setShowPicker(false); rememberPathChoice(); } };
  const confirmPreset = () => { if (!pendingPreset) return; applyGuidedPreset(pendingPreset); setPendingPreset(null); setShowPicker(false); rememberPathChoice(); };
  const snapshotAiPlan = (plan) => plan ? { ...plan, stepIds: [...(plan.stepIds || [])], stepReasons: { ...(plan.stepReasons || {}) }, assumptions: [...(plan.assumptions || [])], clarificationAnswers: { ...(plan.clarificationAnswers || {}) } } : null;
  const rememberAiPlanVersion = (plan = aiPlannerPlan) => { const snapshot = snapshotAiPlan(plan); if (snapshot) setAiPlannerUndoStack(previous => [...previous, snapshot].slice(-10)); };
  const resetPlannerWorkspace = () => {
    setAiPlannerGoal(''); setAiPlannerPlan(null); setAiPlannerError(''); setAiPlannerRefinement(''); setAiPlannerMessages([]); setAiPlannerLastChanges([]); setAiPlannerQuestions([]); setAiPlannerAnswers({}); setSavedAiPlanName(''); setActiveSavedAiPlanId(null); setSavedAiPlanStatus(''); setPendingAiPlanApply(false); setPendingPlannerClose(false); setPlannerRecoveryDraft(null); setPlannerDirty(false); setAiPlannerStage('describe'); setAiPlannerUndoStack([]); setAiPlannerInitialPlan(null); setAiPlannerManualEdits({ steps: [], delivery: false, priority: false }); setPlannerSaveState('idle'); setPlannerSavedAt(null); setShowSavedAiPlans(false);
  };
  const clearPlannerDraft = () => { try { localStorage.removeItem('allo_guided_planner_draft'); } catch (_) {} setPlannerSaveState('idle'); setPlannerSavedAt(null); };
  const persistPlannerDraftNow = () => {
    const updatedAt = new Date().toISOString();
    try { localStorage.setItem('allo_guided_planner_draft', JSON.stringify({ version: 1, goal: aiPlannerGoal, plan: aiPlannerPlan, answers: aiPlannerAnswers, messages: aiPlannerMessages, refinement: aiPlannerRefinement, savedName: savedAiPlanName, activeSavedId: activeSavedAiPlanId, classroomContext, updatedAt })); setPlannerSavedAt(updatedAt); setPlannerSaveState('saved'); } catch (_) { setPlannerSaveState('idle'); }
  };
  const openAiPlanner = () => {
    let recovered = null;
    try { recovered = normalizeGuidedPlannerDraft(JSON.parse(localStorage.getItem('allo_guided_planner_draft') || 'null')); } catch (_) { recovered = null; }
    setPlannerRecoveryDraft(recovered); setAiPlannerStage(aiPlannerPlan ? 'customize' : 'describe'); setShowAiPlanner(true); setShowPicker(false); setAiPlannerError(''); setSavedAiPlanStatus(''); setPendingPlannerClose(false);
  };
  const requestCloseAiPlanner = () => { if (plannerDirty) setPendingPlannerClose(true); else { setShowAiPlanner(false); setPendingAiPlanApply(false); } };
  const keepPlannerDraftAndClose = () => { persistPlannerDraftNow(); setPendingPlannerClose(false); setShowAiPlanner(false); setPendingAiPlanApply(false); };
  const discardPlannerDraftAndClose = () => { clearPlannerDraft(); resetPlannerWorkspace(); setShowAiPlanner(false); };
  const startFreshPlanner = () => { clearPlannerDraft(); resetPlannerWorkspace(); setShowAiPlanner(true); };
  const resumePlannerDraft = () => {
    const draft = plannerRecoveryDraft;
    if (!draft) return;
    const recoveredPlan = draft.plan ? { ...draft.plan, source: 'draft' } : null;
    setAiPlannerGoal(draft.goal || ''); setAiPlannerPlan(recoveredPlan); setAiPlannerInitialPlan(snapshotAiPlan(recoveredPlan)); setAiPlannerAnswers(draft.answers || {}); setAiPlannerQuestions([]); setAiPlannerMessages(draft.messages || []); setAiPlannerRefinement(draft.refinement || ''); setSavedAiPlanName(draft.savedName || draft.plan?.title || ''); setActiveSavedAiPlanId(draft.activeSavedId || null); setAiPlannerLastChanges([]); setAiPlannerUndoStack([]); setAiPlannerManualEdits({ steps: [], delivery: false, priority: false }); setPlannerRecoveryDraft(null); setPendingPlannerClose(false); setPlannerDirty(true); setAiPlannerStage(recoveredPlan ? 'customize' : 'describe'); setPlannerSavedAt(draft.updatedAt || null); setPlannerSaveState('saved'); setClassroomContext(normalizeClassroomContext(draft.classroomContext));
  };
  const summarizeAiPlanChanges = (previous, next) => {
    if (!previous || !next) return [];
    const previousIds = new Set(previous.stepIds || []), nextIds = new Set(next.stepIds || []);
    const labelFor = (id) => { const item = (allSteps || []).find(stepItem => stepItem.id === id); return item ? localizeStep(item, 'label') : id; };
    const added = (next.stepIds || []).filter(id => !previousIds.has(id)).map(labelFor);
    const removed = (previous.stepIds || []).filter(id => !nextIds.has(id)).map(labelFor);
    const changes = [];
    if (added.length) changes.push((t('guided.ai_plan_changes_added') || 'Added: {steps}').replace('{steps}', added.join(', ')));
    if (removed.length) changes.push((t('guided.ai_plan_changes_removed') || 'Removed: {steps}').replace('{steps}', removed.join(', ')));
    const oldMinutes = Math.max(5, Number(previous.estimatedMinutes) || 0), newMinutes = Math.max(5, Number(next.estimatedMinutes) || 0);
    if (oldMinutes !== newMinutes) changes.push((t('guided.ai_plan_changes_time') || 'Estimated time: {before} → {after} minutes').replace('{before}', oldMinutes).replace('{after}', newMinutes));
    if (previous.deliverySetting !== next.deliverySetting) changes.push((t('guided.ai_plan_changes_delivery') || 'Delivery setting: {before} → {after}').replace('{before}', previous.deliverySetting || '—').replace('{after}', next.deliverySetting || '—'));
    if (previous.deliveryPriority !== next.deliveryPriority) changes.push((t('guided.ai_plan_changes_priority') || 'Top priority: {before} → {after}').replace('{before}', previous.deliveryPriority || '—').replace('{after}', next.deliveryPriority || '—'));
    return changes.length ? changes : [t('guided.ai_plan_changes_same') || 'The plan wording was refined without changing its steps, timing, or delivery settings.'];
  };
  const undoAiPlannerChange = () => {
    const previous = aiPlannerUndoStack[aiPlannerUndoStack.length - 1];
    if (!previous || !aiPlannerPlan) return;
    setAiPlannerLastChanges(summarizeAiPlanChanges(aiPlannerPlan, previous)); setAiPlannerPlan(snapshotAiPlan(previous)); setAiPlannerUndoStack(stack => stack.slice(0, -1)); setAiPlannerManualEdits({ steps: [], delivery: false, priority: false }); setSavedAiPlanStatus(''); setPlannerDirty(true);
  };
  const restoreOriginalAiPlan = () => {
    if (!aiPlannerInitialPlan || !aiPlannerPlan) return;
    rememberAiPlanVersion(aiPlannerPlan); setAiPlannerLastChanges(summarizeAiPlanChanges(aiPlannerPlan, aiPlannerInitialPlan)); setAiPlannerPlan(snapshotAiPlan(aiPlannerInitialPlan)); setAiPlannerManualEdits({ steps: [], delivery: false, priority: false }); setSavedAiPlanStatus(''); setPlannerDirty(true);
  };
  const updateAiPlanDelivery = (field, value) => {
    if (!aiPlannerPlan || aiPlannerPlan[field] === value) return;
    rememberAiPlanVersion(aiPlannerPlan); setAiPlannerPlan(previous => ({ ...previous, [field]: value })); setAiPlannerLastChanges([]); setAiPlannerManualEdits(previous => ({ ...previous, [field === 'deliverySetting' ? 'delivery' : 'priority']: true })); setSavedAiPlanStatus(''); setPlannerDirty(true);
  };
  const AI_PLANNER_QUESTION_OPTIONS = {
    time: [t('guided.ai_plan_answer_time_20') || '20 minutes', t('guided.ai_plan_answer_time_45') || '40–50 minutes', t('guided.ai_plan_answer_time_75') || '60–90 minutes', t('guided.ai_plan_answer_time_days') || 'Multiple days'],
    grade: [t('guided.ai_plan_answer_grade_elementary') || 'Elementary (K–5)', t('guided.ai_plan_answer_grade_middle') || 'Middle school (6–8)', t('guided.ai_plan_answer_grade_high') || 'High school (9–12)', t('guided.ai_plan_answer_grade_mixed') || 'Mixed ages / other'],
    delivery: [t('guided.ai_plan_answer_delivery_live') || 'Live class', t('guided.ai_plan_answer_delivery_print') || 'Print / paper', t('guided.ai_plan_answer_delivery_lms') || 'LMS / digital', t('guided.ai_plan_answer_delivery_home') || 'Take-home / independent'],
    evidence: [t('guided.ai_plan_answer_evidence_quick') || 'Quick formative check', t('guided.ai_plan_answer_evidence_quiz') || 'Quiz or scored assessment', t('guided.ai_plan_answer_evidence_discussion') || 'Discussion or presentation', t('guided.ai_plan_answer_evidence_project') || 'Project or created product'],
  };
  const classroomSupportOptions = [
    { id: 'multilingual', label: t('guided.ai_plan_context_multilingual') || 'Multilingual learners' },
    { id: 'reading-variability', label: t('guided.ai_plan_context_reading') || 'Reading-level variability' },
    { id: 'attention-executive', label: t('guided.ai_plan_context_attention') || 'Attention / executive-function support' },
    { id: 'sensory-access', label: t('guided.ai_plan_context_sensory') || 'Visual or hearing access' },
    { id: 'motor-input', label: t('guided.ai_plan_context_motor') || 'Alternative input / motor access' },
    { id: 'extension', label: t('guided.ai_plan_context_extension') || 'Extension and enrichment' },
  ];
  const classroomDeviceOptions = [
    { id: 'mixed', label: t('guided.ai_plan_context_devices_mixed') || 'Mixed / not sure' },
    { id: 'one-to-one', label: t('guided.ai_plan_context_devices_one') || 'One device per learner' },
    { id: 'shared', label: t('guided.ai_plan_context_devices_shared') || 'Shared devices' },
    { id: 'paper-first', label: t('guided.ai_plan_context_devices_paper') || 'Paper-first / limited devices' },
  ];
  const classroomContextLines = () => {
    const supportLabels = classroomSupportOptions.filter(option => classroomContext.supports.includes(option.id)).map(option => option.label);
    return [
      supportLabels.length ? 'learner supports: ' + supportLabels.join(', ') : '',
      classroomContext.languages ? 'classroom languages: ' + classroomContext.languages : '',
      classroomContext.devices !== 'mixed' ? 'device access: ' + (classroomDeviceOptions.find(option => option.id === classroomContext.devices)?.label || classroomContext.devices) : '',
      classroomContext.notes ? 'other classroom context: ' + classroomContext.notes : '',
    ].filter(Boolean);
  };
  const toggleClassroomSupport = (id) => {
    setClassroomContext(previous => normalizeClassroomContext({ ...previous, supports: previous.supports.includes(id) ? previous.supports.filter(item => item !== id) : [...previous.supports, id] }));
    setPlannerDirty(true); setAiPlannerQuestions([]); setAiPlannerError('');
  };
  const getAiPlannerQuestions = (goal) => {
    const lower = String(goal || '').toLowerCase();
    const questions = [];
    if (!/\b\d+\s*(min|minute|minutes|hour|hours)\b|class period|multi.?day|multiple days|\bweek\b/.test(lower)) questions.push({ id: 'time', label: t('guided.ai_plan_question_time') || 'How much lesson time is available?' });
    if (!/\bgrade\b|\bgrader\b|kindergarten|elementary|middle school|high school|college|adult|\bage\b|\bages\b/.test(lower)) questions.push({ id: 'grade', label: t('guided.ai_plan_question_grade') || 'Which learner range should this fit?' });
    if (!/print|paper|lms|canvas|schoology|moodle|classroom|take.?home|homework|live class|whole class|online|digital|offline|qr/.test(lower)) questions.push({ id: 'delivery', label: t('guided.ai_plan_question_delivery') || 'How will students receive or use the lesson?' });
    if (!/assess|quiz|test|check|project|discussion|presentation|exit ticket|practice|worksheet|product|write|create|demonstrate/.test(lower)) questions.push({ id: 'evidence', label: t('guided.ai_plan_question_evidence') || 'What evidence of learning do you want?' });
    return questions.slice(0, 2);
  };
  const normalizeAiPlannerResult = (result) => {
    const validIds = new Set((allSteps || []).map(item => item?.id).filter(id => id && !['source-input', 'directions', 'package-deliver', '_final'].includes(id)));
    const stepIds = Array.isArray(result?.stepIds) ? Array.from(new Set(result.stepIds.filter(id => validIds.has(id)))) : [];
    if (!stepIds.length) throw new Error(t('guided.ai_plan_no_steps') || 'The plan did not include any supported steps.');
    return { ...result, stepIds, estimatedMinutes: estimateAiPlanMinutes(stepIds) };
  };
  const requestAiGuidedPlan = async (skipClarification = false) => {
    const goal = String(aiPlannerGoal || '').trim();
    if (goal.length < 12) { setAiPlannerError(t('guided.ai_plan_more_detail') || 'Describe your lesson goal in a little more detail.'); return; }
    if (typeof generateGuidedPlanFromGoal !== 'function') { setAiPlannerError(t('guided.ai_plan_unavailable') || 'AI planning is unavailable right now. Choose a ready-made path below.'); return; }
    const useBestJudgment = skipClarification === 'best-judgment';
    const missingQuestions = getAiPlannerQuestions([goal, ...classroomContextLines()].join(' ')).filter(question => !String(aiPlannerAnswers[question.id] || '').trim());
    if (!skipClarification && !aiPlannerPlan && missingQuestions.length) { setAiPlannerQuestions(missingQuestions); setAiPlannerError(''); return; }
    if (!useBestJudgment && aiPlannerQuestions.length && aiPlannerQuestions.some(question => !String(aiPlannerAnswers[question.id] || '').trim())) { setAiPlannerError(t('guided.ai_plan_questions_required') || 'Answer the short planning questions to continue.'); return; }
    const contextAnswers = useBestJudgment ? {} : aiPlannerAnswers;
    const contextLines = [...Object.entries(contextAnswers).filter(([, answer]) => String(answer || '').trim()).map(([key, answer]) => `${key}: ${answer}`), ...classroomContextLines()];
    const planningGoal = contextLines.length ? `${goal}\n\nPLANNING CONTEXT:\n${contextLines.join('\n')}` : goal;
    setAiPlannerBusy(true); setAiPlannerError(''); setPendingAiPlanApply(false); setSavedAiPlanStatus('');
    try {
      const generated = normalizeAiPlannerResult(await generateGuidedPlanFromGoal(planningGoal));
      const result = { ...generated, originalGoal: goal, clarificationAnswers: { ...contextAnswers } };
      setAiPlannerPlan(result); setAiPlannerInitialPlan(snapshotAiPlan(result)); setAiPlannerUndoStack([]); setAiPlannerManualEdits({ steps: [], delivery: false, priority: false }); setAiPlannerMessages([{ role: 'teacher', text: goal }, ...(contextLines.length ? [{ role: 'teacher', text: (t('guided.ai_plan_context_message') || 'Planning context: {context}').replace('{context}', contextLines.join(' · ')) }] : []), { role: 'planner', text: result.summary || result.title }]); setAiPlannerLastChanges([]); setAiPlannerStage('customize'); setPlannerDirty(true);
      setAiPlannerQuestions([]); setAiPlannerRefinement(''); setActiveSavedAiPlanId(null); setSavedAiPlanName(result.title || '');
    } catch (error) {
      setAiPlannerError(error?.message || (t('guided.ai_plan_error') || 'The plan could not be created. Try again or choose a preset.'));
    } finally { setAiPlannerBusy(false); }
  };
  const requestAiPlanRefinement = async () => {
    const refinement = String(aiPlannerRefinement || '').trim();
    if (!aiPlannerPlan || refinement.length < 3) { setAiPlannerError(t('guided.ai_plan_refine_more_detail') || 'Tell the planner what you would like to change.'); return; }
    if (typeof generateGuidedPlanFromGoal !== 'function') { setAiPlannerError(t('guided.ai_plan_unavailable') || 'AI planning is unavailable right now.'); return; }
    setAiPlannerBusy(true); setAiPlannerError(''); setPendingAiPlanApply(false); setSavedAiPlanStatus('');
    try {
      const result = normalizeAiPlannerResult(await generateGuidedPlanFromGoal(String(aiPlannerPlan.goal || aiPlannerGoal || '').trim(), { currentPlan: aiPlannerPlan, refinement }));
      rememberAiPlanVersion(aiPlannerPlan); setAiPlannerLastChanges(summarizeAiPlanChanges(aiPlannerPlan, result));
      setAiPlannerPlan(result); setAiPlannerManualEdits({ steps: [], delivery: false, priority: false }); setAiPlannerStage('customize'); setPlannerDirty(true);
      setAiPlannerMessages(previous => [...previous, { role: 'teacher', text: refinement }, { role: 'planner', text: result.summary || result.title }].slice(-8));
      setAiPlannerRefinement('');
    } catch (error) {
      setAiPlannerError(error?.message || (t('guided.ai_plan_refine_error') || 'The plan could not be updated. Your reviewed plan is unchanged.'));
    } finally { setAiPlannerBusy(false); }
  };
  const askGuideAboutRemaining = async () => {
    const request = String(quickGuideText || '').trim();
    if (request.length < 3) { setQuickGuideStatus(t('guided.quick_guide_more_detail') || 'Add a little more detail first.'); return; }
    const baseGoal = String(guidedPlanBrief?.goal || guidedPlanBrief?.title || inputText || 'Adjust the remaining Guided lesson path.').trim();
    const optionalIds = (GUIDED_STEPS || []).map(item => item?.id).filter(id => id && !['source-input', 'directions', 'package-deliver', '_final'].includes(id));
    const currentPlan = {
      id: 'active-guided-plan', title: guidedPlanBrief?.title || (t('guided.quick_guide_current_plan') || 'Current Guided path'), summary: guidedPlanBrief?.summary || '', goal: baseGoal, originalGoal: baseGoal, rationale: guidedPlanBrief?.rationale || '',
      stepIds: optionalIds, stepReasons: { ...(guidedPlanBrief?.stepReasons || {}) }, assumptions: [...(guidedPlanBrief?.assumptions || [])], estimatedMinutes: Math.max(5, estimatedRemainingMinutes), deliverySetting, deliveryPriority, classroomContext: normalizeClassroomContext(classroomContext),
    };
    if (typeof generateGuidedPlanFromGoal !== 'function') {
      setAiPlannerGoal(baseGoal); setAiPlannerPlan(currentPlan); setAiPlannerInitialPlan(snapshotAiPlan(currentPlan)); setAiPlannerRefinement(request); setAiPlannerStage('customize'); setPlannerDirty(true); setQuickGuideStatus(''); setShowAiPlanner(true); setShowPicker(false); return;
    }
    setQuickGuideBusy(true); setQuickGuideStatus(t('guided.quick_guide_working') || 'Adjusting the remaining path...');
    try {
      const result = normalizeAiPlannerResult(await generateGuidedPlanFromGoal(baseGoal, { currentPlan, refinement: request + '\nPreserve completed work and protected milestones. Change only the remaining path.' }));
      setAiPlannerGoal(baseGoal); setAiPlannerPlan(result); setAiPlannerInitialPlan(snapshotAiPlan(currentPlan)); setAiPlannerUndoStack([snapshotAiPlan(currentPlan)].filter(Boolean)); setAiPlannerManualEdits({ steps: [], delivery: false, priority: false });
      setAiPlannerMessages([{ role: 'teacher', text: request }, { role: 'planner', text: result.summary || result.title }]); setAiPlannerLastChanges(summarizeAiPlanChanges(currentPlan, result)); setAiPlannerRefinement(''); setAiPlannerStage('customize'); setPlannerDirty(true);
      setPlannerRecoveryDraft(null); setQuickGuideText(''); setQuickGuideStatus(''); setShowAiPlanner(true); setShowPicker(false);
    } catch (error) { setQuickGuideStatus(error?.message || (t('guided.quick_guide_error') || 'The remaining path could not be adjusted. Your current path is unchanged.')); }
    finally { setQuickGuideBusy(false); }
  };  const updateAiPlanStep = (id, enabled) => {
    if (!aiPlannerPlan) return;
    rememberAiPlanVersion(aiPlannerPlan);
    setAiPlannerPlan(previous => {
      const current = Array.isArray(previous?.stepIds) ? previous.stepIds : [];
      const next = enabled ? Array.from(new Set([...current, id])) : current.filter(stepId => stepId !== id);
      return { ...previous, stepIds: next, estimatedMinutes: estimateAiPlanMinutes(next) };
    });
    setAiPlannerManualEdits(previous => ({ ...previous, steps: Array.from(new Set([...(previous.steps || []), id])) })); setAiPlannerLastChanges([]); setSavedAiPlanStatus(''); setPlannerDirty(true);
  };
  const saveCurrentAiPlan = () => {
    if (!aiPlannerPlan?.stepIds?.length) return;
    const name = String(savedAiPlanName || aiPlannerPlan.title || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Saved Guided plan';
    const id = activeSavedAiPlanId || ('guided-plan-' + Date.now().toString(36));
    const saved = { ...aiPlannerPlan, id, source: 'saved', name, title: aiPlannerPlan.title || name, goal: String(aiPlannerPlan.goal || aiPlannerGoal || '').slice(0, 1200), originalGoal: String(aiPlannerGoal || aiPlannerPlan.originalGoal || aiPlannerPlan.goal || '').slice(0, 1200), clarificationAnswers: { ...aiPlannerAnswers }, classroomContext: normalizeClassroomContext(classroomContext), savedAt: new Date().toISOString() };
    setSavedAiPlans(previous => normalizeSavedGuidedPlans(activeSavedAiPlanId ? previous.map(item => item.id === id ? saved : item) : [...previous, saved]));
    setActiveSavedAiPlanId(id); setSavedAiPlanName(name); setSavedAiPlanStatus(t('guided.ai_plan_saved_status') || 'Plan saved on this device.'); setPlannerDirty(false); clearPlannerDraft();
  };
  const loadSavedAiPlan = (saved) => {
    try {
      const plan = normalizeAiPlannerResult({ ...saved, source: 'saved' });
      setAiPlannerPlan(plan); setAiPlannerInitialPlan(snapshotAiPlan(plan)); setAiPlannerUndoStack([]); setAiPlannerManualEdits({ steps: [], delivery: false, priority: false }); setAiPlannerStage('customize'); setAiPlannerGoal(saved.originalGoal || saved.goal || ''); setAiPlannerAnswers(saved.clarificationAnswers || {}); setClassroomContext(normalizeClassroomContext(saved.classroomContext)); setAiPlannerQuestions([]); setSavedAiPlanName(saved.name || saved.title || ''); setActiveSavedAiPlanId(saved.id);
      setAiPlannerMessages([{ role: 'planner', text: (t('guided.ai_plan_loaded_message') || 'Loaded saved plan: {name}').replace('{name}', saved.name || saved.title || '') }]);
      setAiPlannerRefinement(''); setAiPlannerLastChanges([]); setAiPlannerError(''); setSavedAiPlanStatus(t('guided.ai_plan_loaded_status') || 'Saved plan loaded for review.'); setPendingDeleteSavedAiPlanId(null); setPlannerDirty(false); clearPlannerDraft();
    } catch (error) { setAiPlannerError(error?.message || (t('guided.ai_plan_saved_invalid') || 'This saved plan no longer contains supported steps.')); }
  };
  const deleteSavedAiPlan = (id) => {
    setSavedAiPlans(previous => previous.filter(item => item.id !== id));
    if (activeSavedAiPlanId === id) { setActiveSavedAiPlanId(null); setSavedAiPlanName(aiPlannerPlan?.title || ''); }
    setPendingDeleteSavedAiPlanId(null); setSavedAiPlanStatus(t('guided.ai_plan_deleted_status') || 'Saved plan deleted.');
  };
  const exportSavedAiPlans = () => {
    if (!savedAiPlans.length || typeof document === 'undefined') return;
    const payload = { format: 'alloflow-guided-plans', version: 1, exportedAt: new Date().toISOString(), plans: savedAiPlans.map(plan => ({ ...plan, classroomContext: normalizeClassroomContext(plan.classroomContext) })) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'alloflow-guided-plans-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 0);
    setSavedAiPlanStatus((t('guided.ai_plan_exported_status') || 'Exported {count} Guided plan(s).').replace('{count}', savedAiPlans.length));
  };
  const importSavedAiPlans = async (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    try {
      if (file.size > 512000) throw new Error(t('guided.ai_plan_import_too_large') || 'That plan file is too large.');
      const parsed = JSON.parse(await file.text());
      const rawPlans = Array.isArray(parsed) ? parsed : (parsed?.format === 'alloflow-guided-plans' && Number(parsed?.version) === 1 ? parsed.plans : null);
      if (!Array.isArray(rawPlans)) throw new Error(t('guided.ai_plan_import_invalid') || 'This is not a supported AlloFlow Guided-plan file.');
      const supportedIds = new Set((allSteps || []).map(item => item?.id).filter(id => id && !['source-input', 'directions', 'package-deliver', '_final'].includes(id)));
      const existingSignatures = new Set(savedAiPlans.map(item => [item.name, item.stepIds.join(','), item.deliverySetting, item.deliveryPriority].join('|')));
      const items = rawPlans.slice(-12).map((raw, index) => {
        const plan = normalizeSavedGuidedPlans([raw])[0];
        if (!plan) return null;
        const originalCount = plan.stepIds.length;
        plan.stepIds = plan.stepIds.filter(id => supportedIds.has(id));
        plan.stepReasons = Object.fromEntries(Object.entries(plan.stepReasons || {}).filter(([id]) => plan.stepIds.includes(id)));
        if (!plan.stepIds.length) return null;
        const signature = [plan.name, plan.stepIds.join(','), plan.deliverySetting, plan.deliveryPriority].join('|');
        const duplicate = existingSignatures.has(signature);
        if (!duplicate) existingSignatures.add(signature);
        return { key: plan.id + '-' + index, plan, selected: !duplicate, duplicate, unsupportedCount: Math.max(0, originalCount - plan.stepIds.length) };
      }).filter(Boolean);
      if (!items.length) throw new Error(t('guided.ai_plan_import_empty') || 'No supported Guided plans were found in that file.');
      setPendingPlanImport({ fileName: String(file.name || 'Guided plan file').slice(0, 120), items });
      setAiPlannerError(''); setSavedAiPlanStatus('');
    } catch (error) { setPendingPlanImport(null); setAiPlannerError(error?.message || (t('guided.ai_plan_import_invalid') || 'This is not a supported AlloFlow Guided-plan file.')); }
    finally { if (event?.target) event.target.value = ''; }
  };
  const togglePendingPlanImport = (key) => setPendingPlanImport(previous => previous ? ({ ...previous, items: previous.items.map(item => item.key === key && !item.duplicate ? { ...item, selected: !item.selected } : item) }) : previous);
  const confirmPlanImport = () => {
    if (!pendingPlanImport) return;
    const chosen = pendingPlanImport.items.filter(item => item.selected && !item.duplicate).map(item => item.plan);
    const ids = new Set(savedAiPlans.map(item => item.id));
    const additions = chosen.map((item, index) => { const baseId = item.id || ('imported-guided-plan-' + Date.now().toString(36) + '-' + index); let id = baseId, suffix = 1; while (ids.has(id)) id = baseId + '-' + suffix++; ids.add(id); return { ...item, id, source: 'saved', savedAt: new Date().toISOString() }; });
    setSavedAiPlans(normalizeSavedGuidedPlans([...savedAiPlans, ...additions]));
    setPendingPlanImport(null); setShowSavedAiPlans(true); setAiPlannerError(''); setSavedAiPlanStatus((t('guided.ai_plan_imported_status') || 'Imported {count} new Guided plan(s).').replace('{count}', additions.length));
  };  const finishAiPlanApply = () => {
    setDeliverySetting(['take-home', 'print', 'live', 'lms'].includes(aiPlannerPlan.deliverySetting) ? aiPlannerPlan.deliverySetting : 'take-home');
    setDeliveryPriority(['accessible', 'editable', 'assessment', 'interactive', 'low-connectivity'].includes(aiPlannerPlan.deliveryPriority) ? aiPlannerPlan.deliveryPriority : 'accessible');
    setReadinessChecks({}); setPendingAiPlanApply(false); setPendingPlannerClose(false); setPlannerDirty(false); clearPlannerDraft(); setShowAiPlanner(false); setShowPicker(false); rememberPathChoice();
  };
  const appliedAiPlanPayload = () => ({
    id: 'ai-plan', label: aiPlannerPlan.title || 'AI-planned lesson', title: aiPlannerPlan.title || 'AI-planned lesson',
    description: aiPlannerPlan.summary || '', summary: aiPlannerPlan.summary || '', goal: aiPlannerGoal || aiPlannerPlan.originalGoal || aiPlannerPlan.goal || '',
    rationale: aiPlannerPlan.rationale || '', stepIds: aiPlannerPlan.stepIds, stepReasons: { ...(aiPlannerPlan.stepReasons || {}) },
    assumptions: [...(aiPlannerPlan.assumptions || [])], estimatedMinutes: aiPlannerPlan.estimatedMinutes, classroomContext: normalizeClassroomContext(classroomContext),
  });
  const applyAiPlanNow = () => {
    if (!aiPlannerPlan || !Array.isArray(aiPlannerPlan.stepIds) || !aiPlannerPlan.stepIds.length) return;
    applyGuidedPreset(appliedAiPlanPayload());
    finishAiPlanApply();
  };
  const applyAiPlanToRemainingNow = () => {
    if (!aiPlannerPlan || typeof applyGuidedPlanToRemaining !== 'function') return applyAiPlanNow();
    applyGuidedPlanToRemaining(appliedAiPlanPayload());
    finishAiPlanApply();
  };
  const canAdjustRemainingPath = hasGuidedProgress && !isLast && typeof applyGuidedPlanToRemaining === 'function';
  const applyAiPlan = () => { if (hasGuidedProgress) setPendingAiPlanApply(true); else applyAiPlanNow(); };
  const chooseStepToggle = (id) => { if (guidedBusy) return; if (hasGuidedProgress) setPendingStepId(id); else toggleGuidedStepId(id); };
  const confirmStepToggle = () => { if (!pendingStepId) return; toggleGuidedStepId(pendingStepId); setPendingStepId(null); };
  const requestGuidedJump = (targetIndex) => {
    const target = Number(targetIndex);
    if (target <= guidedStep) { (handleGuidedJump || setGuidedStep)(target); return; }
    const bypassedIds = GUIDED_STEPS.slice(guidedStep, target).map(item => item.id).filter(id => !_effectiveCompletedSet.has(id) && !(guidedSkippedIds || []).includes(id));
    if (!bypassedIds.length) { (handleGuidedJump || setGuidedStep)(target); return; }
    setPendingJump({ target, bypassedIds });
  };
  const confirmGuidedJump = () => {
    if (!pendingJump) return;
    const targetStep = GUIDED_STEPS[pendingJump.target];
    const fromPhase = step.phase || 'guided', toPhase = targetStep?.phase || 'guided';
    if (fromPhase !== toPhase) {
      const crossed = Array.from(new Set(GUIDED_STEPS.slice(guidedStep + 1, pendingJump.target + 1).map(item => item.phase || 'guided')));
      setPhaseTransitionNotice({ from: currentPhaseLabel || fromPhase, to: (() => { const key = 'guided.phase_' + toPhase; const translated = t(key); return translated && translated !== key ? translated : (activePhaseDefinitions.find(item => item.id === toPhase)?.label || toPhase); })(), phases: crossed.length, skipped: pendingJump.bypassedIds.length });
    }
    if (handleGuidedJump) handleGuidedJump(pendingJump.target, pendingJump.bypassedIds); else setGuidedStep(pendingJump.target);
    setPendingJump(null);
  };
  const currentResultItem = _matchTypes ? [...(history || [])].reverse().find(item => item && _matchTypes.includes(item.type) && (!_createdIdSet.size || _createdIdSet.has(item.id))) : null;
  const advanceFromStep = guidedAdvanceNotice ? (GUIDED_STEPS || []).find(item => item.id === guidedAdvanceNotice.fromId) : null;
  const advanceToStep = guidedAdvanceNotice ? (GUIDED_STEPS || []).find(item => item.id === guidedAdvanceNotice.toId) : null;
  const advanceResultItem = guidedAdvanceNotice?.historyId ? (history || []).find(item => item?.id === guidedAdvanceNotice.historyId) : null;
  const resultPreviewText = (() => { const item = currentResultItem; const data = item?.data && typeof item.data === 'object' ? item.data : {}; const candidates = [item?.summary, item?.text, item?.content, data.summary, data.text, data.content, data.description]; const value = candidates.find(entry => typeof entry === 'string' && entry.trim()); return value ? value.replace(/\s+/g, ' ').trim().slice(0, 260) : ''; })();
  const goToGuidedStepId = (id) => { const index = (GUIDED_STEPS || []).findIndex(item => item.id === id); if (index >= 0) setGuidedStep(index); };
  const runReadinessAction = (action) => { if (action === 'learner-preview' && canPreviewGuidedStudentAssignment && typeof previewGuidedStudentAssignment === 'function') { previewGuidedStudentAssignment(); return; } goToGuidedStepId(action === 'learner-preview' ? 'package-deliver' : action); };
  const performStartTeaching = () => {
    setPendingReadinessAction(null);
    if (canPreviewGuidedStudentAssignment && typeof previewGuidedStudentAssignment === 'function') previewGuidedStudentAssignment();
    else if (latestLessonPlanItem && typeof openGuidedHistoryItem === 'function') openGuidedHistoryItem(latestLessonPlanItem);
    else if (typeof openGuidedDocumentBuilder === 'function') openGuidedDocumentBuilder();
  };
  const canStartTeaching = !!((canPreviewGuidedStudentAssignment && typeof previewGuidedStudentAssignment === 'function') || (latestLessonPlanItem && typeof openGuidedHistoryItem === 'function') || typeof openGuidedDocumentBuilder === 'function');
  const focusReadinessChecklist = () => {
    setPendingReadinessAction(null);
    requestAnimationFrame(() => {
      try { _readinessRegionRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); _readinessRegionRef.current?.focus(); } catch (_) {}
    });
  };
  const openReadinessGate = (action) => {
    _readinessActionReturnRef.current = typeof document !== 'undefined' ? document.activeElement : null;
    setPendingReadinessAction(action);
  };
  const dismissReadinessGate = () => {
    setPendingReadinessAction(null);
    requestAnimationFrame(() => { try { const target = _readinessActionReturnRef.current; if (target?.focus && document.contains(target)) target.focus(); } catch (_) {} });
  };
  const requestStartTeaching = () => { if (!canStartTeaching) return; if (readinessRemainingItems.length) openReadinessGate('teach'); else performStartTeaching(); };
  const completeGuidedRun = () => {
    setPendingReadinessAction(null);
    const summary = { completedCount, skippedCount, resourceCount: recapItems.length, readinessCount, readinessTotal, stepLabels: GUIDED_STEPS.map(item => localizeStep(item, 'label')) };
    if (typeof handleCompleteGuidedMode === 'function') handleCompleteGuidedMode(summary);
    else { if (typeof resetGuidedProgress === 'function') resetGuidedProgress(); handleExitGuidedMode(); }
  };
  const requestFinishGuidedRun = () => { if (readinessRemainingItems.length) openReadinessGate('finish'); else completeGuidedRun(); };
  React.useEffect(() => { if (!isLast || readinessRemainingItems.length === 0) setPendingReadinessAction(null); }, [isLast, readinessRemainingItems.length]);
  React.useEffect(() => {
    if (!pendingReadinessAction) return;
    const timer = setTimeout(() => { try { _readinessGatePrimaryRef.current?.focus(); } catch (_) {} }, 0);
    return () => clearTimeout(timer);
  }, [pendingReadinessAction]);
  const nextStep = GUIDED_STEPS[guidedStep + 1] || null;
  const isPhaseBoundary = !!(!isLast && currentPhase && nextStep && (nextStep.phase || 'guided') !== currentPhase.id);
  const currentPhaseSteps = currentPhase ? GUIDED_STEPS.filter(item => (item.phase || 'guided') === currentPhase.id) : [];
  const currentPhaseCompletedCount = currentPhaseSteps.filter(item => _effectiveCompletedSet.has(item.id)).length;
  const currentPhaseSkippedCount = currentPhaseSteps.filter(item => (guidedSkippedIds || []).includes(item.id)).length;
  const currentPhaseHistoryTypes = new Set(currentPhaseSteps.flatMap(item => STEP_HISTORY_TYPES[item.id] || []));
  const currentPhaseResources = (history || []).filter(item => item?.id && _createdIdSet.has(item.id) && currentPhaseHistoryTypes.has(item.type)).map(item => ({ item, title: item.title || humanize(item.type) }));
  const latestPhaseResourceItem = currentPhaseResources[currentPhaseResources.length - 1]?.item || currentResultItem;
  const nextPhaseDefinition = nextStep ? activePhaseDefinitions.find(item => item.id === (nextStep.phase || 'guided')) : null;
  const nextPhaseKey = nextPhaseDefinition ? 'guided.phase_' + nextPhaseDefinition.id : '';
  const nextPhaseTranslated = nextPhaseKey ? t(nextPhaseKey) : '';
  const nextPhaseLabel = nextPhaseDefinition ? ((nextPhaseTranslated && nextPhaseTranslated !== nextPhaseKey) ? nextPhaseTranslated : nextPhaseDefinition.label) : '';
  const currentStepSkipped = (guidedSkippedIds || []).includes(step.id);
  const phaseCheckpointReady = isPhaseBoundary && (stepDone || currentStepSkipped);
  const expectedStepOutput = detailEntry?.outputs?.[0] || (step.id === 'package-deliver' ? deliveryRecommendation.primary : '');
  const upNextLabel = isLast ? (t('guided.journey_teach') || 'Teach and share') : (isPhaseBoundary ? (t('guided.journey_checkpoint') || 'Review phase checkpoint') : (nextStep ? localizeStep(nextStep, 'label') : ''));
  const stepWhyNow = activeStepReason || detailEntry?.headline || currentPhaseDescription;
  React.useEffect(() => {
    if (phaseCheckpointReady && !_phaseCheckpointWasReadyRef.current) requestAnimationFrame(() => _phaseCheckpointRef.current?.focus());
    _phaseCheckpointWasReadyRef.current = phaseCheckpointReady;
  }, [phaseCheckpointReady, step.id]);
  React.useEffect(() => { if (phaseTransitionNotice) requestAnimationFrame(() => _phaseNoticeRef.current?.focus()); }, [phaseTransitionNotice]);
  const saveFeedback = () => {
    if (!feedbackStepId) return;
    try { const entry = { stepId: feedbackStepId === 'none' ? null : feedbackStepId, completedCount, skippedCount, at: new Date().toISOString() }; const next = [...feedbackEntries, entry].slice(-50); localStorage.setItem('allo_guided_feedback', JSON.stringify(next)); setFeedbackEntries(next); setFeedbackSaved(true); } catch (_) {}
  };
  const clearFeedback = () => { try { localStorage.removeItem('allo_guided_feedback'); } catch (_) {} setFeedbackEntries([]); setShowFeedbackHistory(false); };
  const progressSaveStatus = ['saved', 'error'].includes(guidedProgressSaveState?.status) ? guidedProgressSaveState.status : 'saving';
  const progressSavedAt = guidedProgressSaveState?.at && Number.isFinite(Date.parse(guidedProgressSaveState.at)) ? guidedProgressSaveState.at : null;
  const progressSaveLabel = progressSaveStatus === 'error'
    ? (t('guided.progress_not_saved') || 'Progress is not saved')
    : progressSaveStatus === 'saved'
      ? ((t('guided.progress_saved_at') || 'Saved on this device at {time}').replace('{time}', progressSavedAt ? new Date(progressSavedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : (t('guided.just_now') || 'just now')))
      : (t('guided.progress_saving') || 'Saving progress…');
  const requestResumeLater = () => {
    if (progressSaveStatus !== 'error') { handleExitGuidedMode(); return; }
    _unsafeExitReturnRef.current = typeof document !== 'undefined' ? document.activeElement : null;
    setPendingUnsafeExit(true);
  };
  const dismissUnsafeExit = () => {
    setPendingUnsafeExit(false);
    requestAnimationFrame(() => { try { const target = _unsafeExitReturnRef.current; if (target?.focus && document.contains(target)) target.focus(); } catch (_) {} });
  };
  const confirmUnsafeExit = () => { setPendingUnsafeExit(false); handleExitGuidedMode(); };
  React.useEffect(() => {
    if (!pendingUnsafeExit) return;
    const timer = setTimeout(() => { try { _unsafeExitPrimaryRef.current?.focus(); } catch (_) {} }, 0);
    return () => clearTimeout(timer);
  }, [pendingUnsafeExit]);
  React.useEffect(() => { if (progressSaveStatus !== 'error' && pendingUnsafeExit) setPendingUnsafeExit(false); }, [progressSaveStatus, pendingUnsafeExit]);
  const clearGuidedLocalData = () => {
    _skipUiPersistRef.current = true;
    try { ['allo_guided_completed_runs', 'allo_guided_last_completion', 'allo_guided_duration_stats', 'allo_guided_feedback', 'allo_guided_ui_state', 'allo_guided_path_prompt_seen', 'allo_guided_auto_advance', 'allo_guided_readiness_checks', 'allo_guided_delivery_preferences', 'allo_guided_saved_plans', 'allo_guided_planner_draft', 'allo_guided_classroom_context'].forEach(key => localStorage.removeItem(key)); } catch (_) {}
    setLastCompletion(null); setDurationStats({}); setFeedbackEntries([]); setFeedbackStepId(''); setFeedbackSaved(false); setShowFeedbackHistory(false); setReadinessChecks({}); setDeliverySetting('take-home'); setDeliveryPriority('accessible'); setShowAiPlanner(false); setAiPlannerGoal(''); setAiPlannerPlan(null); setAiPlannerError(''); setAiPlannerRefinement(''); setAiPlannerMessages([]); setAiPlannerLastChanges([]); setAiPlannerQuestions([]); setAiPlannerAnswers({}); setSavedAiPlans([]); setPendingPlanImport(null); setClassroomContext(normalizeClassroomContext({})); setSavedAiPlanName(''); setActiveSavedAiPlanId(null); setSavedAiPlanStatus(''); setPendingDeleteSavedAiPlanId(null); setPendingPlannerClose(false); setPlannerRecoveryDraft(null); setPlannerDirty(false); setShowPicker(false); setInfoTab(null); setIsCollapsed(false); setPendingClearGuidedData(false);
    if (typeof setGuidedAutoAdvance === 'function') setGuidedAutoAdvance(false);
    if (typeof setShowGuidedTip === 'function') setShowGuidedTip(false);
  };
  return (
    <>
      <style>{`@keyframes alloGuidedTargetPulse{0%,100%{outline-color:rgba(99,102,241,.8);box-shadow:0 0 0 2px rgba(99,102,241,.7),0 0 22px rgba(99,102,241,.45)}50%{outline-color:rgba(129,140,248,1);box-shadow:0 0 0 3px rgba(129,140,248,.95),0 0 36px rgba(99,102,241,.65)}}:where(.allo-guided-target,[data-allo-guided-target="true"]){outline:3px solid rgba(99,102,241,.8)!important;outline-offset:3px;animation:alloGuidedTargetPulse 2s ease-in-out infinite}.allo-guided-banner button,.allo-guided-banner select{min-height:40px}.allo-guided-banner button:disabled,.allo-guided-banner select:disabled{cursor:not-allowed!important;opacity:.58!important}body:has([aria-modal="true"]) :where(.allo-guided-target,[data-allo-guided-target="true"]){animation-play-state:paused!important;outline-color:transparent!important;box-shadow:none!important}.allo-guided-planning-backdrop{position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;padding:12px;background:rgba(2,6,23,.8);backdrop-filter:blur(6px)}.allo-guided-planning-studio{position:relative;width:min(1080px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow-y:auto;overscroll-behavior:contain;padding:0 26px 26px;border-radius:20px;background:linear-gradient(150deg,#063c35 0%,#10233f 48%,#1e1b4b 100%);border:1px solid rgba(110,231,183,.42);box-shadow:0 28px 90px rgba(2,6,23,.72);color:white;scrollbar-gutter:stable}.allo-guided-planning-studio[aria-busy="true"]{cursor:progress}.allo-guided-planning-studio :where(button,input,textarea,select){font-size:14px!important}.allo-guided-planning-studio :where(p,label,li,span){font-size:13px!important;line-height:1.5}.allo-guided-planning-studio :where(strong,legend){font-size:14px!important}.allo-guided-planning-header strong{font-size:21px!important}.allo-guided-planning-header span{font-size:13px!important}.allo-guided-planning-header{position:sticky;top:0;z-index:5;margin:0 -26px 14px;padding:18px 26px 14px;background:linear-gradient(180deg,#063c35 74%,rgba(6,60,53,.97));border-bottom:1px solid rgba(110,231,183,.24)}.allo-guided-planning-header-status{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:7px}.allo-guided-save-state{display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border-radius:999px;background:rgba(15,23,42,.42);color:#d1fae5;border:1px solid rgba(110,231,183,.2)}.allo-guided-progress-save{display:inline-flex;align-items:center;gap:4px;max-width:220px;margin-top:3px;padding:2px 7px;border-radius:999px;background:rgba(16,185,129,.13);border:1px solid rgba(110,231,183,.3);color:#d1fae5;font-size:10px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.allo-guided-progress-save[data-state="saving"]{background:rgba(59,130,246,.13);border-color:rgba(147,197,253,.3);color:#dbeafe}.allo-guided-progress-save[data-state="error"]{background:rgba(127,29,29,.3);border-color:rgba(248,113,113,.55);color:#fecaca}.allo-guided-save-warning{display:grid;gap:6px;margin:10px 0;padding:11px 12px;border-radius:11px;background:rgba(127,29,29,.32);border:1px solid rgba(248,113,113,.55);color:#fecaca}.allo-guided-save-warning strong{color:white}.allo-guided-save-warning>div{display:flex;gap:7px;flex-wrap:wrap}.allo-guided-save-warning button{flex:1;min-width:140px;border-radius:8px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:white;font-weight:800}.allo-guided-save-warning button:first-child{background:#fbbf24;color:#422006;border-color:#fcd34d}.allo-guided-stage-nav{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 16px}.allo-guided-stage-button{display:flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:8px 10px;border-radius:12px;border:1px solid rgba(165,180,252,.24);background:rgba(15,23,42,.34);color:#c7d2fe;font-weight:800}.allo-guided-stage-button[aria-current="step"]{background:rgba(79,70,229,.32);border-color:rgba(165,180,252,.65);color:white;box-shadow:inset 0 0 0 1px rgba(165,180,252,.15)}.allo-guided-stage-button:disabled{opacity:.42!important}.allo-guided-stage-number{display:grid;place-items:center;width:25px;height:25px;border-radius:999px;background:rgba(255,255,255,.1);font-weight:900}.allo-guided-stage-button[aria-current="step"] .allo-guided-stage-number{background:#818cf8;color:#111827}.allo-guided-planning-panel{padding:16px;border-radius:14px;background:rgba(15,23,42,.32);border:1px solid rgba(148,163,184,.14)}.allo-guided-plan-heading{display:flex;gap:7px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:12px}.allo-guided-plan-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.85fr);gap:18px;align-items:start}.allo-guided-plan-main{min-width:0;display:grid;gap:12px}.allo-guided-live-summary{position:sticky;top:105px;display:grid;gap:10px;padding:15px;border-radius:14px;background:rgba(15,23,42,.58);border:1px solid rgba(110,231,183,.24);box-shadow:0 14px 30px rgba(2,6,23,.2)}.allo-guided-summary-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.allo-guided-summary-metric{padding:8px 6px;border-radius:10px;background:rgba(255,255,255,.055);text-align:center}.allo-guided-summary-metric strong{display:block;color:#a7f3d0}.allo-guided-edit-chip{display:inline-flex;align-items:center;margin-left:6px;padding:2px 6px;border-radius:999px;background:rgba(251,191,36,.14);color:#fde68a;font-size:11px!important;font-weight:800}.allo-guided-planning-actions{position:sticky;bottom:-1px;z-index:4;margin:16px -16px -16px;padding:12px 16px;background:rgba(9,20,40,.97);border-top:1px solid rgba(110,231,183,.22);box-shadow:0 -12px 24px rgba(2,6,23,.26)}.allo-guided-confirm-layer{position:fixed;inset:0;z-index:9;display:grid;place-items:center;padding:20px;background:rgba(2,6,23,.68);backdrop-filter:blur(3px)}.allo-guided-confirm-card{width:min(520px,calc(100vw - 32px));padding:20px;border-radius:16px;background:#172554;border:1px solid rgba(251,191,36,.55);box-shadow:0 22px 70px rgba(2,6,23,.72);color:#fef3c7}.allo-guided-confirm-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.allo-guided-phase-rail{display:grid;grid-template-columns:repeat(auto-fit,minmax(82px,1fr));gap:6px;margin:0 0 12px}.allo-guided-phase-segment{position:relative;min-width:0;padding:8px 7px;border-radius:10px;background:rgba(255,255,255,.055);border:1px solid rgba(165,180,252,.14);color:#c7d2fe;text-align:center}.allo-guided-phase-segment[data-state="current"]{background:rgba(99,102,241,.3);border-color:#818cf8;color:white;box-shadow:0 0 0 1px rgba(129,140,248,.22)}.allo-guided-phase-segment[data-state="done"]{background:rgba(16,185,129,.16);border-color:rgba(52,211,153,.4);color:#d1fae5}.allo-guided-planning-studio :where(button,input,textarea,select):focus-visible,.allo-guided-banner :where(button,input,textarea,select):focus-visible{outline:3px solid #fbbf24!important;outline-offset:2px}.allo-guided-collapsible{border:1px solid rgba(165,180,252,.18);border-radius:12px;background:rgba(15,23,42,.24);overflow:hidden}.allo-guided-collapsible>summary{cursor:pointer;padding:10px 12px;color:#dbeafe;font-weight:800}.allo-guided-collapsible[open]>summary{border-bottom:1px solid rgba(165,180,252,.16)}.allo-guided-focus-more{margin-bottom:10px}.allo-guided-focus-more>summary{display:flex;justify-content:space-between;gap:10px}.allo-guided-focus-more>summary span{color:#a7f3d0}.allo-guided-focus-more-body{padding:10px 10px 0}.allo-guided-resume-card{display:grid;gap:6px;margin-bottom:10px;padding:12px;border-radius:12px;background:linear-gradient(135deg,rgba(16,185,129,.2),rgba(79,70,229,.22));border:1px solid rgba(167,243,208,.45);color:#d1fae5}.allo-guided-resume-card strong{color:white}.allo-guided-resume-card>div,.allo-guided-inline-preview>div{display:flex;gap:7px;flex-wrap:wrap}.allo-guided-resume-card button,.allo-guided-inline-preview button,.allo-guided-readiness-fixes button{flex:1;border:1px solid rgba(165,180,252,.4);border-radius:8px;background:rgba(255,255,255,.09);color:white;font-weight:800}.allo-guided-undo{display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:8px 10px;border-radius:9px;background:rgba(251,191,36,.13);border:1px solid rgba(251,191,36,.38);color:#fef3c7}.allo-guided-undo span{flex:1}.allo-guided-advance-handoff{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px;margin-bottom:8px;padding:10px;border-radius:10px;background:rgba(16,185,129,.16);border:1px solid rgba(110,231,183,.42);color:#d1fae5}.allo-guided-advance-handoff>span{font-size:18px;color:#6ee7b7}.allo-guided-advance-handoff strong{display:block;color:white}.allo-guided-advance-handoff div>span{display:block;margin-top:2px}.allo-guided-advance-actions{grid-column:2;display:flex;gap:6px;flex-wrap:wrap}.allo-guided-advance-actions button{min-height:34px!important;border:1px solid rgba(165,180,252,.35);border-radius:7px;background:rgba(255,255,255,.08);color:white;font-weight:800}.allo-guided-undo button{min-height:34px!important;border:0;border-radius:7px;font-weight:800}.allo-guided-journey-context{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:10px}.allo-guided-journey-context>div{min-width:0;padding:8px;border-radius:9px;background:rgba(15,23,42,.3);border:1px solid rgba(165,180,252,.16)}.allo-guided-journey-context span{display:block;color:#a7f3d0;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}.allo-guided-journey-context strong{display:block;margin-top:3px;color:#e0e7ff;font-size:11px;line-height:1.35}.allo-guided-resource-shelf{margin-bottom:10px}.allo-guided-resource-shelf>summary{display:flex;justify-content:space-between;gap:8px}.allo-guided-resource-shelf>summary strong{display:grid;place-items:center;min-width:24px;height:24px;border-radius:999px;background:#10b981;color:#052e2b}.allo-guided-resource-shelf>div{display:grid;gap:5px;padding:10px 12px;color:#c7d2fe}.allo-guided-resource-shelf button{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:7px;align-items:center;width:100%;text-align:left;border:1px solid rgba(165,180,252,.18);border-radius:8px;background:rgba(255,255,255,.055);color:white}.allo-guided-resource-shelf button span:last-child{color:#a7f3d0;font-weight:800}.allo-guided-resource-shelf small{color:#a5b4fc}.allo-guided-inline-preview{display:grid;gap:5px;margin-bottom:10px;padding:11px 12px;border-radius:12px;background:rgba(16,185,129,.13);border:1px solid rgba(110,231,183,.35);color:#d1fae5}.allo-guided-inline-preview strong{color:white}.allo-guided-inline-preview p{margin:2px 0;color:#e0e7ff;line-height:1.45}.allo-guided-ask{margin-bottom:10px}.allo-guided-ask>div{display:grid;gap:7px;padding:10px 12px;color:#dbeafe}.allo-guided-ask textarea{width:100%;resize:vertical;border-radius:9px;border:1px solid rgba(165,180,252,.45);background:#172554;color:white;padding:8px}.allo-guided-ask>div>button{border:0;border-radius:9px;background:#10b981;color:#052e2b;font-weight:900}.allo-guided-prompt-chips{display:flex;gap:6px;flex-wrap:wrap}.allo-guided-prompt-chips button{min-height:34px!important;border:1px solid rgba(165,180,252,.35);border-radius:999px;background:rgba(99,102,241,.18);color:#e0e7ff}.allo-guided-readiness-fixes{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;padding:8px;border-radius:8px;background:rgba(251,191,36,.1)}.allo-guided-readiness-fixes strong{flex-basis:100%;color:#fef3c7}.allo-guided-readiness-fixes button{padding:6px 8px}.allo-guided-start-teaching{flex-basis:100%!important;min-width:100%!important;border:0!important;background:linear-gradient(135deg,#fbbf24,#10b981)!important;color:#052e2b!important;font-weight:950!important}.allo-guided-launch-gate{display:grid;gap:7px;margin-bottom:10px;padding:12px;border-radius:12px;background:linear-gradient(135deg,rgba(120,53,15,.38),rgba(127,29,29,.25));border:1px solid rgba(251,191,36,.58);color:#fef3c7}.allo-guided-launch-gate strong{color:white;font-size:14px}.allo-guided-launch-gate>span{font-size:12px;line-height:1.45}.allo-guided-launch-gate ul{display:grid;gap:3px;margin:2px 0;padding-left:20px;color:#fde68a;font-size:12px}.allo-guided-launch-gate>div{display:flex;gap:7px;flex-wrap:wrap}.allo-guided-launch-gate button{flex:1;min-width:130px;border:1px solid rgba(255,255,255,.3);border-radius:8px;background:rgba(255,255,255,.09);color:white;font-weight:800}.allo-guided-launch-gate button:first-child{background:#fbbf24;color:#422006;border-color:#fcd34d}@media (forced-colors:active){:where(.allo-guided-target,[data-allo-guided-target="true"]){outline:3px solid Highlight!important;box-shadow:none!important}.allo-guided-banner,.allo-guided-planning-studio{border:1px solid CanvasText!important}}@media (max-width:760px){.allo-guided-planning-backdrop{padding:0;place-items:stretch}.allo-guided-planning-studio{width:100vw;height:100dvh;max-height:100dvh;border-radius:0;padding:0 max(14px,env(safe-area-inset-right)) max(18px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left));scrollbar-gutter:auto}.allo-guided-planning-header{margin:0 -14px 12px;padding:max(14px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) 13px max(14px,env(safe-area-inset-left))}.allo-guided-planning-studio :where(button,input,textarea,select){font-size:16px!important}.allo-guided-stage-nav{gap:5px}.allo-guided-stage-button{min-height:44px;padding:6px 4px;gap:5px}.allo-guided-stage-number{width:22px;height:22px}.allo-guided-plan-grid{grid-template-columns:1fr}.allo-guided-live-summary{position:static}.allo-guided-summary-metrics{grid-template-columns:repeat(3,minmax(0,1fr))}.allo-guided-planning-actions{margin:14px -14px -18px;padding:12px 14px max(18px,env(safe-area-inset-bottom))}.allo-guided-confirm-layer{padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}.allo-guided-confirm-card{max-height:calc(100dvh - 32px);overflow-y:auto}.allo-guided-phase-rail{grid-template-columns:repeat(3,minmax(0,1fr))}.allo-guided-journey-context{grid-template-columns:1fr}.allo-guided-primary-actions{position:sticky;bottom:0;z-index:4;margin:8px -6px -6px;padding:8px 6px max(8px,env(safe-area-inset-bottom));background:rgba(30,41,89,.94);backdrop-filter:blur(8px);border-top:1px solid rgba(165,180,252,.24)}.allo-guided-focus-more-body{max-height:45vh;overflow-y:auto}.allo-guided-resume-card>div,.allo-guided-inline-preview>div{display:grid;grid-template-columns:1fr}}@media (max-width:480px){.allo-guided-banner{padding:12px!important;border-radius:14px!important;overflow-wrap:anywhere}}@media (prefers-reduced-motion: reduce){:where(.allo-guided-target,[data-allo-guided-target="true"]){animation:none !important}.allo-guided-banner *,.allo-guided-dialog *{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important;scroll-behavior:auto !important}}`}</style>
      <div className="allo-guided-banner" role="region" aria-label={t('guided.indicator_title') || 'Guided mode'} style={{ background: 'linear-gradient(135deg, #312e81, #1e3a5f)', borderRadius: '20px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(99,102,241,0.3)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: isCollapsed ? 0 : '8px' }}>
          <div style={{ minWidth: 0 }}><span style={{ fontSize: '13px', fontWeight: 800, color: 'white', display: 'block' }}>{t('guided.indicator_title')}</span><span className="allo-guided-progress-save" data-state={progressSaveStatus} role={progressSaveStatus === 'error' ? 'alert' : undefined} aria-label={progressSaveLabel} title={progressSaveLabel}><span aria-hidden="true">{progressSaveStatus === 'error' ? '!' : progressSaveStatus === 'saved' ? '✓' : '↻'}</span>{isCollapsed ? (progressSaveStatus === 'error' ? (t('guided.progress_not_saved_short') || 'Not saved') : progressSaveStatus === 'saved' ? (t('guided.progress_saved_short') || 'Saved') : (t('guided.progress_saving_short') || 'Saving')) : progressSaveLabel}</span>{isCollapsed && <span style={{ display: 'block', fontSize: '12px', color: '#c7d2fe', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{step.label || 'Complete!'}</span>}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}><span style={{ fontSize: '12px', color: '#c7d2fe', fontWeight: 600 }}>{(t('guided.step_of') || 'Step {current} of {total}').replace('{current}', Math.min(guidedStep + 1, GUIDED_STEPS.length)).replace('{total}', GUIDED_STEPS.length)}</span><button type="button" aria-expanded={!isCollapsed} aria-controls="guided-banner-details" aria-label={isCollapsed ? (t('guided.expand') || 'Expand Guided Mode') : (t('guided.collapse') || 'Collapse Guided Mode')} onClick={() => setIsCollapsed(v => !v)} style={{ minWidth: '38px', minHeight: '38px', padding: '6px 9px', color: 'white', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', borderRadius: '9px', cursor: 'pointer' }}>{isCollapsed ? '▾' : '▴'}</button></div>
        </div>
        {!isCollapsed && <div id="guided-banner-details">
        {showInitialPath && !hasGuidedProgress && Array.isArray(guidedPresets) && (
          <div role="region" aria-labelledby="guided-path-title" style={{ marginBottom: '11px', padding: '11px', borderRadius: '12px', background: 'rgba(15,23,42,.45)', border: '1px solid rgba(167,243,208,.4)' }}>
            <strong id="guided-path-title" style={{ display: 'block', color: 'white', fontSize: '13px', marginBottom: '3px' }}>{t('guided.choose_goal_title') || 'What would you like to build?'}</strong>
            <span style={{ display: 'block', color: '#c7d2fe', fontSize: '12px', lineHeight: 1.45, marginBottom: '8px' }}>{t('guided.choose_goal_hint') || 'Choose a focused path now, or keep the complete tour.'}</span>
            <button type="button" onClick={openAiPlanner} style={{ width: '100%', padding: '10px', marginBottom: '8px', textAlign: 'left', borderRadius: '10px', border: '1px solid rgba(110,231,183,.55)', background: 'linear-gradient(135deg, rgba(16,185,129,.2), rgba(99,102,241,.2))', color: 'white' }}><strong style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}><span aria-hidden="true">✨</span>{t('guided.ai_plan_button') || 'Plan with AI'}</strong><span style={{ display: 'block', marginTop: '3px', color: '#d1fae5', fontSize: '12px', lineHeight: 1.4 }}>{t('guided.ai_plan_button_hint') || 'Describe your lesson goals, timing, learners, and delivery needs. Review the proposed path before applying it.'}</span></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', margin: '7px 0', color: '#a5b4fc', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em' }}><span style={{ flex: 1, height: '1px', background: 'rgba(165,180,252,.25)' }} />{t('guided.ai_plan_or_presets') || 'Or choose a ready-made path'}<span style={{ flex: 1, height: '1px', background: 'rgba(165,180,252,.25)' }} /></div>
            {lastCompletion && <div style={{ marginBottom: '8px', padding: '8px', borderRadius: '8px', background: 'rgba(16,185,129,.12)', border: '1px solid rgba(110,231,183,.3)', color: '#d1fae5', fontSize: '12px' }}><strong style={{ display: 'block', color: 'white' }}>{t('guided.last_completion') || 'Last completed run'}</strong>{new Date(lastCompletion.completedAt).toLocaleDateString()} · {Number(lastCompletion.completedCount) || 0} {t('guided.summary_completed') || 'completed'} · {Number(lastCompletion.resourceCount) || 0} {t('guided.summary_resources') || 'resources'}<button type="button" onClick={() => { try { localStorage.removeItem('allo_guided_last_completion'); } catch (_) {} setLastCompletion(null); }} style={{ display: 'block', marginTop: '5px', padding: '5px 7px', borderRadius: '6px', border: '1px solid rgba(255,255,255,.2)', background: 'transparent', color: '#d1fae5' }}>{t('guided.dismiss_summary') || 'Dismiss summary'}</button></div>}
            <div style={{ display: 'grid', gap: '6px' }}>{guidedPresets.map(preset => <button type="button" key={preset.id} onClick={() => choosePreset(preset)} style={{ textAlign: 'left', padding: '8px 9px', borderRadius: '8px', border: '1px solid rgba(129,140,248,.4)', background: 'rgba(99,102,241,.16)', color: 'white' }}><strong style={{ display: 'block', fontSize: '12px' }}>{t('guided.preset_' + preset.id + '_label') || preset.label}</strong><span style={{ display: 'block', color: '#c7d2fe', fontSize: '12px', marginTop: '2px' }}>{t('guided.preset_' + preset.id + '_description') || preset.description}</span></button>)}</div>
            <button type="button" onClick={rememberPathChoice} style={{ width: '100%', marginTop: '7px', padding: '7px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.2)', background: 'transparent', color: '#e0e7ff' }}>{t('guided.decide_later') || 'Decide later'}</button>
          </div>
        )}
        {showAiPlanner && (
          <div className="allo-guided-planning-backdrop" role="presentation">
          <div ref={_aiPlannerDialogRef} className="allo-guided-planning-studio" role="dialog" aria-modal="true" aria-labelledby="guided-ai-planner-title" aria-describedby="guided-ai-planner-intro" aria-busy={aiPlannerBusy ? 'true' : 'false'} tabIndex={-1}>
            {plannerConfirmationOpen && <div className="allo-guided-confirm-layer" role="presentation"><div ref={_plannerConfirmDialogRef} className="allo-guided-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby={pendingPlannerClose ? 'guided-planner-close-title' : pendingDeleteSavedAiPlanId ? 'guided-planner-delete-title' : 'guided-planner-apply-title'} tabIndex={-1}>{pendingPlannerClose ? <><strong id="guided-planner-close-title" style={{ display: 'block', color: 'white', fontSize: '17px' }}>{t('guided.ai_plan_unsaved_title') || 'Keep this unfinished plan?'}</strong><span style={{ display: 'block', marginTop: '5px' }}>{t('guided.ai_plan_unsaved_text') || 'Your work can be kept as a private draft on this device, or discarded without affecting saved plans.'}</span><div className="allo-guided-confirm-actions"><button ref={_plannerConfirmPrimaryRef} type="button" onClick={() => setPendingPlannerClose(false)} style={{ flex: 1, border: 0, borderRadius: '9px', background: '#10b981', color: '#052e2b', fontWeight: 900 }}>{t('guided.ai_plan_continue_editing') || 'Continue editing'}</button><button type="button" onClick={keepPlannerDraftAndClose} style={{ flex: 1, borderRadius: '9px', border: '1px solid rgba(255,255,255,.35)', background: 'transparent', color: 'white', fontWeight: 800 }}>{t('guided.ai_plan_keep_draft') || 'Keep draft and close'}</button><button type="button" onClick={discardPlannerDraftAndClose} style={{ flex: 1, borderRadius: '9px', border: '1px solid rgba(248,113,113,.55)', background: 'transparent', color: '#fecaca', fontWeight: 800 }}>{t('guided.ai_plan_discard_draft') || 'Discard and close'}</button></div></> : pendingDeleteSavedAiPlanId ? <><strong id="guided-planner-delete-title" style={{ display: 'block', color: 'white', fontSize: '17px' }}>{t('guided.ai_plan_delete_confirm') || 'Delete this reusable plan?'}</strong><span style={{ display: 'block', marginTop: '5px' }}>{savedAiPlans.find(item => item.id === pendingDeleteSavedAiPlanId)?.name || (t('guided.ai_plan_saved_badge') || 'Saved plan')}</span><div className="allo-guided-confirm-actions"><button ref={_plannerConfirmPrimaryRef} type="button" onClick={() => setPendingDeleteSavedAiPlanId(null)} style={{ flex: 1, borderRadius: '9px', border: '1px solid rgba(255,255,255,.35)', background: 'transparent', color: 'white', fontWeight: 800 }}>{t('common.cancel') || 'Cancel'}</button><button type="button" onClick={() => deleteSavedAiPlan(pendingDeleteSavedAiPlanId)} style={{ flex: 1, border: 0, borderRadius: '9px', background: '#b91c1c', color: 'white', fontWeight: 900 }}>{t('guided.ai_plan_delete_now') || 'Delete plan'}</button></div></> : <><strong id="guided-planner-apply-title" style={{ display: 'block', color: 'white', fontSize: '17px' }}>{t('guided.ai_plan_replace_title') || 'Apply this new path?'}</strong><span style={{ display: 'block', marginTop: '5px' }}>{canAdjustRemainingPath ? (t('guided.ai_plan_adjust_remaining_hint') || 'Keep completed work and update only what comes next, or restart from Source Material.') : (t('guided.ai_plan_replace_text') || 'Guided progress will restart at Source Material. Your generated resources remain in History.')}</span><div className="allo-guided-confirm-actions"><button ref={_plannerConfirmPrimaryRef} type="button" onClick={() => setPendingAiPlanApply(false)} style={{ flex: 1, borderRadius: '9px', border: '1px solid rgba(255,255,255,.35)', background: 'transparent', color: 'white', fontWeight: 800 }}>{t('common.cancel') || 'Cancel'}</button>{canAdjustRemainingPath && <button type="button" onClick={applyAiPlanToRemainingNow} style={{ flex: 1, border: 0, borderRadius: '9px', background: '#10b981', color: '#052e2b', fontWeight: 900 }}>{t('guided.ai_plan_adjust_remaining') || 'Update remaining steps'}</button>}<button type="button" onClick={applyAiPlanNow} style={{ flex: 1, borderRadius: '9px', border: '1px solid rgba(165,180,252,.45)', background: canAdjustRemainingPath ? 'transparent' : '#10b981', color: canAdjustRemainingPath ? '#e0e7ff' : '#052e2b', fontWeight: 900 }}>{t('guided.ai_plan_apply_confirm') || 'Apply and restart path'}</button></div></>}</div></div>}
            <div aria-hidden={plannerConfirmationOpen ? 'true' : undefined} inert={plannerConfirmationOpen ? '' : undefined}>
            <div className="allo-guided-planning-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}><div style={{ minWidth: 0 }}><strong id="guided-ai-planner-title" style={{ display: 'block', color: 'white' }}>✨ {t('guided.ai_plan_studio_title') || 'Guided Planning Studio'}</strong><span id="guided-ai-planner-intro" style={{ display: 'block', color: '#d1fae5', marginTop: '3px' }}>{t('guided.ai_plan_studio_intro') || 'Describe the lesson, customize the path, then review everything before applying it.'}</span><div className="allo-guided-planning-header-status" aria-live="polite">{plannerSaveState !== 'idle' && <span className="allo-guided-save-state" role="status"><span aria-hidden="true">{plannerSaveState === 'saving' ? '↻' : '✓'}</span>{plannerSaveState === 'saving' ? (t('guided.ai_plan_draft_saving') || 'Saving private draft…') : ((t('guided.ai_plan_draft_saved_at') || 'Draft saved at {time}').replace('{time}', plannerSavedAt ? new Date(plannerSavedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : (t('guided.ai_plan_just_now') || 'just now')))}</span>}</div></div><button type="button" aria-label={t('common.close') || 'Close'} onClick={requestCloseAiPlanner} style={{ flexShrink: 0, minWidth: '44px', minHeight: '44px', borderRadius: '11px', border: '1px solid rgba(255,255,255,.3)', background: 'rgba(15,23,42,.3)', color: 'white', fontSize: '22px' }}>×</button></div>
            {plannerRecoveryDraft ? <div className="allo-guided-planning-panel" role="region" aria-labelledby="guided-planner-recovery-title" style={{ maxWidth: '720px', margin: '28px auto' }}><strong id="guided-planner-recovery-title" style={{ display: 'block', color: 'white', fontSize: '18px' }}>{t('guided.ai_plan_recovery_title') || 'Resume your unfinished plan?'}</strong><span style={{ display: 'block', color: '#c7d2fe', marginTop: '5px' }}>{(t('guided.ai_plan_recovery_text') || 'A private draft from {date} is available on this device.').replace('{date}', new Date(plannerRecoveryDraft.updatedAt).toLocaleString())}</span>{plannerRecoveryDraft.plan && <div className="allo-guided-summary-metrics" style={{ marginTop: '12px' }}><div className="allo-guided-summary-metric"><strong>{plannerRecoveryDraft.plan.stepIds.length + 4}</strong>{t('guided.ai_plan_total_steps') || 'total steps'}</div><div className="allo-guided-summary-metric"><strong>{plannerRecoveryDraft.plan.estimatedMinutes}</strong>{t('guided.ai_plan_minutes_short') || 'min'}</div><div className="allo-guided-summary-metric"><strong>{plannerRecoveryDraft.plan.deliverySetting || '—'}</strong>{t('guided.delivery_setting') || 'Teaching setting'}</div></div>}{plannerRecoveryDraft.goal && <div style={{ marginTop: '12px', padding: '12px', borderRadius: '10px', background: 'rgba(15,23,42,.48)', color: '#e0e7ff' }}>{plannerRecoveryDraft.goal}</div>}<div style={{ display: 'flex', gap: '9px', flexWrap: 'wrap', marginTop: '15px' }}><button type="button" onClick={resumePlannerDraft} style={{ flex: 1, minWidth: '160px', border: 0, borderRadius: '9px', background: '#10b981', color: '#052e2b', fontWeight: 900 }}>{t('guided.ai_plan_resume_draft') || 'Resume draft'}</button><button type="button" onClick={startFreshPlanner} style={{ flex: 1, minWidth: '180px', borderRadius: '9px', border: '1px solid rgba(255,255,255,.3)', background: 'transparent', color: 'white' }}>{t('guided.ai_plan_start_fresh') || 'Discard draft and start fresh'}</button></div></div> : <>
            <nav className="allo-guided-stage-nav" aria-label={t('guided.ai_plan_stage_navigation') || 'Planning stages'}>{[['describe', '1', t('guided.ai_plan_stage_describe') || 'Describe'], ['customize', '2', t('guided.ai_plan_stage_customize') || 'Customize'], ['review', '3', t('guided.ai_plan_stage_review') || 'Review & start']].map(([stageId, number, label]) => <button key={stageId} type="button" className="allo-guided-stage-button" aria-current={aiPlannerStage === stageId ? 'step' : undefined} disabled={stageId !== 'describe' && !aiPlannerPlan} onClick={() => setAiPlannerStage(stageId)}><span className="allo-guided-stage-number" aria-hidden="true">{number}</span><span>{label}</span></button>)}</nav>
            {aiPlannerBusy && <div role="status" aria-live="polite" style={{ marginBottom: '12px', padding: '10px 12px', borderRadius: '11px', background: 'rgba(59,130,246,.16)', border: '1px solid rgba(147,197,253,.32)', color: '#dbeafe' }}>{t('guided.ai_plan_building_hint') || 'Matching your goals to the available tools and delivery routes.'}</div>}
            {aiPlannerError && <div role="alert" style={{ marginBottom: '12px', padding: '10px 12px', borderRadius: '11px', background: 'rgba(127,29,29,.32)', border: '1px solid rgba(248,113,113,.5)', color: '#fecaca' }}>{aiPlannerError}</div>}
            {aiPlannerStage === 'describe' && <section className="allo-guided-planning-panel" aria-labelledby="guided-ai-describe-title"><div className="allo-guided-plan-heading"><div><strong id="guided-ai-describe-title" style={{ display: 'block', color: 'white', fontSize: '17px' }}>{t('guided.ai_plan_describe_title') || 'What are you planning?'}</strong><span style={{ color: '#c7d2fe' }}>{t('guided.ai_plan_describe_hint') || 'Include the goal, learners, available time, evidence of learning, and delivery needs you already know.'}</span></div></div>
            <input ref={_aiPlanImportRef} type="file" accept=".json,application/json" onChange={importSavedAiPlans} hidden />
            <div role="group" aria-label={t('guided.ai_plan_portability_group') || 'Move Guided plans between devices'} style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <button type="button" disabled={aiPlannerBusy} onClick={() => _aiPlanImportRef.current?.click()} style={{ flex: 1, minWidth: '150px', minHeight: '40px', borderRadius: '9px', border: '1px solid rgba(165,180,252,.35)', background: 'rgba(255,255,255,.07)', color: '#e0e7ff', fontWeight: 800 }}>{t('guided.ai_plan_import') || 'Import plan file'}</button>
              <button type="button" disabled={aiPlannerBusy || savedAiPlans.length === 0} onClick={exportSavedAiPlans} style={{ flex: 1, minWidth: '150px', minHeight: '40px', borderRadius: '9px', border: '1px solid rgba(165,180,252,.35)', background: 'rgba(79,70,229,.18)', color: '#e0e7ff', fontWeight: 800 }}>{t('guided.ai_plan_export') || 'Export saved plans'}</button>
            </div>
            {savedAiPlanStatus && <div role="status" aria-live="polite" style={{ marginBottom: '8px', color: '#a7f3d0', fontSize: '11px' }}>{savedAiPlanStatus}</div>}            {pendingPlanImport && <section role="region" aria-labelledby="guided-import-preview-title" style={{ marginBottom: '10px', padding: '10px', borderRadius: '10px', background: 'rgba(15,23,42,.48)', border: '1px solid rgba(165,180,252,.38)' }}><strong id="guided-import-preview-title" style={{ display: 'block', color: 'white' }}>{t('guided.ai_plan_import_preview_title') || 'Review plans before importing'}</strong><span style={{ display: 'block', color: '#c7d2fe', marginTop: '2px', fontSize: '11px' }}>{pendingPlanImport.fileName} · {(t('guided.ai_plan_import_preview_count') || '{count} supported plan(s)').replace('{count}', pendingPlanImport.items.length)}</span><div style={{ display: 'grid', gap: '6px', marginTop: '8px' }}>{pendingPlanImport.items.map(item => { const context = item.plan.classroomContext || {}; const contextParts = [context.supports?.length ? context.supports.length + ' support(s)' : '', context.languages || '', context.devices && context.devices !== 'mixed' ? context.devices : ''].filter(Boolean); return <label key={item.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px', borderRadius: '8px', background: item.duplicate ? 'rgba(100,116,139,.14)' : 'rgba(79,70,229,.12)', color: item.duplicate ? '#94a3b8' : '#e0e7ff' }}><input type="checkbox" checked={!!item.selected} disabled={item.duplicate} onChange={() => togglePendingPlanImport(item.key)} /><span style={{ flex: 1 }}><strong style={{ display: 'block' }}>{item.plan.name}</strong><span style={{ display: 'block', fontSize: '11px' }}>{item.plan.stepIds.length + 4} {t('guided.ai_plan_total_steps') || 'total steps'} · {item.plan.estimatedMinutes} {t('guided.ai_plan_minutes_short') || 'min'}{contextParts.length ? ' · ' + contextParts.join(' · ') : ''}</span>{item.duplicate && <span style={{ display: 'block', color: '#fcd34d', fontSize: '10px' }}>{t('guided.ai_plan_import_duplicate') || 'Already saved — will not be imported'}</span>}{item.unsupportedCount > 0 && <span style={{ display: 'block', color: '#fde68a', fontSize: '10px' }}>{(t('guided.ai_plan_import_unsupported') || '{count} unsupported step(s) will be omitted').replace('{count}', item.unsupportedCount)}</span>}</span></label>; })}</div><div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginTop: '9px' }}><button type="button" disabled={!pendingPlanImport.items.some(item => item.selected && !item.duplicate)} onClick={confirmPlanImport} style={{ flex: 1, border: 0, borderRadius: '8px', background: '#10b981', color: '#052e2b', fontWeight: 900 }}>{t('guided.ai_plan_import_selected') || 'Import selected plans'}</button><button type="button" onClick={() => setPendingPlanImport(null)} style={{ flex: 1, borderRadius: '8px', border: '1px solid rgba(255,255,255,.28)', background: 'transparent', color: 'white' }}>{t('common.cancel') || 'Cancel'}</button></div></section>}            {savedAiPlans.length > 0 && <><button type="button" aria-expanded={showSavedAiPlans} aria-controls="guided-saved-plans-list" onClick={() => setShowSavedAiPlans(value => !value)} style={{ width: '100%', marginBottom: '8px', borderRadius: '9px', border: '1px solid rgba(165,180,252,.35)', background: 'rgba(79,70,229,.16)', color: '#e0e7ff', fontWeight: 800 }}>{(t('guided.ai_plan_saved_toggle') || 'Saved plans ({count})').replace('{count}', savedAiPlans.length)}</button>{showSavedAiPlans && <div id="guided-saved-plans-list" role="region" aria-labelledby="guided-saved-plans-title" style={{ marginBottom: '9px', padding: '8px', borderRadius: '9px', background: 'rgba(99,102,241,.12)', border: '1px solid rgba(165,180,252,.28)' }}><strong id="guided-saved-plans-title" style={{ display: 'block', color: 'white', fontSize: '12px', marginBottom: '5px' }}>{t('guided.ai_plan_saved_title') || 'Your saved Guided plans'}</strong><div style={{ display: 'grid', gap: '5px' }}>{savedAiPlans.map(saved => <div key={saved.id} style={{ padding: '6px 7px', borderRadius: '7px', background: 'rgba(15,23,42,.42)' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '7px', alignItems: 'center' }}><span style={{ minWidth: 0 }}><strong style={{ display: 'block', color: '#e0e7ff', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{saved.name}</strong><span style={{ display: 'block', color: '#a5b4fc', fontSize: '10px' }}>{saved.stepIds.length + 4} {t('guided.ai_plan_total_steps') || 'total steps'} · {saved.estimatedMinutes} {t('guided.ai_plan_minutes_short') || 'min'}</span></span><span style={{ display: 'flex', gap: '4px', flexShrink: 0 }}><button type="button" onClick={() => loadSavedAiPlan(saved)} disabled={aiPlannerBusy} style={{ minHeight: '34px', padding: '4px 7px', border: 0, borderRadius: '6px', fontWeight: 800 }}>{t('guided.ai_plan_load') || 'Load'}</button><button type="button" aria-label={(t('guided.ai_plan_delete_named') || 'Delete {name}').replace('{name}', saved.name)} onClick={() => setPendingDeleteSavedAiPlanId(saved.id)} disabled={aiPlannerBusy} style={{ minHeight: '34px', padding: '4px 7px', borderRadius: '6px', border: '1px solid rgba(248,113,113,.4)', background: 'transparent', color: '#fecaca' }}>{t('guided.ai_plan_delete') || 'Delete'}</button></span></div>{pendingDeleteSavedAiPlanId === saved.id && <div role="alert" style={{ marginTop: '5px', color: '#fecaca', fontSize: '10px' }}>{t('guided.ai_plan_delete_confirm') || 'Delete this reusable plan?'}<div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}><button type="button" onClick={() => deleteSavedAiPlan(saved.id)} style={{ minHeight: '32px', border: 0, borderRadius: '6px', background: '#b91c1c', color: 'white' }}>{t('guided.ai_plan_delete_now') || 'Delete plan'}</button><button type="button" onClick={() => setPendingDeleteSavedAiPlanId(null)} style={{ minHeight: '32px', borderRadius: '6px', border: '1px solid rgba(255,255,255,.25)', background: 'transparent', color: 'white' }}>{t('common.cancel') || 'Cancel'}</button></div></div>}</div>)}</div></div>}</>}
            <label htmlFor="guided-ai-goal" style={{ display: 'block', color: 'white', fontSize: '12px', fontWeight: 800, marginBottom: '4px' }}>{t('guided.ai_plan_goal_label') || 'Lesson goals and plan'}</label>
            <textarea id="guided-ai-goal" value={aiPlannerGoal} maxLength={1200} disabled={aiPlannerBusy} onChange={event => { setAiPlannerGoal(event.target.value); setAiPlannerQuestions([]); setAiPlannerAnswers({}); setAiPlannerLastChanges([]); setPlannerDirty(true); setAiPlannerError(''); }} placeholder={t('guided.ai_plan_placeholder') || 'Example: I have 40 minutes with seventh graders. Build vocabulary and a visual explanation, then a short independent assessment. I need printable work with an LMS backup.'} style={{ width: '100%', minHeight: '112px', resize: 'vertical', padding: '9px 10px', borderRadius: '9px', border: '1px solid rgba(167,243,208,.5)', background: 'rgba(15,23,42,.7)', color: 'white', fontSize: '13px', lineHeight: 1.45 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '3px', color: '#a7f3d0', fontSize: '10px' }}><span>{t('guided.ai_plan_privacy') || 'Do not include student names or sensitive personal information.'}</span><span aria-label={t('guided.ai_plan_character_count') || 'Character count'}>{aiPlannerGoal.length}/1200</span></div>            <details className="allo-guided-collapsible" style={{ marginTop: '10px' }}>
              <summary>{t('guided.ai_plan_context_title') || 'Classroom context (optional)'}</summary>
              <div style={{ marginTop: '8px', padding: '10px', borderRadius: '9px', background: 'rgba(15,23,42,.38)', border: '1px solid rgba(165,180,252,.25)' }}>
                <span style={{ display: 'block', color: '#c7d2fe', fontSize: '11px', lineHeight: 1.45, marginBottom: '9px' }}>{t('guided.ai_plan_context_hint') || 'Save reusable, non-identifying details once so future plans begin with the right supports.'}</span>
                <fieldset style={{ margin: 0, padding: 0, border: 0 }}><legend style={{ color: 'white', fontSize: '12px', fontWeight: 800 }}>{t('guided.ai_plan_context_supports') || 'Supports to plan for'}</legend><div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '5px' }}>{classroomSupportOptions.map(option => <button key={option.id} type="button" aria-pressed={classroomContext.supports.includes(option.id)} disabled={aiPlannerBusy} onClick={() => toggleClassroomSupport(option.id)} style={{ minHeight: '36px', padding: '5px 8px', borderRadius: '999px', border: '1px solid rgba(165,180,252,.4)', background: classroomContext.supports.includes(option.id) ? 'rgba(16,185,129,.24)' : 'rgba(255,255,255,.06)', color: classroomContext.supports.includes(option.id) ? '#d1fae5' : '#e0e7ff', fontSize: '11px' }}>{option.label}</button>)}</div></fieldset>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '8px', marginTop: '10px' }}>
                  <label htmlFor="guided-ai-context-languages" style={{ color: '#e0e7ff', fontSize: '11px', fontWeight: 800 }}>{t('guided.ai_plan_context_languages') || 'Languages or communication needs'}<input id="guided-ai-context-languages" value={classroomContext.languages} maxLength={120} disabled={aiPlannerBusy} onChange={event => { setClassroomContext(previous => normalizeClassroomContext({ ...previous, languages: event.target.value })); setPlannerDirty(true); setAiPlannerQuestions([]); setAiPlannerError(''); }} placeholder={t('guided.ai_plan_context_languages_placeholder') || 'Example: English and Spanish'} style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', borderRadius: '8px', border: '1px solid rgba(165,180,252,.4)', background: '#172554', color: 'white' }} /></label>
                  <label htmlFor="guided-ai-context-devices" style={{ color: '#e0e7ff', fontSize: '11px', fontWeight: 800 }}>{t('guided.ai_plan_context_devices') || 'Device access'}<select id="guided-ai-context-devices" value={classroomContext.devices} disabled={aiPlannerBusy} onChange={event => { setClassroomContext(previous => normalizeClassroomContext({ ...previous, devices: event.target.value })); setPlannerDirty(true); setAiPlannerQuestions([]); setAiPlannerError(''); }} style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', borderRadius: '8px', border: '1px solid rgba(165,180,252,.4)', background: '#172554', color: 'white' }}>{classroomDeviceOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
                </div>
                <label htmlFor="guided-ai-context-notes" style={{ display: 'block', color: '#e0e7ff', fontSize: '11px', fontWeight: 800, marginTop: '8px' }}>{t('guided.ai_plan_context_notes') || 'Reusable planning notes'}<textarea id="guided-ai-context-notes" value={classroomContext.notes} maxLength={280} disabled={aiPlannerBusy} onChange={event => { setClassroomContext(previous => normalizeClassroomContext({ ...previous, notes: event.target.value })); setPlannerDirty(true); setAiPlannerQuestions([]); setAiPlannerError(''); }} placeholder={t('guided.ai_plan_context_notes_placeholder') || 'Example: Prefer short chunks, visual models, and a paper backup.'} style={{ display: 'block', width: '100%', minHeight: '70px', marginTop: '4px', padding: '8px', resize: 'vertical', borderRadius: '8px', border: '1px solid rgba(165,180,252,.4)', background: '#172554', color: 'white' }} /></label>
                <span style={{ display: 'block', color: '#a5b4fc', fontSize: '10px', marginTop: '5px' }}>{t('guided.ai_plan_context_local') || 'Saved only on this device. Avoid names and sensitive personal details.'}</span>
              </div>
            </details>
            <div role="group" aria-label={t('guided.ai_plan_examples') || 'Example lesson goals'} style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '7px' }}>{[
              t('guided.ai_plan_example_short') || 'Fit this into 25 minutes with printable independent work.',
              t('guided.ai_plan_example_language') || 'Support multilingual learners with vocabulary, visuals, and discussion.',
              t('guided.ai_plan_example_project') || 'Plan an engaging project with formative assessment and an LMS backup.',
            ].map(example => <button type="button" key={example} disabled={aiPlannerBusy} onClick={() => { setAiPlannerGoal(example); setAiPlannerPlan(null); setAiPlannerInitialPlan(null); setAiPlannerUndoStack([]); setAiPlannerManualEdits({ steps: [], delivery: false, priority: false }); setAiPlannerQuestions([]); setAiPlannerAnswers({}); setAiPlannerLastChanges([]); setPlannerDirty(true); setAiPlannerError(''); }} style={{ minHeight: '34px', padding: '5px 7px', borderRadius: '999px', border: '1px solid rgba(165,180,252,.35)', background: 'rgba(255,255,255,.07)', color: '#e0e7ff', fontSize: '10px' }}>{example}</button>)}</div>
            {aiPlannerQuestions.length === 0 && <button type="button" disabled={aiPlannerBusy || aiPlannerGoal.trim().length < 12} onClick={() => requestAiGuidedPlan(false)} style={{ width: '100%', marginTop: '10px', padding: '10px 12px', border: 0, borderRadius: '10px', background: 'linear-gradient(135deg, #10b981, #6366f1)', color: 'white', fontWeight: 900 }}>{aiPlannerBusy ? (t('guided.ai_plan_building') || 'Creating your Guided plan…') : (aiPlannerPlan ? (t('guided.ai_plan_regenerate') || 'Regenerate plan') : (t('guided.ai_plan_create') || 'Create my Guided plan'))}</button>}
            {aiPlannerQuestions.length > 0 && !aiPlannerPlan && <div role="group" aria-labelledby="guided-ai-questions-title" style={{ marginTop: '10px', padding: '12px', borderRadius: '11px', background: 'rgba(79,70,229,.2)', border: '1px solid rgba(165,180,252,.45)' }}><strong id="guided-ai-questions-title" style={{ display: 'block', color: 'white', fontSize: '14px' }}>{t('guided.ai_plan_questions_title') || 'Two quick questions will improve this plan'}</strong><span style={{ display: 'block', color: '#c7d2fe', marginTop: '3px', lineHeight: 1.45 }}>{t('guided.ai_plan_questions_hint') || 'Guided Mode asks only for important context missing from your description.'}</span><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', marginTop: '10px' }}>{aiPlannerQuestions.map(question => <label key={question.id} htmlFor={'guided-ai-question-' + question.id} style={{ display: 'block', color: '#e0e7ff', fontWeight: 800 }}>{question.label}<select id={'guided-ai-question-' + question.id} value={aiPlannerAnswers[question.id] || ''} onChange={event => { setAiPlannerAnswers(previous => ({ ...previous, [question.id]: event.target.value })); setPlannerDirty(true); setAiPlannerError(''); }} style={{ display: 'block', width: '100%', marginTop: '5px', padding: '8px', borderRadius: '8px', border: '1px solid rgba(165,180,252,.45)', background: '#172554', color: 'white' }}><option value="">{t('guided.ai_plan_choose_answer') || 'Choose an answer'}</option>{(AI_PLANNER_QUESTION_OPTIONS[question.id] || []).map(option => <option key={option} value={option}>{option}</option>)}</select></label>)}</div><button type="button" disabled={aiPlannerBusy || aiPlannerQuestions.some(question => !aiPlannerAnswers[question.id])} onClick={() => requestAiGuidedPlan(true)} style={{ width: '100%', marginTop: '10px', padding: '10px 12px', border: 0, borderRadius: '9px', background: '#10b981', color: '#052e2b', fontWeight: 900 }}>{aiPlannerBusy ? (t('guided.ai_plan_building') || 'Creating your Guided plan…') : (t('guided.ai_plan_questions_continue') || 'Continue and create plan')}</button><button type="button" disabled={aiPlannerBusy} onClick={() => requestAiGuidedPlan('best-judgment')} style={{ width: '100%', marginTop: '6px', padding: '8px 10px', borderRadius: '9px', border: '1px solid rgba(165,180,252,.45)', background: 'transparent', color: '#e0e7ff', fontWeight: 800 }}>{t('guided.ai_plan_use_best_judgment') || 'Use your best judgment'}</button><span style={{ display: 'block', marginTop: '4px', color: '#a5b4fc', fontSize: '10px', lineHeight: 1.4 }}>{t('guided.ai_plan_use_best_judgment_hint') || 'Skip these questions and let the planner choose sensible defaults.'}</span></div>}
            </section>}
            {aiPlannerPlan && aiPlannerStage === 'customize' && (
              <section className="allo-guided-planning-panel" aria-labelledby="guided-ai-customize-title">
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}><strong id="guided-ai-customize-title" style={{ color: 'white', fontSize: '14px' }}>{aiPlannerPlan.title || (t('guided.ai_plan_review_title') || 'Proposed Guided plan')}</strong><span style={{ padding: '2px 6px', borderRadius: '999px', background: aiPlannerPlan.source === 'fallback' ? 'rgba(251,191,36,.16)' : 'rgba(16,185,129,.18)', color: aiPlannerPlan.source === 'fallback' ? '#fde68a' : '#a7f3d0', fontSize: '10px', fontWeight: 900 }}>{aiPlannerPlan.source === 'fallback' ? (t('guided.ai_plan_local_badge') || 'Local fallback') : aiPlannerPlan.source === 'saved' ? (t('guided.ai_plan_saved_badge') || 'Saved plan') : aiPlannerPlan.source === 'draft' ? (t('guided.ai_plan_draft_badge') || 'Recovered draft') : (t('guided.ai_plan_ai_badge') || 'AI configured')}</span><span style={{ color: '#c7d2fe', fontSize: '11px' }}>{Math.max(5, Number(aiPlannerPlan.estimatedMinutes) || 0)} {t('guided.ai_plan_minutes') || 'min to build'}</span><span style={{ color: '#a5b4fc', fontSize: '10px' }}>{t('guided.ai_plan_estimate_dynamic') || 'Updates as you edit'}</span></div>
                <p style={{ margin: '5px 0 0', color: '#e0e7ff', fontSize: '12px', lineHeight: 1.5 }}>{aiPlannerPlan.summary}</p>
                <div className="allo-guided-plan-grid"><div className="allo-guided-plan-main">
                {aiPlannerPlan.rationale && <p style={{ margin: '5px 0 0', color: '#c7d2fe', fontSize: '11px', lineHeight: 1.5 }}><strong style={{ color: '#a7f3d0' }}>{t('guided.ai_plan_why') || 'Why this fits'}:</strong> {aiPlannerPlan.rationale}</p>}
                {aiPlannerPlan.fallbackReason && <div role="status" style={{ marginTop: '6px', padding: '7px', borderRadius: '7px', background: 'rgba(120,53,15,.28)', color: '#fde68a', fontSize: '11px' }}>{aiPlannerPlan.fallbackReason}</div>}
                {Array.isArray(aiPlannerPlan.assumptions) && aiPlannerPlan.assumptions.length > 0 && <details className="allo-guided-collapsible"><summary>{t('guided.ai_plan_assumptions') || 'Review these assumptions'}</summary><ul style={{ margin: 0, padding: '10px 28px 12px', color: '#e0e7ff' }}>{aiPlannerPlan.assumptions.map((item, index) => <li key={index}>{item}</li>)}</ul></details>}
                {aiPlannerLastChanges.length > 0 && <div role="status" aria-live="polite" aria-labelledby="guided-ai-changes-title" style={{ marginTop: '8px', padding: '9px', borderRadius: '8px', background: 'rgba(6,78,59,.34)', border: '1px solid rgba(110,231,183,.38)' }}><strong id="guided-ai-changes-title" style={{ display: 'block', color: '#a7f3d0', fontSize: '12px' }}>{t('guided.ai_plan_changes_title') || 'What changed'}</strong><span style={{ display: 'block', color: '#d1fae5', fontSize: '10px', marginTop: '2px' }}>{t('guided.ai_plan_changes_hint') || 'Review the latest AI adjustment before using the plan.'}</span><ul style={{ margin: '5px 0 0', paddingLeft: '18px', color: '#e0e7ff', fontSize: '11px', lineHeight: 1.45 }}>{aiPlannerLastChanges.map((change, index) => <li key={index}>{change}</li>)}</ul></div>}
                <div role="region" aria-labelledby="guided-ai-refine-title" style={{ marginTop: '9px', padding: '8px', borderRadius: '8px', background: 'rgba(99,102,241,.12)', border: '1px solid rgba(165,180,252,.3)' }}><strong id="guided-ai-refine-title" style={{ display: 'block', color: 'white', fontSize: '12px' }}>{t('guided.ai_plan_conversation_title') || 'Refine this plan with a message'}</strong><span style={{ display: 'block', marginTop: '2px', color: '#c7d2fe', fontSize: '10px', lineHeight: 1.4 }}>{t('guided.ai_plan_conversation_hint') || 'Ask for a shorter path, another support, a different assessment, or a new delivery constraint.'}</span>{aiPlannerMessages.length > 0 && <div role="log" aria-live="polite" aria-label={t('guided.ai_plan_conversation_log') || 'Planning conversation'} style={{ display: 'grid', gap: '4px', maxHeight: '120px', overflowY: 'auto', marginTop: '6px' }}>{aiPlannerMessages.map((message, index) => <div key={index} style={{ justifySelf: message.role === 'teacher' ? 'end' : 'start', maxWidth: '92%', padding: '5px 7px', borderRadius: '7px', background: message.role === 'teacher' ? 'rgba(79,70,229,.38)' : 'rgba(16,185,129,.16)', color: '#e0e7ff', fontSize: '10px', lineHeight: 1.35 }}><strong style={{ color: message.role === 'teacher' ? '#c7d2fe' : '#a7f3d0' }}>{message.role === 'teacher' ? (t('guided.ai_plan_you') || 'You') : (t('guided.ai_plan_planner') || 'Planner')}:</strong> {message.text}</div>)}</div>}<label htmlFor="guided-ai-refinement" style={{ display: 'block', color: '#e0e7ff', fontSize: '11px', fontWeight: 800, marginTop: '7px' }}>{t('guided.ai_plan_refinement_label') || 'What should change?'}</label><textarea id="guided-ai-refinement" value={aiPlannerRefinement} maxLength={500} disabled={aiPlannerBusy} onChange={event => { setAiPlannerRefinement(event.target.value); setPlannerDirty(true); setAiPlannerError(''); }} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') requestAiPlanRefinement(); }} placeholder={t('guided.ai_plan_refinement_placeholder') || 'Example: Make it 30 minutes, keep vocabulary support, and prioritize printable work.'} style={{ width: '100%', minHeight: '66px', marginTop: '3px', resize: 'vertical', padding: '7px 8px', borderRadius: '7px', border: '1px solid rgba(165,180,252,.4)', background: 'rgba(15,23,42,.7)', color: 'white', fontSize: '11px', lineHeight: 1.4 }} /><div role="group" aria-label={t('guided.ai_plan_quick_refinements') || 'Quick refinements'} style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '5px' }}>{[
                  t('guided.ai_plan_refine_shorter') || 'Make it shorter',
                  t('guided.ai_plan_refine_vocabulary') || 'Add vocabulary support',
                  t('guided.ai_plan_refine_print') || 'Prioritize printable options',
                  t('guided.ai_plan_refine_assessment') || 'Add a quick assessment',
                ].map(suggestion => <button type="button" key={suggestion} disabled={aiPlannerBusy} onClick={() => { setAiPlannerRefinement(suggestion); setPlannerDirty(true); }} style={{ minHeight: '32px', padding: '4px 6px', borderRadius: '999px', border: '1px solid rgba(165,180,252,.3)', background: 'rgba(255,255,255,.05)', color: '#e0e7ff', fontSize: '9px' }}>{suggestion}</button>)}</div><button type="button" disabled={aiPlannerBusy || aiPlannerRefinement.trim().length < 3} onClick={requestAiPlanRefinement} style={{ width: '100%', marginTop: '6px', padding: '7px 9px', border: 0, borderRadius: '7px', background: '#4f46e5', color: 'white', fontWeight: 900 }}>{aiPlannerBusy ? (t('guided.ai_plan_updating') || 'Updating plan…') : (t('guided.ai_plan_update') || 'Update this plan')}</button></div>
                <fieldset style={{ margin: '9px 0 0', padding: 0, border: 0 }}><legend style={{ color: 'white', fontWeight: 900 }}>{t('guided.ai_plan_steps_title') || 'Review and edit the steps'}</legend><div style={{ marginTop: '7px', maxHeight: '260px', overflowY: 'auto', display: 'grid', gap: '5px', paddingRight: '4px' }}>{(allSteps || []).filter(item => !['source-input', 'directions', 'package-deliver', '_final'].includes(item.id)).map(item => { const checked = aiPlannerPlan.stepIds.includes(item.id); const reason = aiPlannerPlan.stepReasons?.[item.id]; const edited = aiPlannerManualEdits.steps.includes(item.id); return <label key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '9px', borderRadius: '10px', background: checked ? 'rgba(16,185,129,.1)' : 'rgba(255,255,255,.035)', color: 'white' }}><input type="checkbox" checked={checked} onChange={event => updateAiPlanStep(item.id, event.target.checked)} /><span><strong style={{ display: 'inline' }}>{localizeStep(item, 'label')}</strong>{edited && <span className="allo-guided-edit-chip">{t('guided.ai_plan_edited_by_you') || 'Edited by you'}</span>}{checked && reason && <span style={{ display: 'block', color: '#c7d2fe', marginTop: '3px' }}>{reason}</span>}</span></label>; })}</div></fieldset>
                <div style={{ marginTop: '7px', padding: '7px', borderRadius: '7px', border: '1px solid rgba(110,231,183,.25)', color: '#d1fae5', fontSize: '11px' }}><strong>{t('guided.ai_plan_protected') || 'Always included'}:</strong> {t('guided.ai_plan_protected_steps') || 'Source Material, Assignment Directions & Goals, Preview/Package/Deliver, and Review & Finish.'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '9px', marginTop: '8px' }}><label style={{ color: '#e0e7ff', fontWeight: 800 }}>{t('guided.delivery_setting') || 'Teaching setting'}{aiPlannerManualEdits.delivery && <span className="allo-guided-edit-chip">{t('guided.ai_plan_edited_by_you') || 'Edited by you'}</span>}<select value={aiPlannerPlan.deliverySetting || 'take-home'} onChange={event => updateAiPlanDelivery('deliverySetting', event.target.value)} style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', borderRadius: '9px', background: '#172554', color: 'white' }}><option value="take-home">{t('guided.delivery_setting_take_home') || 'Take-home'}</option><option value="print">{t('guided.delivery_setting_print') || 'Print / paper'}</option><option value="live">{t('guided.delivery_setting_live') || 'Live class'}</option><option value="lms">{t('guided.delivery_setting_lms') || 'LMS'}</option></select></label><label style={{ color: '#e0e7ff', fontWeight: 800 }}>{t('guided.delivery_priority') || 'Top priority'}{aiPlannerManualEdits.priority && <span className="allo-guided-edit-chip">{t('guided.ai_plan_edited_by_you') || 'Edited by you'}</span>}<select value={aiPlannerPlan.deliveryPriority || 'accessible'} onChange={event => updateAiPlanDelivery('deliveryPriority', event.target.value)} style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', borderRadius: '9px', background: '#172554', color: 'white' }}><option value="accessible">{t('guided.delivery_priority_accessible') || 'Accessibility'}</option><option value="editable">{t('guided.delivery_priority_editable') || 'Editable'}</option><option value="assessment">{t('guided.delivery_priority_assessment') || 'Assessment'}</option><option value="interactive">{t('guided.delivery_priority_interactive') || 'Interactive'}</option><option value="low-connectivity">{t('guided.delivery_priority_offline') || 'Low connectivity'}</option></select></label></div>
                </div><aside className="allo-guided-live-summary">
                <div role="region" aria-labelledby="guided-ai-roadmap-title" style={{ padding: '2px' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '7px', alignItems: 'baseline' }}><strong id="guided-ai-roadmap-title" style={{ color: 'white', fontSize: '12px' }}>{t('guided.ai_plan_roadmap_title') || 'Before you begin: lesson roadmap'}</strong><span style={{ color: '#a7f3d0', fontSize: '10px' }}>{aiPlanRoadmapSteps.length} {t('guided.ai_plan_total_steps') || 'total steps'} · {aiPlanResourceLabels.length} {t('guided.ai_plan_resources_short') || 'resources'} · {Math.max(5, Number(aiPlannerPlan.estimatedMinutes) || 0)} {t('guided.ai_plan_minutes_short') || 'min'}</span></div><span style={{ display: 'block', color: '#c7d2fe', fontSize: '10px', marginTop: '2px', lineHeight: 1.4 }}>{t('guided.ai_plan_roadmap_hint') || 'This is the path Guided Mode will walk through after you approve it.'}</span><ol aria-label={t('guided.ai_plan_phase_roadmap') || 'Guided phase roadmap'} style={{ listStyle: 'none', margin: '7px 0 0', padding: 0, display: 'grid', gap: '5px' }}>{aiPlanPhaseGroups.map((phase, phaseIndex) => { const phaseKey = 'guided.phase_' + phase.id; const translated = t(phaseKey); const phaseName = translated && translated !== phaseKey ? translated : phase.label; return <li key={phase.id} style={{ display: 'grid', gridTemplateColumns: '22px minmax(0, 1fr)', gap: '6px', alignItems: 'start' }}><span aria-hidden="true" style={{ width: '22px', height: '22px', display: 'grid', placeItems: 'center', borderRadius: '999px', background: '#4f46e5', color: 'white', fontSize: '10px', fontWeight: 900 }}>{phaseIndex + 1}</span><span><strong style={{ display: 'block', color: '#a7f3d0', fontSize: '10px' }}>{phaseName}</strong><span style={{ display: 'block', color: '#e0e7ff', fontSize: '10px', lineHeight: 1.35 }}>{phase.steps.map(item => localizeStep(item, 'label')).join(' → ')}</span></span></li>; })}</ol><div style={{ marginTop: '7px', paddingTop: '7px', borderTop: '1px solid rgba(255,255,255,.1)' }}><strong style={{ display: 'block', color: '#fef3c7', fontSize: '10px' }}>{t('guided.ai_plan_expected_resources') || 'Expected lesson resources'}</strong><span style={{ display: 'block', marginTop: '2px', color: '#e0e7ff', fontSize: '10px', lineHeight: 1.4 }}>{aiPlanResourceLabels.join(' · ')}</span></div>{aiPlanDeliveryRecommendation && <div style={{ marginTop: '7px', padding: '7px', borderRadius: '7px', background: 'rgba(16,185,129,.1)', color: '#d1fae5', fontSize: '10px', lineHeight: 1.4 }}><strong>{t('guided.ai_plan_delivery_preview') || 'Planned delivery'}:</strong> {aiPlanDeliveryRecommendation.primary} <span aria-hidden="true">→</span> <strong>{t('guided.delivery_backup') || 'Backup'}:</strong> {aiPlanDeliveryRecommendation.backup}<span style={{ display: 'block', color: '#a7f3d0', marginTop: '2px' }}>{aiPlanDeliveryRecommendation.why}</span></div>}</div>
                <div role="region" aria-labelledby="guided-ai-readiness-title" style={{ paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,.09)' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}><strong id="guided-ai-readiness-title" style={{ color: 'white', fontSize: '13px' }}>{t('guided.ai_plan_readiness_title') || 'Plan readiness'}</strong><span style={{ padding: '3px 7px', borderRadius: '999px', background: aiPlanReadinessAttentionCount ? 'rgba(251,191,36,.16)' : 'rgba(16,185,129,.18)', color: aiPlanReadinessAttentionCount ? '#fde68a' : '#a7f3d0', fontWeight: 900 }}>{aiPlanReadinessAttentionCount ? ((t('guided.ai_plan_readiness_attention') || '{count} needs attention').replace('{count}', aiPlanReadinessAttentionCount)) : (t('guided.ai_plan_readiness_ready') || 'Ready to start')}</span></div><ul aria-live="polite" style={{ listStyle: 'none', padding: 0, margin: '7px 0 0', display: 'grid', gap: '5px' }}>{aiPlanReadinessItems.map(item => <li key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', color: item.state === 'attention' ? '#fde68a' : item.state === 'ready' ? '#d1fae5' : '#e0e7ff', lineHeight: 1.45 }}><span aria-hidden="true" style={{ flexShrink: 0 }}>{item.state === 'attention' ? '⊠' : item.state === 'ready' ? '✓' : 'ℹ'}</span><span style={{ flex: 1 }}>{item.label}{item.action === 'quiz' && <button type="button" onClick={() => updateAiPlanStep('quiz', true)} style={{ display: 'block', marginTop: '5px', padding: '5px 8px', minHeight: '34px', border: 0, borderRadius: '7px', background: '#f59e0b', color: '#451a03', fontWeight: 900 }}>{t('guided.ai_plan_add_assess') || 'Add Assess step'}</button>}</span></li>)}</ul></div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '7px', marginTop: '9px' }}><button type="button" disabled={!aiPlannerUndoStack.length} onClick={undoAiPlannerChange} style={{ borderRadius: '9px', border: '1px solid rgba(165,180,252,.35)', background: 'transparent', color: '#e0e7ff', fontWeight: 800 }}>{t('guided.ai_plan_undo') || 'Undo last change'}</button><button type="button" disabled={!aiPlannerInitialPlan} onClick={restoreOriginalAiPlan} style={{ borderRadius: '9px', border: '1px solid rgba(165,180,252,.35)', background: 'transparent', color: '#e0e7ff', fontWeight: 800 }}>{t('guided.ai_plan_restore_original') || 'Restore original'}</button></div>
                </aside></div>
                <div className="allo-guided-planning-actions" style={{ display: 'flex', gap: '9px', flexWrap: 'wrap' }}><button type="button" onClick={() => setAiPlannerStage('describe')} style={{ flex: 1, minWidth: '150px', borderRadius: '9px', border: '1px solid rgba(255,255,255,.28)', background: 'transparent', color: 'white' }}>{t('guided.ai_plan_back_describe') || 'Back to description'}</button><button type="button" onClick={() => setAiPlannerStage('review')} disabled={!aiPlannerPlan.stepIds.length} style={{ flex: 2, minWidth: '190px', border: 0, borderRadius: '9px', background: '#10b981', color: '#052e2b', fontWeight: 900 }}>{t('guided.ai_plan_continue_review') || 'Review plan'}</button></div>
              </section>
            )}
            {aiPlannerPlan && aiPlannerStage === 'review' && (
              <section className="allo-guided-planning-panel" aria-labelledby="guided-ai-review-stage-title">
                <div className="allo-guided-plan-heading"><div><strong id="guided-ai-review-stage-title" style={{ display: 'block', color: 'white', fontSize: '18px' }}>{t('guided.ai_plan_review_ready_title') || 'Review the complete path'}</strong><span style={{ color: '#c7d2fe' }}>{aiPlannerPlan.title} · {aiPlannerPlan.summary}</span></div><span style={{ color: '#a7f3d0', fontWeight: 900 }}>{Math.max(5, Number(aiPlannerPlan.estimatedMinutes) || 0)} {t('guided.ai_plan_minutes') || 'min to build'}</span></div>
                <div className="allo-guided-plan-grid"><div className="allo-guided-plan-main">
                <div role="region" aria-labelledby="guided-ai-roadmap-title" style={{ padding: '2px' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '7px', alignItems: 'baseline' }}><strong id="guided-ai-roadmap-title" style={{ color: 'white', fontSize: '12px' }}>{t('guided.ai_plan_roadmap_title') || 'Before you begin: lesson roadmap'}</strong><span style={{ color: '#a7f3d0', fontSize: '10px' }}>{aiPlanRoadmapSteps.length} {t('guided.ai_plan_total_steps') || 'total steps'} · {aiPlanResourceLabels.length} {t('guided.ai_plan_resources_short') || 'resources'} · {Math.max(5, Number(aiPlannerPlan.estimatedMinutes) || 0)} {t('guided.ai_plan_minutes_short') || 'min'}</span></div><span style={{ display: 'block', color: '#c7d2fe', fontSize: '10px', marginTop: '2px', lineHeight: 1.4 }}>{t('guided.ai_plan_roadmap_hint') || 'This is the path Guided Mode will walk through after you approve it.'}</span><ol aria-label={t('guided.ai_plan_phase_roadmap') || 'Guided phase roadmap'} style={{ listStyle: 'none', margin: '7px 0 0', padding: 0, display: 'grid', gap: '5px' }}>{aiPlanPhaseGroups.map((phase, phaseIndex) => { const phaseKey = 'guided.phase_' + phase.id; const translated = t(phaseKey); const phaseName = translated && translated !== phaseKey ? translated : phase.label; return <li key={phase.id} style={{ display: 'grid', gridTemplateColumns: '22px minmax(0, 1fr)', gap: '6px', alignItems: 'start' }}><span aria-hidden="true" style={{ width: '22px', height: '22px', display: 'grid', placeItems: 'center', borderRadius: '999px', background: '#4f46e5', color: 'white', fontSize: '10px', fontWeight: 900 }}>{phaseIndex + 1}</span><span><strong style={{ display: 'block', color: '#a7f3d0', fontSize: '10px' }}>{phaseName}</strong><span style={{ display: 'block', color: '#e0e7ff', fontSize: '10px', lineHeight: 1.35 }}>{phase.steps.map(item => localizeStep(item, 'label')).join(' → ')}</span></span></li>; })}</ol><div style={{ marginTop: '7px', paddingTop: '7px', borderTop: '1px solid rgba(255,255,255,.1)' }}><strong style={{ display: 'block', color: '#fef3c7', fontSize: '10px' }}>{t('guided.ai_plan_expected_resources') || 'Expected lesson resources'}</strong><span style={{ display: 'block', marginTop: '2px', color: '#e0e7ff', fontSize: '10px', lineHeight: 1.4 }}>{aiPlanResourceLabels.join(' · ')}</span></div>{aiPlanDeliveryRecommendation && <div style={{ marginTop: '7px', padding: '7px', borderRadius: '7px', background: 'rgba(16,185,129,.1)', color: '#d1fae5', fontSize: '10px', lineHeight: 1.4 }}><strong>{t('guided.ai_plan_delivery_preview') || 'Planned delivery'}:</strong> {aiPlanDeliveryRecommendation.primary} <span aria-hidden="true">→</span> <strong>{t('guided.delivery_backup') || 'Backup'}:</strong> {aiPlanDeliveryRecommendation.backup}<span style={{ display: 'block', color: '#a7f3d0', marginTop: '2px' }}>{aiPlanDeliveryRecommendation.why}</span></div>}</div>
                </div><aside className="allo-guided-live-summary">
                <div role="region" aria-labelledby="guided-ai-readiness-title" style={{ paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,.09)' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}><strong id="guided-ai-readiness-title" style={{ color: 'white', fontSize: '13px' }}>{t('guided.ai_plan_readiness_title') || 'Plan readiness'}</strong><span style={{ padding: '3px 7px', borderRadius: '999px', background: aiPlanReadinessAttentionCount ? 'rgba(251,191,36,.16)' : 'rgba(16,185,129,.18)', color: aiPlanReadinessAttentionCount ? '#fde68a' : '#a7f3d0', fontWeight: 900 }}>{aiPlanReadinessAttentionCount ? ((t('guided.ai_plan_readiness_attention') || '{count} needs attention').replace('{count}', aiPlanReadinessAttentionCount)) : (t('guided.ai_plan_readiness_ready') || 'Ready to start')}</span></div><ul aria-live="polite" style={{ listStyle: 'none', padding: 0, margin: '7px 0 0', display: 'grid', gap: '5px' }}>{aiPlanReadinessItems.map(item => <li key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', color: item.state === 'attention' ? '#fde68a' : item.state === 'ready' ? '#d1fae5' : '#e0e7ff', lineHeight: 1.45 }}><span aria-hidden="true" style={{ flexShrink: 0 }}>{item.state === 'attention' ? '⊠' : item.state === 'ready' ? '✓' : 'ℹ'}</span><span style={{ flex: 1 }}>{item.label}{item.action === 'quiz' && <button type="button" onClick={() => updateAiPlanStep('quiz', true)} style={{ display: 'block', marginTop: '5px', padding: '5px 8px', minHeight: '34px', border: 0, borderRadius: '7px', background: '#f59e0b', color: '#451a03', fontWeight: 900 }}>{t('guided.ai_plan_add_assess') || 'Add Assess step'}</button>}</span></li>)}</ul></div>
                  <div role="group" aria-labelledby="guided-ai-save-title" style={{ paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,.09)' }}><strong id="guided-ai-save-title" style={{ display: 'block', color: 'white' }}>{t('guided.ai_plan_save_title') || 'Save this path for another lesson'}</strong><label htmlFor="guided-ai-save-name" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{t('guided.ai_plan_save_name') || 'Saved plan name'}</label><input id="guided-ai-save-name" value={savedAiPlanName} maxLength={80} onChange={event => { setSavedAiPlanName(event.target.value); setPlannerDirty(true); setSavedAiPlanStatus(''); }} placeholder={aiPlannerPlan.title || (t('guided.ai_plan_save_name') || 'Saved plan name')} style={{ width: '100%', marginTop: '6px', padding: '8px', borderRadius: '9px', border: '1px solid rgba(165,180,252,.3)', background: '#172554', color: 'white' }} /><button type="button" onClick={saveCurrentAiPlan} disabled={aiPlannerBusy} style={{ width: '100%', marginTop: '7px', border: 0, borderRadius: '9px', background: '#0f766e', color: 'white', fontWeight: 900 }}>{activeSavedAiPlanId ? (t('guided.ai_plan_save_changes') || 'Save changes') : (t('guided.ai_plan_save') || 'Save plan')}</button><span style={{ display: 'block', color: '#a5b4fc', marginTop: '4px' }}>{t('guided.ai_plan_save_local') || 'Saved only on this device. Generated lesson content is not included.'}</span>{savedAiPlanStatus && <div role="status" aria-live="polite" style={{ color: '#a7f3d0', marginTop: '5px' }}>{savedAiPlanStatus}</div>}</div>
                </aside></div>
                <div className="allo-guided-planning-actions" style={{ display: 'flex', gap: '9px', flexWrap: 'wrap' }}><button type="button" onClick={() => setAiPlannerStage('customize')} style={{ flex: 1, minWidth: '150px', borderRadius: '9px', border: '1px solid rgba(255,255,255,.28)', background: 'transparent', color: 'white' }}>{t('guided.ai_plan_back_customize') || 'Back to customize'}</button><button type="button" disabled={!aiPlannerPlan.stepIds.length} onClick={applyAiPlan} style={{ flex: 2, minWidth: '190px', border: 0, borderRadius: '9px', background: '#10b981', color: '#052e2b', fontWeight: 900 }}>{t('guided.ai_plan_apply') || 'Use this Guided plan'}</button></div>
              </section>
            )}
            </>}
          </div></div></div>
        )}
        {showResumeCheckpoint && hasGuidedProgress && !isLast && <section className="allo-guided-resume-card" role="status" aria-live="polite" aria-labelledby="guided-resume-title">
          <strong id="guided-resume-title">👋 {t('guided.resume_title') || 'Welcome back'}</strong>
          <span>{(t('guided.resume_summary') || '{completed} complete · about {minutes} min remaining').replace('{completed}', completedCount).replace('{minutes}', estimatedRemainingMinutes)}</span>
          <div><button type="button" onClick={() => { setShowResumeCheckpoint(false); if (typeof focusGuidedTarget === 'function') requestAnimationFrame(focusGuidedTarget); }}>{t('guided.resume_continue') || 'Continue where I left off'}</button>{latestGuidedResourceItem && openGuidedHistoryItem && <button type="button" onClick={() => openGuidedHistoryItem(latestGuidedResourceItem)}>{t('guided.resume_review') || 'Review latest result'}</button>}{typeof generateGuidedPlanFromGoal === 'function' && <button type="button" onClick={() => { setShowResumeCheckpoint(false); openAiPlanner(); }}>{t('guided.resume_adjust') || 'Adjust what remains'}</button>}</div>
        </section>}        {guidedAdvanceNotice && step.id === guidedAdvanceNotice.toId && <div className="allo-guided-advance-handoff" role="status" aria-live="polite"><span aria-hidden="true">✓</span><div><strong>{(t('guided.advance_handoff_title') || '{step} is ready').replace('{step}', advanceFromStep ? localizeStep(advanceFromStep, 'label') : (t('guided.previous_step') || 'Previous step'))}</strong><span>{(t('guided.advance_handoff_next') || 'Now guiding you through {step}.').replace('{step}', advanceToStep ? localizeStep(advanceToStep, 'label') : step.label)}</span></div><div className="allo-guided-advance-actions">{advanceResultItem && openGuidedHistoryItem && <button type="button" onClick={() => openGuidedHistoryItem(advanceResultItem)}>{t('guided.advance_handoff_review') || 'Review result'}</button>}{undoGuidedAutoAdvance && <button type="button" onClick={undoGuidedAutoAdvance}>{t('guided.advance_handoff_back') || 'Go back'}</button>}{clearGuidedAdvanceNotice && <button type="button" aria-label={t('common.dismiss') || 'Dismiss'} onClick={clearGuidedAdvanceNotice}>×</button>}</div></div>}        {phaseTransitionNotice && <div ref={_phaseNoticeRef} tabIndex={-1} role="status" aria-live="polite" style={{ marginBottom: '8px', padding: '9px 10px', borderRadius: '9px', background: 'rgba(251,191,36,.13)', border: '1px solid rgba(251,191,36,.38)', color: '#fef3c7' }}><strong style={{ display: 'block', color: 'white' }}>{(t('guided.phase_jump_summary_title') || 'Moved from {from} to {to}').replace('{from}', phaseTransitionNotice.from).replace('{to}', phaseTransitionNotice.to)}</strong><span style={{ display: 'block', marginTop: '2px', fontSize: '12px' }}>{(t('guided.phase_jump_summary') || '{skipped} unfinished steps were marked skipped across {phases} phase(s).').replace('{skipped}', phaseTransitionNotice.skipped).replace('{phases}', phaseTransitionNotice.phases)}</span><button type="button" onClick={() => setPhaseTransitionNotice(null)} style={{ marginTop: '6px', minHeight: '34px', borderRadius: '7px', border: '1px solid rgba(255,255,255,.25)', background: 'transparent', color: 'white' }}>{t('common.dismiss') || 'Dismiss'}</button></div>}        {guidedNavigationUndo && <div className="allo-guided-undo" role="status" aria-live="polite"><span>{guidedNavigationUndo.label || (t('guided.navigation_changed') || 'Guided path updated.')}</span><button type="button" onClick={() => { undoGuidedNavigation(); setPhaseTransitionNotice(null); }}>{t('guided.undo') || 'Undo'}</button>{clearGuidedNavigationUndo && <button type="button" aria-label={t('common.dismiss') || 'Dismiss'} onClick={clearGuidedNavigationUndo}>×</button>}</div>}        {currentPhase && <div role="group" aria-label={t('guided.phase_context') || 'Guided phase'} title={currentPhaseDescription} style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', margin: '0 0 6px' }}><span style={{ fontSize: '11px', fontWeight: 900, color: '#312e81', background: '#c7d2fe', borderRadius: '999px', padding: '3px 8px' }}>{(t('guided.phase_of') || 'Phase {current} of {total}').replace('{current}', currentPhaseIndex + 1).replace('{total}', activePhaseDefinitions.length)}</span><span style={{ color: '#a7f3d0', fontSize: '12px', fontWeight: 800 }}>{currentPhaseLabel}</span></div>}
        <p style={{ fontSize: '13px', color: '#e0e7ff', margin: '0 0 6px', fontWeight: 700 }}>{step.label || (t('guided.complete') || 'Complete!')}</p>
        {(stepWhyNow || expectedStepOutput || upNextLabel) && <section className="allo-guided-journey-context" aria-label={t('guided.journey_context') || 'Current Guided journey context'}>{stepWhyNow && <div><span>{t('guided.journey_why') || 'Why now'}</span><strong>{stepWhyNow}</strong></div>}{expectedStepOutput && <div><span>{t('guided.journey_creates') || 'You’ll create'}</span><strong>{expectedStepOutput}</strong></div>}{upNextLabel && <div><span>{t('guided.journey_next') || 'Next'}</span><strong>{upNextLabel}</strong></div>}</section>}        {guidedStepCostNote && <p style={{ fontSize: '11px', color: '#fcd34d', margin: '0 0 6px', fontWeight: 700 }}>{guidedStepCostNote}</p>}
        {guidedStep === 0 && guidedSettingsSummary && openUniversalSettings && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', margin: '0 0 8px', padding: '6px 8px', borderRadius: '8px', background: 'rgba(99,102,241,.18)', border: '1px solid rgba(165,180,252,.35)' }}>
            <span style={{ fontSize: '11px', color: '#c7d2fe', minWidth: 0 }}>
              <strong style={{ color: '#a7f3d0' }}>{t('guided.settings_checkpoint_label') || 'Class settings'}:</strong> {guidedSettingsSummary}
            </span>
            <button type="button" onClick={openUniversalSettings}
              aria-label={t('guided.settings_adjust_aria') || 'Review and adjust universal settings before generating'}
              style={{ fontSize: '11px', fontWeight: 800, color: '#1e1b4b', background: '#a5b4fc', border: 'none', borderRadius: '999px', padding: '3px 10px', cursor: 'pointer' }}>
              {t('guided.settings_adjust') || 'Adjust'}
            </button>
          </div>
        )}
        <div role="group" aria-label={t('guided.estimate_label') || 'Step estimate'} style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}><span style={{ fontSize: '12px', color: '#e0e7ff', background: 'rgba(255,255,255,.08)', borderRadius: '999px', padding: '3px 8px' }}>{stepMeta[0]}</span><span style={{ fontSize: '12px', color: '#e0e7ff', background: 'rgba(255,255,255,.08)', borderRadius: '999px', padding: '3px 8px' }}>{t('guided.kind_' + stepMeta[1]) || stepMeta[1]}</span>{estimatedRemainingMinutes > 0 && <span style={{ fontSize: '12px', color: '#d1fae5', background: 'rgba(16,185,129,.14)', borderRadius: '999px', padding: '3px 8px' }}>{(t('guided.estimated_remaining') || 'About {minutes} min remaining').replace('{minutes}', estimatedRemainingMinutes)}</span>}</div>
        <details className="allo-guided-focus-more allo-guided-collapsible" open={showFocusDetails} onToggle={event => setShowFocusDetails(event.currentTarget.open)}><summary>{t('guided.focus_more') || 'Plan & navigation'} <span>{currentPhaseIndex + 1}/{activePhaseDefinitions.length}</span></summary><div className="allo-guided-focus-more-body">
        {guidedPlanBrief && <details className="allo-guided-collapsible allo-guided-lesson-brief" style={{ marginBottom: '10px' }}><summary>{t('guided.lesson_brief_title') || 'Lesson brief'} · {guidedPlanBrief.title || (t('guided.lesson_brief_active') || 'Active plan')}</summary><div style={{ padding: '10px 12px', color: '#e0e7ff', fontSize: '12px', lineHeight: 1.5 }}>{guidedPlanBrief.summary && <span style={{ display: 'block' }}>{guidedPlanBrief.summary}</span>}{guidedPlanBrief.goal && <span style={{ display: 'block', marginTop: '6px', color: '#c7d2fe' }}><strong style={{ color: '#a7f3d0' }}>{t('guided.lesson_brief_goal') || 'Goal'}:</strong> {guidedPlanBrief.goal}</span>}{activeStepReason && <span style={{ display: 'block', marginTop: '6px', padding: '7px 8px', borderRadius: '8px', background: 'rgba(79,70,229,.18)' }}><strong style={{ color: '#fef3c7' }}>{t('guided.lesson_brief_why_step') || 'Why this step'}:</strong> {activeStepReason}</span>}{guidedPlanBrief.rationale && !activeStepReason && <span style={{ display: 'block', marginTop: '6px', color: '#c7d2fe' }}><strong style={{ color: '#fef3c7' }}>{t('guided.lesson_brief_why_path') || 'Why this path'}:</strong> {guidedPlanBrief.rationale}</span>}{guidedSettingsSummary && <span style={{ display: 'block', marginTop: '6px', color: '#a5b4fc' }}><strong style={{ color: '#a7f3d0' }}>{t('guided.lesson_brief_settings') || 'Settings'}:</strong> {guidedSettingsSummary}</span>}</div></details>}
        <details className="allo-guided-collapsible" style={{ marginBottom: '10px' }}>
          <summary>{t('guided.advanced_navigation') || 'Browse or jump to another step'}</summary>
          <div style={{ padding: '10px 12px' }}>
            <label htmlFor="guided-step-jump" style={{ display: 'block', fontSize: '12px', color: '#c7d2fe', marginBottom: '4px', fontWeight: 700 }}>{t('guided.jump_to_step') || 'Jump to step'}</label>
            <select id="guided-step-jump" value={guidedStep} disabled={guidedBusy} onChange={(event) => requestGuidedJump(event.target.value)} style={{ width: '100%', minHeight: '40px', marginBottom: pendingJump ? '6px' : 0, padding: '7px 9px', borderRadius: '9px', border: '1px solid rgba(165,180,252,.45)', background: '#172554', color: 'white', fontSize: '13px', opacity: guidedBusy ? .65 : 1 }}>{GUIDED_STEPS.map((item, index) => <option key={item.id} value={index}>{index + 1}. {localizeStep(item, 'label')}</option>)}</select>
            {pendingJump && <div role="alert" style={{ marginTop: '8px', padding: '9px', borderRadius: '9px', border: '1px solid rgba(251,191,36,.5)', background: 'rgba(120,53,15,.3)', color: '#fef3c7', fontSize: '12px' }}><strong style={{ display: 'block', color: 'white', marginBottom: '3px' }}>{t('guided.jump_confirm_title') || 'Jump forward?'}</strong>{(t('guided.jump_confirm_text') || '{count} unfinished steps will be marked skipped.').replace('{count}', pendingJump.bypassedIds.length)}<div style={{ display: 'flex', gap: '7px', marginTop: '7px' }}><button type="button" onClick={confirmGuidedJump} style={{ flex: 1, border: 0, borderRadius: '7px', fontWeight: 800 }}>{t('guided.jump_and_skip') || 'Jump and mark skipped'}</button><button type="button" onClick={() => setPendingJump(null)} style={{ flex: 1, borderRadius: '7px', border: '1px solid rgba(255,255,255,.25)', background: 'transparent', color: 'white' }}>{t('common.cancel') || 'Cancel'}</button></div></div>}
          </div>
        </details>
        <div className="allo-guided-phase-rail" role="progressbar" aria-valuenow={currentPhaseIndex + 1} aria-valuemin={1} aria-valuemax={activePhaseDefinitions.length} aria-label={(t('guided.phase_progress') || 'Guided phase progress') + ': ' + (currentPhaseIndex + 1) + '/' + activePhaseDefinitions.length}>
          {activePhaseDefinitions.map((phase, phaseIndex) => {
            const phaseSteps = GUIDED_STEPS.filter(item => (item.phase || 'guided') === phase.id);
            const phaseDone = phaseSteps.length > 0 && phaseSteps.every(item => _effectiveCompletedSet.has(item.id) || (Array.isArray(guidedSkippedIds) && guidedSkippedIds.includes(item.id)));
            const phaseState = phaseIndex === currentPhaseIndex ? 'current' : (phaseDone || phaseIndex < currentPhaseIndex ? 'done' : 'upcoming');
            const phaseKey = 'guided.phase_' + phase.id;
            const translated = t(phaseKey);
            const phaseLabel = translated && translated !== phaseKey ? translated : phase.label;
            return <div className="allo-guided-phase-segment" data-state={phaseState} key={phase.id} aria-hidden="true"><strong>{phaseState === 'done' ? '✓' : phaseIndex + 1}</strong><span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{phaseLabel}</span></div>;
          })}
        </div>
        </div></details>
        {guidedResourceItems.length > 0 && <details className="allo-guided-resource-shelf allo-guided-collapsible"><summary><span>{t('guided.resource_shelf_title') || 'Lesson resources'}</span><strong>{guidedResourceItems.length}</strong></summary><div><span>{t('guided.resource_shelf_hint') || 'Everything created in this Guided run stays available here and in History.'}</span>{guidedResourceItems.slice(-6).reverse().map((entry, index) => <button type="button" key={entry.item.id || index} disabled={!openGuidedHistoryItem} onClick={() => openGuidedHistoryItem && openGuidedHistoryItem(entry.item)}><span aria-hidden="true">✓</span><span>{entry.title}</span><span>{t('guided.resource_shelf_open') || 'Open'}</span></button>)}{guidedResourceItems.length > 6 && <small>{(t('guided.resource_shelf_more') || '+{count} more in History').replace('{count}', guidedResourceItems.length - 6)}</small>}</div></details>}        {step.action && (
          <div role="status" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: stepDone ? 'rgba(34,197,94,0.14)' : 'rgba(99,102,241,0.18)', border: '1px solid ' + (stepDone ? 'rgba(74,222,128,0.4)' : 'rgba(129,140,248,0.35)'), borderRadius: '12px', padding: '10px 12px', marginBottom: '10px' }}>
            <span aria-hidden="true" style={{ fontSize: '14px', lineHeight: '1.4' }}>{stepDone ? '✅' : '👉'}</span>
            <span style={{ fontSize: '13px', color: 'white', fontWeight: 600, lineHeight: '1.5' }}>{stepDone ? (step.success || step.action) : step.action}</span>
          </div>
        )}
        {stepDone && currentResultItem && <section className="allo-guided-inline-preview" role="region" aria-labelledby="guided-result-preview-title"><strong id="guided-result-preview-title">{t('guided.result_preview_title') || 'Latest result ready'}</strong><span>{currentResultItem.title || humanize(currentResultItem.type)}</span>{resultPreviewText && <p>{resultPreviewText}{resultPreviewText.length >= 260 ? '…' : ''}</p>}<div>{openGuidedHistoryItem && <button type="button" onClick={() => openGuidedHistoryItem(currentResultItem)}>{t('guided.result_preview_open') || 'Open result'}</button>}{typeof retryGuidedStep === 'function' && <button type="button" disabled={guidedBusy} onClick={retryGuidedStep}>{t('guided.result_preview_retry') || 'Generate again'}</button>}</div></section>}
        {!isLast && typeof generateGuidedPlanFromGoal === 'function' && <details className="allo-guided-ask allo-guided-collapsible"><summary>✨ {t('guided.quick_guide_title') || 'Ask Guide to adjust what remains'}</summary><div><span>{t('guided.quick_guide_hint') || 'Describe a change. You will review the updated path before anything is applied.'}</span><div className="allo-guided-prompt-chips"><button type="button" onClick={() => setQuickGuideText(t('guided.quick_guide_shorter') || 'Make the remaining path shorter.')}>{t('guided.quick_guide_shorter_chip') || 'Shorter'}</button><button type="button" onClick={() => setQuickGuideText(t('guided.quick_guide_discussion') || 'Add more discussion and collaboration.')}>{t('guided.quick_guide_discussion_chip') || 'More discussion'}</button><button type="button" onClick={() => setQuickGuideText(t('guided.quick_guide_paper') || 'Optimize the remaining path for paper-first delivery.')}>{t('guided.quick_guide_paper_chip') || 'Paper-first'}</button></div><label htmlFor="guided-quick-guide">{t('guided.quick_guide_label') || 'What should change?'}</label><textarea id="guided-quick-guide" maxLength={400} rows={3} value={quickGuideText} disabled={quickGuideBusy} onChange={event => { setQuickGuideText(event.target.value); setQuickGuideStatus(''); }} placeholder={t('guided.quick_guide_placeholder') || 'Example: keep the quiz, add partner discussion, and finish in 25 minutes.'} /><button type="button" disabled={quickGuideBusy || quickGuideText.trim().length < 3} onClick={askGuideAboutRemaining}>{quickGuideBusy ? (t('guided.quick_guide_working') || 'Adjusting…') : (t('guided.quick_guide_preview') || 'Preview adjustment')}</button>{quickGuideStatus && <span role="status" aria-live="polite">{quickGuideStatus}</span>}</div></details>}        {phaseCheckpointReady && <section ref={_phaseCheckpointRef} tabIndex={-1} role="status" aria-live="polite" className="allo-guided-phase-checkpoint" aria-labelledby="guided-phase-checkpoint-title" style={{ marginBottom: '10px', padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(16,185,129,.2), rgba(79,70,229,.2))', border: '1px solid rgba(167,243,208,.45)' }}>
          <strong id="guided-phase-checkpoint-title" style={{ display: 'block', color: 'white', fontSize: '15px' }}>{(t('guided.phase_checkpoint_title') || '{phase} phase complete').replace('{phase}', currentPhaseLabel)}</strong>
          <span style={{ display: 'block', marginTop: '4px', color: '#d1fae5', fontSize: '12px', lineHeight: 1.45 }}>{(t('guided.phase_checkpoint_summary') || '{completed} completed · {skipped} skipped · {resources} resources created').replace('{completed}', currentPhaseCompletedCount).replace('{skipped}', currentPhaseSkippedCount).replace('{resources}', currentPhaseResources.length)}</span>
          {currentPhaseResources.length > 0 && <div style={{ marginTop: '8px', color: '#e0e7ff', fontSize: '11px' }}>{currentPhaseResources.slice(-3).map(resource => resource.title).join(' · ')}</div>}
          <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginTop: '10px' }}>
            {latestPhaseResourceItem && openGuidedHistoryItem && <button type="button" disabled={guidedBusy} onClick={() => openGuidedHistoryItem(latestPhaseResourceItem)} style={{ flex: 1, minWidth: '145px', borderRadius: '9px', border: '1px solid rgba(165,180,252,.4)', background: 'rgba(255,255,255,.08)', color: '#e0e7ff', fontWeight: 800 }}>{t('guided.phase_checkpoint_review') || 'Review latest resource'}</button>}
            {typeof callGemini === 'function' && <button type="button" disabled={guidedBusy} onClick={openAiPlanner} style={{ flex: 1, minWidth: '145px', borderRadius: '9px', border: '1px solid rgba(165,180,252,.4)', background: 'rgba(255,255,255,.08)', color: '#e0e7ff', fontWeight: 800 }}>{t('guided.phase_checkpoint_adjust') || 'Adjust remaining path'}</button>}
            <button type="button" disabled={guidedBusy} onClick={() => handleGuidedSkip(false)} style={{ flex: 1, minWidth: '180px', border: 0, borderRadius: '9px', background: 'linear-gradient(135deg, #10b981, #6366f1)', color: 'white', fontWeight: 900 }}>{(t('guided.phase_checkpoint_continue') || 'Continue to {phase}').replace('{phase}', nextPhaseLabel)}</button>
          </div>
        </section>}
        {typeof focusGuidedTarget === 'function' && !isLast && <button type="button" disabled={guidedBusy} onClick={focusGuidedTarget} style={{ width: '100%', marginBottom: '10px', padding: '7px 10px', borderRadius: '9px', border: '1px solid rgba(165,180,252,.4)', background: 'rgba(255,255,255,.06)', color: '#e0e7ff', fontWeight: 800 }}>{t('guided.focus_tool') || 'Focus highlighted tool'}</button>}
{step.id === 'package-deliver' && Array.isArray(guidedDeliveryGroups) && (
          <div role="region" aria-labelledby="guided-delivery-title" style={{ marginBottom: '10px', padding: '11px 12px', borderRadius: '12px', background: 'rgba(15,23,42,.38)', border: '1px solid rgba(167,243,208,.35)' }}>
            <strong id="guided-delivery-title" style={{ display: 'block', color: 'white', fontSize: '13px', marginBottom: '3px' }}>{t('guided.delivery_title') || 'Choose delivery by purpose'}</strong>
            <span style={{ display: 'block', color: '#c7d2fe', fontSize: '12px', lineHeight: 1.45, marginBottom: '8px' }}>{t('guided.delivery_hint') || 'Use one primary route and a backup when access needs differ.'}</span>
            <div role="group" aria-labelledby="guided-delivery-recommender-title" style={{ marginBottom: '9px', padding: '9px', borderRadius: '9px', background: 'rgba(99,102,241,.14)', border: '1px solid rgba(165,180,252,.35)' }}>
              <strong id="guided-delivery-recommender-title" style={{ display: 'block', color: '#fef3c7', fontSize: '12px', marginBottom: '6px' }}>{t('guided.delivery_recommender_title') || 'Help me choose'}</strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px' }}>
                <label style={{ color: '#e0e7ff', fontSize: '11px' }}>{t('guided.delivery_setting') || 'Teaching setting'}<select value={deliverySetting} onChange={event => setDeliverySetting(event.target.value)} style={{ display: 'block', width: '100%', marginTop: '3px', padding: '6px', borderRadius: '7px', background: '#172554', color: 'white', border: '1px solid rgba(165,180,252,.45)' }}><option value="take-home">{t('guided.delivery_setting_take_home') || 'Take-home'}</option><option value="print">{t('guided.delivery_setting_print') || 'Print / paper'}</option><option value="live">{t('guided.delivery_setting_live') || 'Live class'}</option><option value="lms">{t('guided.delivery_setting_lms') || 'LMS'}</option></select></label>
                <label style={{ color: '#e0e7ff', fontSize: '11px' }}>{t('guided.delivery_priority') || 'Top priority'}<select value={deliveryPriority} onChange={event => setDeliveryPriority(event.target.value)} style={{ display: 'block', width: '100%', marginTop: '3px', padding: '6px', borderRadius: '7px', background: '#172554', color: 'white', border: '1px solid rgba(165,180,252,.45)' }}><option value="accessible">{t('guided.delivery_priority_accessible') || 'Accessibility'}</option><option value="editable">{t('guided.delivery_priority_editable') || 'Editable'}</option><option value="assessment">{t('guided.delivery_priority_assessment') || 'Assessment'}</option><option value="interactive">{t('guided.delivery_priority_interactive') || 'Interactive'}</option><option value="low-connectivity">{t('guided.delivery_priority_offline') || 'Low connectivity'}</option></select></label>
              </div>
              <div role="status" aria-live="polite" style={{ marginTop: '7px', padding: '7px 8px', borderRadius: '7px', background: 'rgba(15,23,42,.45)', color: '#e0e7ff', fontSize: '11px', lineHeight: 1.45 }}><strong style={{ color: '#a7f3d0' }}>{t('guided.delivery_recommended') || 'Recommended'}:</strong> {deliveryRecommendation.primary} <span aria-hidden="true">→</span> <strong>{t('guided.delivery_backup') || 'Backup'}:</strong> {deliveryRecommendation.backup}<span style={{ display: 'block', color: '#c7d2fe', marginTop: '2px' }}>{deliveryRecommendation.why}</span></div>
            </div>
            <div role="list" aria-label={t('guided.delivery_options_label') || 'Export and delivery options'} style={{ display: 'grid', gap: '6px' }}>
              {guidedDeliveryGroups.map(group => <div role="listitem" key={group.id} style={{ padding: '7px 8px', borderRadius: '8px', background: 'rgba(255,255,255,.06)' }}><strong style={{ display: 'block', color: '#a7f3d0', fontSize: '12px' }}>{group.label}</strong><span style={{ display: 'block', marginTop: '2px', color: '#e0e7ff', fontSize: '12px', lineHeight: 1.45 }}>{(group.options || []).join(' · ')}</span></div>)}
            </div>
            <div style={{ marginTop: '8px', color: '#fde68a', fontSize: '11px', lineHeight: 1.45 }}>{t('guided.delivery_conditions') || 'QTI needs a quiz. H5P needs compatible content and destination libraries. Storybook and Persona exports stay in their resource views. Homework expiry and hosting vary by deployment.'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px', marginTop: '9px' }}>
              {typeof openGuidedDocumentBuilder === 'function' && <button type="button" disabled={guidedBusy} onClick={openGuidedDocumentBuilder} style={{ padding: '7px 8px', border: 0, borderRadius: '8px', background: '#4f46e5', color: 'white', fontWeight: 800, fontSize: '12px' }}>{t('guided.open_builder') || 'Document Builder'}</button>}
              {typeof createGuidedHomeworkShare === 'function' && <button type="button" disabled={guidedBusy} onClick={createGuidedHomeworkShare} style={{ padding: '7px 8px', border: '1px solid rgba(165,180,252,.45)', borderRadius: '8px', background: 'rgba(255,255,255,.08)', color: 'white', fontWeight: 800, fontSize: '12px' }}>{t('guided.create_homework_qr') || 'Homework QR'}</button>}
              {typeof startGuidedLiveSession === 'function' && <button type="button" disabled={guidedBusy} onClick={startGuidedLiveSession} style={{ padding: '7px 8px', border: '1px solid rgba(110,231,183,.45)', borderRadius: '8px', background: 'rgba(16,185,129,.14)', color: '#d1fae5', fontWeight: 800, fontSize: '12px' }}>{t('guided.start_live_session') || 'Live session'}</button>}
              {typeof previewGuidedStudentAssignment === 'function' && <button type="button" disabled={guidedBusy || !canPreviewGuidedStudentAssignment} onClick={previewGuidedStudentAssignment} title={!canPreviewGuidedStudentAssignment ? (t('guided.preview_requires_share') || 'Create a student link first') : undefined} style={{ padding: '7px 8px', border: '1px solid rgba(252,211,77,.45)', borderRadius: '8px', background: 'rgba(245,158,11,.12)', color: '#fef3c7', fontWeight: 800, fontSize: '12px' }}>{t('guided.test_student_link') || 'Test student link'}</button>}
            </div>
          </div>
        )}
        {guidedBusy && <div role="status" aria-live="polite" style={{ marginBottom: '10px', padding: '9px 11px', borderRadius: '10px', background: 'rgba(59,130,246,.18)', border: '1px solid rgba(147,197,253,.4)', color: '#dbeafe', fontSize: '12px', fontWeight: 700 }}><div>{generationStep || t('guided.generating_lock') || 'Generating this resource. Step navigation is paused until it finishes.'}</div>{processingProgress?.total > 0 && <div role="progressbar" aria-label={t('guided.generation_progress') || 'Generation progress'} aria-valuemin={0} aria-valuemax={processingProgress.total} aria-valuenow={processingProgress.current} style={{ height: '7px', marginTop: '7px', overflow: 'hidden', borderRadius: '999px', background: 'rgba(15,23,42,.55)' }}><span style={{ display: 'block', width: Math.min(100, Math.max(0, processingProgress.current / processingProgress.total * 100)) + '%', height: '100%', background: '#60a5fa', transition: 'width .2s' }} /></div>}</div>}
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
                <span aria-hidden="true">⊙️</span>{t('guided.tab_how') || 'How it works'}
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
          <div ref={_readinessRegionRef} tabIndex={-1} role="region" aria-labelledby="guided-readiness-title" style={{ marginBottom: '10px', padding: '11px 13px', background: 'rgba(59,130,246,.13)', border: '1px solid rgba(147,197,253,.38)', borderRadius: '12px' }}>
            <strong id="guided-readiness-title" style={{ display: 'block', color: 'white', fontSize: '13px' }}>{t('guided.readiness_title') || 'Student-ready preflight'}</strong>
            <span style={{ display: 'block', color: '#c7d2fe', fontSize: '12px', lineHeight: 1.45, margin: '3px 0 8px' }}>{t('guided.readiness_hint') || 'Verified actions are checked automatically. Confirm the remaining classroom checks before launch.'}</span>
            <div role="progressbar" aria-label={t('guided.readiness_progress') || 'Learner readiness progress'} aria-valuemin={0} aria-valuemax={readinessTotal} aria-valuenow={readinessCount} style={{ height: '7px', overflow: 'hidden', borderRadius: '999px', background: 'rgba(15,23,42,.55)', marginBottom: '8px' }}><span style={{ display: 'block', width: (readinessCount / Math.max(1, readinessTotal) * 100) + '%', height: '100%', background: readinessCount === readinessTotal ? '#34d399' : '#60a5fa', transition: 'width .2s' }} /></div>
            {readinessFixes.length > 0 && <div className="allo-guided-readiness-fixes"><strong>{t('guided.readiness_fix_title') || 'Finish verified setup'}</strong>{readinessFixes.map(item => <button type="button" key={item.id} onClick={() => runReadinessAction(item.action)}>{item.id === 'directions' ? (t('guided.readiness_fix_directions') || 'Create directions') : item.id === 'delivery' ? (t('guided.readiness_fix_delivery') || 'Choose export or delivery') : (t('guided.readiness_fix_preview') || 'Test learner view')}</button>)}</div>}
            <div style={{ display: 'grid', gap: '5px' }}>{readinessItems.map(item => { const checked = !!(item.verified || readinessChecks[item.id]); return <label key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', padding: '6px 7px', borderRadius: '7px', background: checked ? 'rgba(16,185,129,.12)' : 'rgba(15,23,42,.32)', color: checked ? '#d1fae5' : '#e0e7ff', fontSize: '12px', lineHeight: 1.4 }}><input type="checkbox" checked={checked} onChange={event => setReadinessChecks(previous => ({ ...(previous || {}), [item.id]: event.target.checked }))} style={{ marginTop: '2px' }} /><span style={{ flex: 1 }}>{item.label}</span><span style={{ color: item.verified ? '#6ee7b7' : '#c7d2fe', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>{item.verified ? (t('guided.readiness_verified') || 'Verified') : (t('guided.readiness_confirm') || 'Confirm')}</span></label>; })}</div>
            <div role="status" aria-live="polite" style={{ marginTop: '8px', color: readinessCount === readinessTotal ? '#6ee7b7' : '#fde68a', fontSize: '12px', fontWeight: 800 }}>{readinessCount}/{readinessTotal} {readinessCount === readinessTotal ? (t('guided.readiness_ready') || 'ready for learners') : (t('guided.readiness_remaining') || 'checks complete')}</div>
          </div>
        )}
        {isLast && pendingReadinessAction && <section className="allo-guided-launch-gate" role="alert" aria-labelledby="guided-launch-gate-title" aria-describedby="guided-launch-gate-description">
          <strong id="guided-launch-gate-title">{pendingReadinessAction === 'teach' ? (t('guided.preflight_teach_title') || 'Review before starting class') : (t('guided.preflight_finish_title') || 'Finish Guided Mode with open checks?')}</strong>
          <span id="guided-launch-gate-description">{(pendingReadinessAction === 'teach' ? (t('guided.preflight_teach_hint') || '{count} student-readiness checks still need attention. You can review them or continue intentionally.') : (t('guided.preflight_finish_hint') || '{count} student-readiness checks will remain open in this completion summary.')).replace('{count}', readinessRemainingItems.length)}</span>
          <ul>{readinessRemainingItems.map(item => <li key={item.id}>{item.label}</li>)}</ul>
          <div>
            <button ref={_readinessGatePrimaryRef} type="button" onClick={focusReadinessChecklist}>{t('guided.preflight_review') || 'Review remaining checks'}</button>
            <button type="button" onClick={pendingReadinessAction === 'teach' ? performStartTeaching : completeGuidedRun}>{pendingReadinessAction === 'teach' ? (t('guided.preflight_teach_anyway') || 'Start teaching anyway') : (t('guided.preflight_finish_anyway') || 'Finish anyway')}</button>
            <button type="button" onClick={dismissReadinessGate}>{t('common.cancel') || 'Cancel'}</button>
          </div>
        </section>}
        {isLast && <section role="region" aria-labelledby="guided-launchpad-title" style={{ marginBottom: '10px', padding: '12px 13px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(16,185,129,.18), rgba(37,99,235,.16))', border: '1px solid rgba(110,231,183,.4)' }}><strong id="guided-launchpad-title" style={{ display: 'block', color: 'white', fontSize: '14px' }}>🚀 {t('guided.launchpad_title') || 'Ready-to-teach launchpad'}</strong><span style={{ display: 'block', color: '#d1fae5', marginTop: '3px', fontSize: '12px', lineHeight: 1.45 }}>{t('guided.launchpad_hint') || 'Open the core teaching materials, verify the learner route, and keep the backup format close.'}</span><div role="list" aria-label={t('guided.launchpad_status_label') || 'Teaching launch status'} style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '6px', marginTop: '9px' }}>{[[t('guided.launchpad_lesson_plan') || 'Lesson plan', !!latestLessonPlanItem], [t('guided.launchpad_directions') || 'Student directions', hasSavedDirections], [t('guided.launchpad_learner_preview') || 'Learner preview', hasStudentPreview], [t('guided.launchpad_delivery') || 'Delivery artifact', hasDeliveryOutcome]].map(([label, ready]) => <div role="listitem" key={label} style={{ padding: '7px 8px', borderRadius: '8px', background: ready ? 'rgba(16,185,129,.13)' : 'rgba(251,191,36,.1)', color: ready ? '#d1fae5' : '#fde68a', fontSize: '11px' }}><span aria-hidden="true">{ready ? '✓' : '○'}</span> {label}</div>)}</div><div style={{ marginTop: '8px', padding: '8px', borderRadius: '8px', background: 'rgba(15,23,42,.35)', color: '#e0e7ff', fontSize: '11px', lineHeight: 1.45 }}><strong style={{ color: '#a7f3d0' }}>{t('guided.delivery_recommended') || 'Recommended'}:</strong> {deliveryRecommendation.primary} <span aria-hidden="true">→</span> <strong>{t('guided.delivery_backup') || 'Backup'}:</strong> {deliveryRecommendation.backup}<span style={{ display: 'block', color: '#c7d2fe', marginTop: '2px' }}>{deliveryRecommendation.why}</span></div><div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginTop: '9px' }}><button type="button" disabled={!canStartTeaching} onClick={requestStartTeaching} className="allo-guided-start-teaching">{t('guided.launchpad_start_teaching') || 'Start teaching'}</button>{latestLessonPlanItem && openGuidedHistoryItem && <button type="button" onClick={() => openGuidedHistoryItem(latestLessonPlanItem)} style={{ flex: 1, minWidth: '140px', borderRadius: '8px', border: '1px solid rgba(165,180,252,.38)', background: 'rgba(255,255,255,.08)', color: 'white', fontWeight: 800 }}>{t('guided.launchpad_open_plan') || 'Open lesson plan'}</button>}{latestDirectionsItem && openGuidedHistoryItem && <button type="button" onClick={() => openGuidedHistoryItem(latestDirectionsItem)} style={{ flex: 1, minWidth: '140px', borderRadius: '8px', border: '1px solid rgba(165,180,252,.38)', background: 'rgba(255,255,255,.08)', color: 'white', fontWeight: 800 }}>{t('guided.launchpad_open_directions') || 'Open directions'}</button>}{typeof openGuidedDocumentBuilder === 'function' && <button type="button" onClick={openGuidedDocumentBuilder} style={{ flex: 1, minWidth: '140px', border: 0, borderRadius: '8px', background: '#10b981', color: '#052e2b', fontWeight: 900 }}>{t('guided.launchpad_package') || 'Open package builder'}</button>}{canPreviewGuidedStudentAssignment && typeof previewGuidedStudentAssignment === 'function' && <button type="button" onClick={previewGuidedStudentAssignment} style={{ flex: 1, minWidth: '140px', borderRadius: '8px', border: '1px solid rgba(165,180,252,.38)', background: 'rgba(79,70,229,.22)', color: 'white', fontWeight: 800 }}>{t('guided.launchpad_preview') || 'Preview learner view'}</button>}</div></section>}        {isLast && (
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
            <div style={{ display: 'flex', gap: '7px', marginTop: '8px', flexWrap: 'wrap' }}><button type="button" onClick={() => setShowFeedbackHistory(value => !value)} style={{ borderRadius: '7px', border: '1px solid rgba(255,255,255,.2)', background: 'transparent', color: '#c7d2fe', padding: '6px 9px' }}>{showFeedbackHistory ? (t('guided.hide_reflections') || 'Hide saved reflections') : (t('guided.view_reflections') || 'View saved reflections')} ({feedbackEntries.length})</button>{feedbackEntries.length > 0 && <button type="button" onClick={clearFeedback} style={{ borderRadius: '7px', border: '1px solid rgba(248,113,113,.4)', background: 'transparent', color: '#fecaca', padding: '6px 9px' }}>{t('guided.clear_reflections') || 'Clear local reflections'}</button>}</div>
            {showFeedbackHistory && <div role="region" aria-label={t('guided.saved_reflections') || 'Saved Guided reflections'} style={{ marginTop: '7px', padding: '8px', maxHeight: '100px', overflowY: 'auto', borderRadius: '8px', background: 'rgba(15,23,42,.4)', color: '#cbd5e1', fontSize: '12px' }}>{feedbackEntries.length ? feedbackEntries.slice().reverse().map((entry, index) => <div key={entry.at || index} style={{ marginBottom: '4px' }}>{new Date(entry.at).toLocaleDateString()}: {entry.stepId ? localizeStep(allSteps.find(item => item.id === entry.stepId) || { id: entry.stepId, label: entry.stepId }, 'label') : (t('guided.feedback_none') || 'No confusing step')}</div>) : (t('guided.no_reflections') || 'No reflections saved on this device.')}</div>}
            <div style={{ fontSize: '12px', color: 'rgba(203,213,225,0.8)', marginTop: '8px', fontStyle: 'italic' }}>{t('guided.recap_hub') || 'Looking for more? The Learning Hub has StoryForge, PoetTree, and LitLab.'}</div>
          </div>
        )}
        {pendingUnsafeExit && <section className="allo-guided-save-warning" role="alert" aria-labelledby="guided-save-warning-title"><strong id="guided-save-warning-title">{t('guided.progress_not_saved_title') || 'Progress could not be saved'}</strong><span>{t('guided.progress_not_saved_hint') || 'Device storage is unavailable. Retry the save, preserve the lesson as a project backup, or keep Guided Mode open.'}</span><div>{typeof retryGuidedProgressSave === 'function' && <button ref={_unsafeExitPrimaryRef} type="button" onClick={retryGuidedProgressSave}>{t('guided.retry_progress_save') || 'Retry save'}</button>}{typeof openGuidedProjectBackup === 'function' && <button type="button" onClick={openGuidedProjectBackup}>{t('guided.save_project_backup') || 'Save project backup'}</button>}<button ref={typeof retryGuidedProgressSave !== 'function' ? _unsafeExitPrimaryRef : undefined} type="button" onClick={dismissUnsafeExit}>{t('guided.keep_guided_open') || 'Keep Guided Mode open'}</button><button type="button" onClick={confirmUnsafeExit}>{t('guided.exit_without_saving') || 'Exit without saving'}</button></div></section>}
        <div className="allo-guided-primary-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {guidedStep > 0 && <button type="button" disabled={guidedBusy} onClick={() => setGuidedStep(s => Math.max(0, s - 1))} aria-label={t('guided.back') || 'Back'} title={t('guided.back') || 'Back'} style={{ padding: '6px 10px', fontSize: '12px', fontWeight: 800, color: '#c7d2fe', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}>{t('guided.back') || '← Back'}</button>}
          {step.id === 'source-input' && !stepDone && <span style={{ flex: 1, padding: '6px 12px', fontSize: '12px', fontWeight: 700, color: 'rgba(199,210,254,0.85)', fontStyle: 'italic', textAlign: 'center' }}>{t('guided.source_prompt')}</span>}
          {!isLast && stepDone && !phaseCheckpointReady && currentResultItem && openGuidedHistoryItem && <button type="button" disabled={guidedBusy} onClick={() => openGuidedHistoryItem(currentResultItem)} style={{ flex: 1, padding: '6px 12px', fontSize: '12px', fontWeight: 800, color: '#e0e7ff', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(165,180,252,.35)', borderRadius: '10px' }}>{t('guided.review_result') || 'Review result'}</button>}
          {!isLast && stepDone && !phaseCheckpointReady && <button type="button" disabled={guidedBusy} onClick={() => handleGuidedSkip(false)} style={{ flex: 1, padding: '6px 12px', fontSize: '12px', fontWeight: 800, color: 'white', background: 'linear-gradient(135deg, #818cf8, #6366f1)', border: '1px solid rgba(129,140,248,0.45)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>{t('guided.next_step') || 'Next step →'}</button>}
          {!isLast && !stepDone && !phaseCheckpointReady && guidedStep > 0 && <button type="button" disabled={guidedBusy} onClick={() => handleGuidedSkip(true)} style={{ flex: 1, padding: '6px 12px', fontSize: '12px', fontWeight: 800, color: '#c7d2fe', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>{t('guided.skip_step') || t('guided.skip') || 'Skip step'}</button>}
          {isLast && <button type="button" disabled={guidedBusy} onClick={requestFinishGuidedRun} style={{ flex: 1, padding: '6px 12px', fontSize: '12px', fontWeight: 700, color: 'white', background: 'linear-gradient(135deg, #818cf8, #6366f1)', border: 'none', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>{readinessCount === readinessTotal ? (t('guided.all_done') || 'Finish Guided Mode') : (t('guided.finish_with_checks_remaining') || 'Finish with checks remaining')}</button>}
          {toggleGuidedStepId && <button type="button" disabled={guidedBusy} onClick={() => setShowPicker(p => !p)} aria-label={t('guided.customize') || 'Choose which steps to include'} aria-expanded={showPicker} aria-controls="guided-step-picker" title={t('guided.customize') || 'Choose which steps to include'} style={{ padding: '6px 10px', fontSize: '12px', fontWeight: 700, color: showPicker ? 'white' : '#c7d2fe', background: showPicker ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>⊙</button>}
          <button type="button" onClick={() => setShowGuidedTip(p => !p)} aria-expanded={showGuidedTip} aria-controls="guided-about-panel" style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 700, color: showGuidedTip ? 'white' : '#c7d2fe', background: showGuidedTip ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>{showGuidedTip ? '✕' : 'ℹ️'} {t('guided.about')}</button>
          <button type="button" disabled={guidedBusy} onClick={requestResumeLater} title={progressSaveStatus === 'error' ? (t('guided.resume_later_unsaved_hint') || 'Progress is not saved; review before exiting') : (t('guided.resume_later_hint') || 'Save your place and return from Setup')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 700, color: '#fde68a', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>{t('guided.resume_later') || 'Resume later'}</button>
        </div>
        {showPicker && toggleGuidedStepId && (
          <div id="guided-step-picker" role="group" aria-label={t('guided.choose_steps') || 'Choose which steps to include'} style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '340px', overflowY: 'auto', animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'rgba(165,180,252,0.95)', marginBottom: '8px' }}>{t('guided.choose_steps') || 'Choose which steps to include'} ({allSteps.filter(s => isStepOn(s.id)).length}/{allSteps.length})</div>
            {typeof generateGuidedPlanFromGoal === 'function' && <button type="button" disabled={guidedBusy} onClick={openAiPlanner} style={{ width: '100%', marginBottom: '9px', padding: '9px 10px', textAlign: 'left', borderRadius: '9px', border: '1px solid rgba(110,231,183,.48)', background: 'rgba(16,185,129,.13)', color: 'white' }}><strong style={{ display: 'block', fontSize: '13px' }}>✨ {t('guided.ai_plan_refine') || 'Plan or refine this path with AI'}</strong><span style={{ display: 'block', color: '#d1fae5', fontSize: '11px', marginTop: '2px' }}>{t('guided.ai_plan_refine_hint') || 'Describe a goal or constraint and review a new path before replacing the current one.'}</span></button>}
            {Array.isArray(guidedPresets) && typeof applyGuidedPreset === 'function' && <div role="group" aria-label={t('guided.preset_group') || 'Goal-based Guided Mode paths'} style={{ display: 'grid', gap: '7px', marginBottom: '10px' }}>{guidedPresets.map(preset => { const active = isPresetActive(preset); const count = presetStepIds(preset).length; return <button type="button" key={preset.id} disabled={guidedBusy} aria-pressed={active} onClick={() => choosePreset(preset)} style={{ textAlign: 'left', padding: '9px 10px', borderRadius: '9px', border: '1px solid ' + (active ? '#6ee7b7' : 'rgba(129,140,248,.35)'), background: active ? 'rgba(16,185,129,.18)' : 'rgba(99,102,241,.12)', color: 'white' }}><strong style={{ display: 'block', fontSize: '13px' }}>{t('guided.preset_' + preset.id + '_label') || preset.label}{active ? ' ' + (t('guided.preset_active') || '(active)') : ''}</strong><span style={{ display: 'block', color: '#c7d2fe', fontSize: '12px', marginTop: '3px', lineHeight: 1.4 }}>{t('guided.preset_' + preset.id + '_description') || preset.description}</span><span style={{ display: 'block', color: '#a7f3d0', fontSize: '12px', marginTop: '4px' }}>{(t('guided.preset_meta') || '{count} steps · about {minutes} min').replace('{count}', count).replace('{minutes}', Math.max(4, count * 2))}</span></button>; })}</div>}
            {pendingPreset && <div role="alert" style={{ marginBottom: '10px', padding: '10px', borderRadius: '9px', border: '1px solid rgba(251,191,36,.55)', background: 'rgba(120,53,15,.3)', color: '#fef3c7', fontSize: '12px' }}><strong style={{ display: 'block', color: 'white', marginBottom: '4px' }}>{t('guided.preset_confirm_title') || 'Change Guided path?'}</strong>{t('guided.preset_confirm_text') || 'This restarts Guided progress. Your generated resources remain in History.'}<div style={{ display: 'flex', gap: '7px', marginTop: '8px' }}><button type="button" onClick={confirmPreset} style={{ flex: 1, padding: '7px', borderRadius: '7px', border: 0, fontWeight: 800 }}>{t('guided.change_path') || 'Change path'}</button><button type="button" onClick={() => setPendingPreset(null)} style={{ flex: 1, padding: '7px', borderRadius: '7px', border: '1px solid rgba(255,255,255,.25)', background: 'transparent', color: 'white' }}>{t('common.cancel') || 'Cancel'}</button></div></div>}
            {pendingStepId && <div role="alert" style={{ marginBottom: '10px', padding: '10px', borderRadius: '9px', border: '1px solid rgba(251,191,36,.55)', background: 'rgba(120,53,15,.3)', color: '#fef3c7', fontSize: '12px' }}><strong style={{ display: 'block', color: 'white', marginBottom: '4px' }}>{t('guided.step_change_confirm_title') || 'Change included steps?'}</strong>{t('guided.step_change_confirm_text') || 'This returns Guided Mode to step 1. Completed resources remain in History.'}<div style={{ display: 'flex', gap: '7px', marginTop: '8px' }}><button type="button" onClick={confirmStepToggle} style={{ flex: 1, padding: '7px', borderRadius: '7px', border: 0, fontWeight: 800 }}>{t('guided.change_steps') || 'Change steps'}</button><button type="button" onClick={() => setPendingStepId(null)} style={{ flex: 1, padding: '7px', borderRadius: '7px', border: '1px solid rgba(255,255,255,.25)', background: 'transparent', color: 'white' }}>{t('common.cancel') || 'Cancel'}</button></div></div>}            {typeof setGuidedAutoAdvance === 'function' && <button type="button" role="switch" aria-checked={!!guidedAutoAdvance} disabled={guidedBusy} onClick={() => setGuidedAutoAdvance(value => !value)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: '100%', padding: '9px 10px', marginBottom: '10px', borderRadius: '9px', border: '1px solid rgba(165,180,252,.35)', background: 'rgba(255,255,255,.06)', color: 'white', textAlign: 'left' }}><span><strong style={{ display: 'block', fontSize: '13px' }}>{t('guided.auto_advance') || 'Automatically continue'}</strong><span style={{ display: 'block', color: '#c7d2fe', fontSize: '12px', marginTop: '2px' }}>{t('guided.auto_advance_hint') || 'Move to the next step after a resource finishes.'}</span></span><span aria-hidden="true" style={{ flexShrink: 0, width: '34px', height: '20px', borderRadius: '999px', padding: '2px', background: guidedAutoAdvance ? '#10b981' : '#475569' }}><span style={{ display: 'block', width: '16px', height: '16px', borderRadius: '50%', background: 'white', transform: guidedAutoAdvance ? 'translateX(14px)' : 'translateX(0)', transition: 'transform .15s' }} /></span></button>}
            <div style={{ marginBottom: '10px', padding: '9px 10px', borderRadius: '9px', border: '1px solid rgba(148,163,184,.28)', background: 'rgba(15,23,42,.25)' }}>
              <strong style={{ display: 'block', color: 'white', fontSize: '13px' }}>{t('guided.local_data_title') || 'Local Guided data'}</strong>
              <span style={{ display: 'block', margin: '3px 0 7px', color: '#c7d2fe', fontSize: '12px', lineHeight: 1.4 }}>{t('guided.local_data_hint') || 'Clear completed-run summaries, timing history, reflections, and Guided preferences stored on this device. Your current lesson and generated resources stay intact.'}</span>
              {!pendingClearGuidedData ? <button type="button" onClick={() => setPendingClearGuidedData(true)} style={{ width: '100%', borderRadius: '7px', border: '1px solid rgba(248,113,113,.45)', background: 'transparent', color: '#fecaca', padding: '7px 9px', fontWeight: 800 }}>{t('guided.clear_local_data') || 'Clear Guided history & preferences'}</button> : <div role="alert" style={{ padding: '8px', borderRadius: '8px', background: 'rgba(127,29,29,.3)', color: '#fecaca', fontSize: '12px' }}><strong style={{ display: 'block', color: 'white', marginBottom: '5px' }}>{t('guided.clear_local_confirm') || 'Clear local Guided data?'}</strong><div style={{ display: 'flex', gap: '7px' }}><button type="button" onClick={clearGuidedLocalData} style={{ flex: 1, border: 0, borderRadius: '7px', fontWeight: 800 }}>{t('guided.clear_now') || 'Clear now'}</button><button type="button" onClick={() => setPendingClearGuidedData(false)} style={{ flex: 1, borderRadius: '7px', border: '1px solid rgba(255,255,255,.25)', background: 'transparent', color: 'white' }}>{t('common.cancel') || 'Cancel'}</button></div></div>}
            </div>
            {allSteps.map((s, index) => {
              const on = isStepOn(s.id);
              const locked = s.id === 'source-input' || s.id === 'directions' || s.id === 'package-deliver' || s.id === '_final';
              const phaseDef = phaseDefinitions.find(item => item.id === s.phase) || { id: s.phase || 'other', label: s.phase || 'Other' };
              const previousPhase = index > 0 ? allSteps[index - 1]?.phase : null;
              const showPhaseHeading = index === 0 || previousPhase !== s.phase;
              const pickerPhaseKey = 'guided.phase_' + phaseDef.id;
              const pickerPhaseTranslation = t(pickerPhaseKey);
              const pickerPhaseLabel = pickerPhaseTranslation && pickerPhaseTranslation !== pickerPhaseKey ? pickerPhaseTranslation : phaseDef.label;
              return (
                <React.Fragment key={s.id}>
                  {showPhaseHeading && <div role="heading" aria-level={3} style={{ margin: index ? '10px 5px 4px' : '2px 5px 4px', color: '#a7f3d0', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.07em' }}>{pickerPhaseLabel}</div>}
                  <button type="button" role="checkbox" aria-checked={on} disabled={locked || guidedBusy} onClick={() => { if (!locked && !guidedBusy) chooseStepToggle(s.id); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '5px 6px', marginBottom: '2px', background: on ? 'rgba(99,102,241,0.16)' : 'transparent', border: 'none', borderRadius: '8px', cursor: locked ? 'default' : 'pointer', opacity: locked ? 0.6 : 1 }}>
                    <span aria-hidden="true" style={{ width: '14px', height: '14px', borderRadius: '4px', border: '1.5px solid ' + (on ? '#818cf8' : 'rgba(255,255,255,0.3)'), background: on ? '#6366f1' : 'transparent', color: 'white', fontSize: '12px', lineHeight: '12px', textAlign: 'center', flexShrink: 0 }}>{on ? '✓' : ''}</span>
                    <span style={{ fontSize: '12px', color: on ? 'white' : 'rgba(203,213,225,0.75)', fontWeight: 600 }}>{localizeStep(s, 'label')}{locked ? ' ' + (t('guided.required') || '(required)') : ''}</span>
                  </button>
                </React.Fragment>
              );
            })}          </div>
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
