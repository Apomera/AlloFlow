# AlloFlow — Complete User Manual & Pedagogical Guide
## Adaptive Levels, Layers, & Outputs: Flexible Learning Options for Whole-Student Education

*Version 1.0 | Copyright 2026, Aaron Pomeranz, PsyD*
*Distributed under AGPL 3.0 (GNU Affero General Public License v3)*

---

## Table of Contents

1. [Introduction to AlloFlow](#1-introduction-to-alloflow)
2. [Sourcing Content](#2-sourcing-content)
3. [Configuration & Adaptation](#3-configuration--adaptation)
4. [Core Learning Tools](#4-core-learning-tools)
   - [Analyze Source & Alignment](#-analyze-source--alignment)
   - [Leveled Text (The Reader)](#-leveled-text-the-reader)
   - [Glossary & Games](#-glossary--games)
   - [Visual Organizer & Visual Support](#-visual-organizer--visual-support)
   - [Exit Ticket (Quiz)](#-exit-ticket-quiz)
   - [Adventure Mode & Persona Panel](#-adventure-mode--persona-panel)
   - [Sequence Generator](#-sequence-generator-timeline-sort)
   - [Concept Sort](#-concept-sort)
   - [Writing Scaffolds, Brainstorming & Outlines](#-writing-scaffolds-brainstorming--outlines)
   - [Lesson Plan](#-lesson-plan)
   - [Standard Alignment Report](#-standard-alignment-report)
   - [Visual Panel](#-visual-panel-comic--diagram)
   - [FAQ Generator](#-faq-generator)
   - [Socratic Tutor](#-socratic-tutor)
5. [Word Sounds Studio](#5-word-sounds-studio)
6. [STEM Lab (55 Tools)](#6-stem-lab)
7. [Educator Tools Hub](#7-educator-tools-hub-teachergate-gated)
   - [Student Analytics & RTI Dashboard](#-student-analytics--rti-dashboard)
   - [Psychometric & CBM Probes](#-psychometric--cbm-probes)
   - [BehaviorLens (FBA / BIP)](#-behaviorlens-fba--bip-clinical-suite)
   - [Report Writer Wizard](#-report-writer-wizard)
   - [Symbol Studio (AAC & Visual Supports)](#-symbol-studio-aac--visual-supports)
8. [Live Session & Engagement Modes](#8-live-session--engagement-modes)
9. [Accessibility Features](#9-accessibility-features)
10. [AlloBot (AI Companion)](#10-allobot-ai-companion)
11. [Export, Sharing & Data Management](#11-export-sharing--data-management)
12. [Pedagogical Workflows in Practice](#12-pedagogical-workflows-in-practice)
13. [School IT Administration (The "School Box")](#13-school-it-administration-the-school-box)
14. [Troubleshooting & FAQ](#14-troubleshooting--faq)
15. [Keyboard Shortcuts](#15-keyboard-shortcuts)
16. [Accessibility Compliance & UDL Alignment](#16-accessibility-compliance)
- [Appendix A: Spoke Module Versions](#appendix-a-spoke-module-versions)
- [Appendix B: Quick Reference Card](#appendix-b-quick-reference-card-print-ready)

---

## ⚠️ CRITICAL DATA PRIVACY WARNING

This tool is designed strictly for **curriculum adaptation, lesson planning, and anonymized student engagement**.

- 🛑 **Do NOT input Personally Identifiable Information (PII)** such as student names, dates of birth, home addresses, or parent contact information.
- 🛑 **Do NOT input confidential student data**, including ID numbers, IEP/504 specifics, medical information, or behavioral records (unless utilizing the specialized, isolated *Clinical Reasoning Suite* which is architected for this purpose).
- 🛑 **Do NOT input sensitive district data** or internal administrative credentials.
- ✅ **Best Practice:** Always use pseudonyms (e.g., "Student A", "Group Blue", "The Thursday Cohort") when saving configurations. If pasting student work for grading, redact all identifying details first.
- ✅ **Recommended:** Log in with your district's Google Education account. While AlloFlow is designed with a privacy-first, FERPA-compatible architecture, always confirm that your use aligns with your district's acceptable use policy.

---

## 1. Introduction to AlloFlow

AlloFlow is an advanced, privacy-conscious generative AI platform created to help educators instantly differentiate curriculum materials. Powered by Google Gemini 2.5 Flash for text logic and Imagen for visual generation — as well as optional local open-source models — it transforms static, one-size-fits-all source text into a dynamic suite of interactive, gamified, and accessible learning resources.

### The Philosophy: Universal Design for Learning (UDL)

AlloFlow is built upon the principles of Universal Design for Learning (UDL), a framework to improve and optimize teaching and learning for all people based on scientific insights into how humans learn. Rather than retrofitting accommodations after a lesson fails, AlloFlow helps you design lessons that are accessible from the start:

- **Multiple Means of Representation** — Present the same core content in various formats (text, audio, diagrams, interactive games) to reach learners with different perceptual needs.
- **Multiple Means of Action & Expression** — Allow students to demonstrate understanding through diverse avenues (quizzes, sorting activities, writing scaffolds, oral fluency) rather than relying solely on standard written tests.
- **Multiple Means of Engagement** — Use gamification, interest-based analogies, and adventure simulations to tap into learners' intrinsic motivation.

### Key Architectural Capabilities (v1.0)

| Capability | Description |
| :--- | :--- |
| **Hub-and-Spoke Architecture** | Heavy modules (STEM Lab, Clinical Suite) load dynamically only when accessed, improving performance on older school devices. |
| **School Box (Local Docker)** | Full offline deployment via Docker Compose on district hardware. Connect to local models (Ollama/Phi-3.5) — zero cloud API costs, absolute data sovereignty. |
| **AlloBot Interactive Tours** | Embodied AI character with 30+ emotional states provides guided 5-step walkthroughs for new users. |
| **TeacherGate** | Educator tools (grading, clinical data, answer keys) are securely gated behind a teacher verification check. |
| **Teacher vs. Student Modes** | Teacher View = full creation suite. Student View = locked, distraction-free interface. |
| **Global Gamification Engine** | Students earn XP and level up across all tools. Streaks, badges, and Boss Battles drive sustained engagement. |
| **Live Collaboration** | Launch a Live Session to push screen state to all student devices in real-time (Teacher Paced or Student Paced). |
| **Multimodal Input** | Accepts PDFs, images, audio recordings, and video transcripts as source material. |
| **40+ Language Support** | Full UI translation, bilingual content views, and multilingual TTS via Kokoro (English) + Piper (40+ languages). |
| **Content Safety Monitor** | Real-time student input analysis for 7 concern categories with teacher notifications. |

---

## 2. Sourcing Content

**Location:** Left Panel → "Source Material" accordion

The Source Material is the ground truth for all AI generation. Provide this *first* before generating any resources.

### Input Methods

| Method | Formats / Action | Description |
| :--- | :--- | :--- |
| **📝 Direct Input** | Paste text | Copy from a digital textbook, article, or document. |
| **📁 File Upload** *(Max 20MB)* | PDF, PNG, JPG | OCR extracts text from scanned documents and images. |
| | MP3, MP4, WAV, WebM | Auto-generates a full transcript from audio or video files. Files over 20MB are automatically chunked and reassembled. |
| **🌐 URL Import** | Direct link | Strips ads/navigation and isolates the main article text. |
| | Find with AI | AI searches the web for a topic and imports high-quality educational content. |
| **✨ AI Generation** | Create from Scratch | Enter a topic, tone, and target standard — the AI writes the lesson. |

> 💡 **PRO TIP:** For YouTube videos, open the transcript panel on YouTube, copy the transcript, and paste it into Direct Input for the most accurate generation.

> 💡 **PRO TIP:** When using File Upload for a video lecture, AlloFlow extracts the audio track, transcribes it, and makes it searchable text — ideal for making video content accessible to deaf or hard-of-hearing students.

---

## 3. Configuration & Adaptation

**Location:** Left Panel (below the input area)

These settings act as a "lens" that the AI applies to all subsequent generation. Set these before generating your resource pack.

| Setting | What It Adapts |
| :--- | :--- |
| **Target Grade Level** | Vocabulary complexity, sentence structure, and conceptual depth (Kindergarten → Graduate Level). |
| **Output Languages** | Up to 4 languages simultaneously. Powers bilingual text views and translated glossaries for Multilingual Learners (MLLs). |
| **Student Interests** | Weaves themes (e.g., "Minecraft", "Soccer", "K-Pop") into analogies so abstract concepts become relatable. |
| **Text Format** | Standard Article · Dialogue Script · Social Media Thread · Podcast Script · Mock Advertisement |
| **Webb's DOK Target** | Level 1 (Recall) · Level 2 (Skills/Concepts) · Level 3 (Strategic Thinking) · Level 4 (Extended Thinking) |
| **Standards Alignment** | Input CCSS, NGSS, or CASEL codes; AI audits its output for alignment. Use "AI Match" to find codes automatically. |
| **Fullpack Generation** | Single button generates Glossary + Leveled Text + Scaffolds + Quizzes simultaneously with current settings. |

> 💡 **PRO TIP:** Set Text Format to *Dialogue Script* and Student Interest to *Minecraft* to turn a historical article into an engaging Reader's Theater script instantly.

---

## 4. Core Learning Tools

**Location:** Right panel toolbar — click icons to expand each tool.

### 🔍 Analyze Source & Alignment

Creates a diagnostic profile of your source text before adapting it.

- **Reading Level** — Flesch-Kincaid score with grade-level estimate and reasoning (e.g., "Vocabulary = 9th grade, sentence length = 6th grade").
- **Fact Verification** — AI uses Google Search to cross-reference specific claims, dates, and names in the text. Flags discrepancies and outdated information.
- **Auto-Correct** — If errors are found, "Fix Source Text" rewrites the input to correct inaccuracies while preserving tone and structure.
- **Grammar Check** — Flags passive voice overuse, confusing phrasing, or syntax issues.
- **Standards Audit** — Generates a "Pass/Revise" rating with specific evidence for CCSS/NGSS alignment after generation.

---

### 📖 Leveled Text (The Reader)

The core reading experience — source text rewritten to match your grade level and format settings.

**Interaction Modes:**
- **Read Aloud** — Click any sentence to hear it with high-quality TTS; the active sentence highlights for word tracking.
- **Define** — Click any word for an instant, grade-appropriate definition popup.
- **Phonics** — Click words to see IPA spelling, syllable division, and hear a slow, articulated audio pronunciation guide.
- **Cloze** — Key vocabulary becomes fill-in-the-blank. Students drag words from a generated word bank to fill them in.
- **Explain / Revise** — Highlight any passage to get an instant simplification or specific explanation. Teachers use "Revise" to rewrite a paragraph in real-time.
- **Grammar Highlight** — Color-codes parts of speech: Nouns (Blue), Verbs (Red), Adjectives (Green).

**Special Features:**
- **Bilingual View** — Two synchronized columns (target language + English) for cross-linguistic reference.
- **Syntax Scramble** — Sentences are jumbled; students drag words into correct syntactic order. Excellent for grammar practice.
- **Compare Mode** — "Diff" visualizer shows exactly how text was simplified (red = removed, green = added), ensuring critical information wasn't lost.
- **RSVP Speed Reader** — Rapid Serial Visual Presentation mode for fluency practice.
- **Karaoke Highlighting** — Words highlight in sync with TTS playback.

---

### 🌍 Glossary & Games

Automated vocabulary support designed to pre-teach or reinforce key terms.

- **Tier 2/3 Identification** — Categorizes Academic (Tier 2: "analyze", "evaluate") vs. Domain-Specific (Tier 3: "photosynthesis", "mitosis") vocabulary.
- **Visual Icons** — Auto-generates vector-style icons for every term (dual coding for memory retention).
- **Nano Banana** — AI image editing tool found in the glossary edit menu. If a generated icon includes garbled text, "Remove Words" regenerates it clean.
- **Interactive Flashcards** — Flip between term/image and definition; includes audio button for pronunciation.
- **Bilingual Flashcards** — L1 ↔ L2 mode with pronunciation in both languages.

**Games Suite** (all generated instantly from the glossary):
| Game | Description |
| :--- | :--- |
| Memory Match | Flip-card game pairing terms with definitions or images. Smart Mode or Standard. |
| Word Search | Interactive or printable grid (12×12 to 20×20), multiple difficulty levels. |
| Crossword | AI generates clues (across/down). Students navigate with arrow keys. |
| Matching Worksheet | Digital or printable column-matching activity. |
| Bingo | Randomized bingo cards; definitions are the call-outs. |
| Scramble | Unscramble jumbled letters with a hint system. |

**PDF Export:** Print flashcards 4, 8, or 12 per page. **Edit Mode:** Customize any term or definition.

---

### 📐 Visual Organizer & Visual Support

**Visual Organizer** — Converts linear text into structured spatial diagrams:
- Types: Structured Outline, Flow Chart, Venn Diagram (Compare/Contrast), Cause & Effect, Problem/Solution.
- All text nodes are editable. Click "Regenerate" for a different organizational pattern.

**Visual Support** — Generates custom educational imagery via Imagen:
- Styles: Isometric · Pixel Art · Watercolor · Blueprint · Comic Book · 3D Render
- **Worksheet Mode** — Black & white line art with empty label boxes for printable handouts.
- **Refinement** — Natural language edits (e.g., "Make the background blue", "Remove the labels"). Uses the Nano Banana engine.

---

### ☑️ Exit Ticket (Quiz)

Formative assessment generator.
- **Presentation Mode** — One question at a time, large high-contrast text, ideal for projecting to the whole class.
- **Review Games** — Jeopardy-style game board with teams, sound effects, and scoring. See also: Boss Battle mode (Section 10).
- **AI Fact Check** — AI verifies its own answer key and explains why distractors are incorrect — catches hallucinations and helps teachers explain logic to students.
- **Question Types** — Multiple choice, true/false, free response. DOK level is applied based on Configuration settings.
- **QTI Export** — Direct import into Canvas or Schoology assessment engines.

---

### ⚔️ Adventure Mode & Persona Panel

**Adventure Mode** — "Choose Your Own Adventure" roleplaying engine where students play a character in the lesson context.

- **Mechanics** — Energy (health), XP (score), Inventory (collected items), Level, Gold.
- **Difficulty Levels** — Easy · Normal · Hard · Legendary.
- **Action Types** — Multiple choice branching paths; Free Text input (students type their own actions); Chance Mode (random encounters with probability events).
- **Dynamic Scenes** — Imagen generates a new, context-aware illustration for every story turn.
- **Art Styles** — Cartoon · Anime · Realistic · Watercolor · Pixel Art · Comic Book.
- **Consistent Characters** — Lock character appearance for visual continuity across a session.
- **Social Story Mode** — Switch Adventure into a structured social narrative for SEL/special education contexts.
- **Storybook Export** — Compiles the student's unique journey (text + images) into a printable narrative PDF.
- **Role Selection** — Students choose: Adventurer, Mage, Rogue, Paladin, and more.
- **Save & Resume** — Adventure state is fully persisted; students can continue across sessions.

**Persona Panel** — Single or multi-character conversational simulations.
- Students chat with historical figures, scientists, fictional characters, or fictionalized concepts.
- Dynamic Rapport System reacts to student empathy and conversational choices.
- Supports Socratic Tutor mode (guided questioning rather than direct answers).

---

### 🕰️ Sequence Generator (Timeline Sort)

Extracts chronological events or process steps from the text.
- **Sequencer Game** — Events are shuffled; students drag and drop them into correct order.
- Great for history timelines and scientific processes.
- **Keyboard:** Use Up/Down arrow buttons (Tab to focus, Enter to activate).

---

### ⚖️ Concept Sort

Categorization activity generator.
- **Game** — Creates sorting buckets based on categories in the text (e.g., "Biotic vs. Abiotic"). Students drag items into the correct bucket.
- **Visual Support** — For lower grades, auto-generates icons for sorting items so pre-readers can sort by image.
- **Interactive Flashcards** — Converts the concept set into a full flashcard and quiz system.
- **Concept Map** — Generates a connected node-based concept map with editable relationships.

---

### 📝 Writing Scaffolds, Brainstorming & Outlines

- **Sentence Frames** — Sentence starters ("One reason for this is...") and paragraph frames with fill-in-the-blanks to guide student writing.
- **Rubric Generator** — Custom grading rubric based on the writing task and grade level.
- **Auto-Grader** — Paste student work for instant AI feedback against the rubric (highlights "Glows" and "Grows").
- **Brainstorm** — Quickly generate structured creative activity ideas or background knowledge starters.
- **Outline** — Generates structured lesson outlines from source material.
- **Multi-Chunk Writing** — Extended multi-section writing scaffold for longer compositions.

---

### 📋 Lesson Plan

Synthesizes all currently generated resources (text, quiz, visuals, activities) into a cohesive, standard-aligned lesson plan script. Includes: Hook, Direct Instruction, I Do / We Do / You Do structure, Guided Practice, and Closure sections. SMART objectives are auto-generated.

---

### 🛡️ Standard Alignment Report

Audits generated resources against CCSS, NGSS, or other standards. Provides a "Pass/Revise" rating with specific evidence. Designed for administrator review or compliance documentation.

---

### 🖼️ Visual Panel (Comic / Diagram)

- Multi-panel image grid with freehand drawing, shape tools, and captions.
- AI-powered label suggestions.
- Challenge mode (fill-blank, visual matching, comparison).
- Student submission interface.
- Panel reordering via drag.

---

### 📊 FAQ Generator

Generates student-facing FAQ from source material. Auto-formats as accordion or printable sheet.

---

### 🧑‍🏫 Socratic Tutor

Enables guided discovery mode where AlloBot answers questions with questions rather than direct answers. Supports Dialectical and Maieutic questioning frameworks.

---

## 5. Word Sounds Studio

**Access:** Select the Speaker icon from the toolbar or vocabulary list. This is a full dedicated module for phonemic awareness and early literacy.

### Activity Types (8 Interactive Modes)

| Activity | What It Teaches |
| :--- | :--- |
| **Sound Counting** | Identify the number of phonemes in a word (Elkonin boxes) |
| **Find Sounds (Isolation)** | Identify first, middle, or last phonemes |
| **Blend Sounds** | Merge individual phonemes into words |
| **Break Apart (Segmentation)** | Segment words into individual phonemes using Elkonin boxes |
| **Rhyme Time** | Identify or generate rhyming words |
| **Sound Mapping** | Connect phonemes to graphemes (phonics-to-spelling bridge) |
| **Sight & Spell** | Orthography and spelling practice |
| **Word Families** | Match words by common rimes (-at, -ing, -ock) |

### Key Features

- **Word Selection** — Glossary-based, family-based, sight words, or custom word lists. AI generates word banks by topic.
- **Syllable Range** — Filter by 1–4 syllable count.
- **Adaptive Difficulty** — Easy / Medium / Hard / Auto (adjusts based on accuracy).
- **Grade Targets** — K–2 · 3–5 · Custom.
- **Phoneme Audio** — Isolated phoneme playback from a curated embedded voice library; teacher-controlled.
- **Bilingual Word Bank** — Full support for word pairs in the student's home language.
- **Mastery Tracking** — Phoneme confusion pattern detection; 6 Achievement Badges (First Sound, On Fire, Perfect 10, Rhyme Master, Blend Wizard, Daily Star).
- **Streak System** — Consecutive correct answers tracked for engagement.
- **Review Panel** — Teacher audit panel to review and correct AI-generated phonetic data; replace problematic words.
- **Letter Tracing** — Onscreen touchscreen/mouse guides for orthographic handwriting practice.

### Oral Reading Fluency (ORF) Integration

Launch the ORF assessment from Student Analytics to time student reading. The system calculates Words Per Minute (WPM), logs errors, and writes results directly to RTI records.

---

## 6. STEM Lab

**Access:** Click the abacus or microscope icon in the right panel. The STEM Lab loads dynamically and hosts **55 interactive browser-based simulations** spanning math, science, technology, arts, economics, and simulation.

### How to Use
1. Click the STEM Lab icon → select a domain category or browse all tools.
2. Use mouse or touch to manipulate elements.
3. Click **"Generate Drill"** within any tool to spin up related problem sets.
4. Each tool saves/restores state with the session automatically.

### All STEM Lab Tools by Category

#### 🔢 Math Fundamentals (10 tools)
| Tool | ID | Key Interactive Elements |
| :--- | :--- | :--- |
| Fraction Lab | `fractions` | Practice, Compare, Operations, Equivalents tabs + quiz |
| Area Model | `areamodel` | Distributive property, multi-digit multiplication, commutative property |
| Multiplication Table | `multtable` | Interactive 12×12 grid, Quick Quiz, Speed Run, streaks, adaptive difficulty |
| Number Line | `numberline` | Interactive markers, challenge modes, addition/subtraction |
| Math Manipulatives | `base10` | Base-10 blocks, abacus, slide rule for place value |
| Money Math | `moneyMath` | Coins, bills, making change, grocery store, currency exchange, budget, tips |
| Coordinate Grid | `coordinate` | Plot points, draw lines, calculate slope, rise/run labels |
| Angle Explorer | `protractor` | Interactive protractor; acute/right/obtuse/reflex classification |
| 3D Volume Explorer | `volume` | 3D cube building with volume and surface area calculation |
| 3D Geometry Sandbox | `geosandbox` | Shape explorer, volume/SA formulas, challenge mode, STL export |

#### 📐 Advanced Math (7 tools)
| Tool | ID | Key Interactive Elements |
| :--- | :--- | :--- |
| Function Grapher | `funcGrapher` | Quadratic, linear, trigonometric function visualization |
| Inequality Grapher | `inequality` | Number-line inequalities, notation, test-a-value quiz |
| Calculus Visualizer | `calculus` | Riemann sums, integration, derivative visualization |
| Algebra Solver | `algebraCAS` | Step-by-step CAS (Computer Algebra System) equation solving |
| Graphing Calculator | `graphCalc` | Multi-function graphing, intersection detection |
| Probability Explorer | `probability` | Coin flip, dice, card simulations; theoretical vs. experimental |
| Unit Converter | `unitConvert` | Length, mass, volume, temperature, speed across unit systems |

#### 🔬 Life Science & Biology (10 tools)
| Tool | ID | Key Interactive Elements |
| :--- | :--- | :--- |
| Cell Simulator | `cell` | Animal/plant cell; organelle identification, quiz mode, organism zoom |
| Human Anatomy | `anatomy` | Skeletal, muscular, circulatory, nervous systems; quiz mode |
| Brain Atlas | `brainAtlas` | 30+ brain structures; lateral/medial views; function descriptions |
| DNA Lab | `dna` | DNA structure, transcription, translation, inheritance patterns |
| Punnett Square | `punnett` | Genetics crosses, trait prediction, dominant/recessive patterns |
| Virtual Dissection | `dissection` | Interactive dissection specimens with labeled anatomy |
| Decomposer | `decomposer` | Nutrient cycle, decomposition stages, soil health |
| Companion Planting Lab | `companionPlanting` | Garden design, symbiotic plant relationships |
| Aquaculture & Ocean Lab | `aquarium` | Marine ecosystems, fish species, ocean chemistry |
| Ecosystem Simulator | `ecosystem` | Predator-prey (Lotka-Volterra) dynamics, population modeling |

#### 🌍 Earth & Space Science (7 tools)
| Tool | ID | Key Interactive Elements |
| :--- | :--- | :--- |
| Rocks & Minerals | `rocks` | Rock classification (igneous/sedimentary/metamorphic), mineral properties |
| Water Cycle | `waterCycle` | Interactive cycle with Journey Mode (follow a single water molecule) |
| Rock Cycle | `rockCycle` | Rock transformation processes, pressure/heat/erosion |
| Plate Tectonics | `plateTectonics` | Tectonic plates, earthquakes, volcanoes, continental drift |
| Solar System | `solarSystem` | Planetary facts, orbits, comparative sizes |
| Universe Timelapse | `universe` | Big Bang to present; cosmic scale visualization |
| Galaxy Explorer | `galaxy` | 3D galaxy navigation, star classification, nebulae |

#### ⚡ Physics & Chemistry (7 tools)
| Tool | ID | Key Interactive Elements |
| :--- | :--- | :--- |
| Wave Simulator | `wave` | Frequency, amplitude, interference patterns, sound/light/water |
| Physics Simulator | `physics` | Projectile motion, vector decomposition, energy bar, kinematics |
| Circuit Builder | `circuit` | Ohm's Law, series/parallel circuits, component simulation |
| Equation Balancer | `chemBalance` | Chemical equation balancing, stoichiometry |
| Molecule Builder | `molecule` | Atomic bonding, molecular geometry, formula derivation |
| Titration Lab | `titrationLab` | Virtual titration with live S-curve, indicator selection, pH calculation |
| Data Plotter | `dataPlot` | Scatter plots, trend lines, correlation, statistics |

#### 💻 Technology & Cybersecurity (2 tools)
| Tool | ID | Key Interactive Elements |
| :--- | :--- | :--- |
| Coding Playground | `codingPlayground` | Browser-based code editor and execution environment |
| Cyber Defense Lab | `cyberDefense` | Phishing detective, password strength forge, cipher playground |

#### 🎨 Creative, Design & Music (3 tools)
| Tool | ID | Key Interactive Elements |
| :--- | :--- | :--- |
| Architecture Studio | `archStudio` | 3D building simulator, structural analysis, STL & SVG blueprint export |
| Art & Design Studio | `artStudio` | Color theory, pixel art, symmetry drawing, color mixing |
| Music Synthesizer | `musicSynth` | Waveform selection, ADSR envelope, 8-step sequencer, piano keyboard, music quiz |

#### 💰 Social Studies & Economics (2 tools)
| Tool | ID | Key Interactive Elements |
| :--- | :--- | :--- |
| Economics Lab | `economicsLab` | Supply/demand, market simulation, personal finance concepts |
| Life Skills Lab | `lifeSkills` | Budgeting, job applications, civic processes, adulting simulations |

#### 🚀 Strategy & Simulation (2 tools)
| Tool | ID | Key Interactive Elements |
| :--- | :--- | :--- |
| Kepler Colony | `spaceColony` | Space colonization strategy game, resource management, survival |
| Behavior Shaping Lab | `behaviorLab` | Operant conditioning simulation, reinforcement schedules |

#### 📊 Data & Multi-Tool Hubs (3 tools)
| Tool | ID | Key Interactive Elements |
| :--- | :--- | :--- |
| Data Studio | `dataStudio` | Advanced data visualization, chart builder, statistical analysis |
| Geo Tools | `geo` | Interactive geometry exploration, angles, shapes, area |
| Creative Hub | `creative` | Cross-curricular creative projects and visual data tools |

---

## 7. Educator Tools Hub (TeacherGate-Gated)

> 🔐 All tools in this section require TeacherGate verification. Students cannot access these tools.

### 📊 Student Analytics & RTI Dashboard

**Access:** Educator Tools Hub → Student Analytics icon.

A comprehensive assessment and Response to Intervention (RTI) tracking system.

- **Automated RTI Tiering** — Classifies students into Tier 1 (On Track), Tier 2 (Strategic), or Tier 3 (Intensive) based on quiz averages, Word Sounds accuracy, engagement data, and fluency metrics.
- **Anomaly Flags** — Auto-detects "paste event" cheating, sudden score spikes, and severe engagement drop-offs.
- **Screener Session Management** — Queue students, launch probes, record results.
- **Probe Batteries by Grade:**
  - K: Segmentation, Blending, Phoneme Isolation
  - Grade 1: + Spelling, ORF
  - Grade 2: + Rhyming
  - Grades 3–5: Rhyming, Spelling, ORF
- **ORF Launch** — Time student reading directly from the dashboard.
- **Math Fluency Probe** — Configure operation, difficulty, and time limit; results auto-log.
- **Export** — CSV screening reports across all reading and math probes.
- **XP & Gamification Data** — Student points, level, badge history per session.

### 📈 Psychometric & CBM Probes

**Math Fluency Probes (CBM):**
- Grades K–8, grade-normed DCPM (Digits Correct Per Minute)
- Operations: Addition · Subtraction · Multiplication · Division · Mixed
- Difficulty: Single-digit (0–12) · Double-digit (10–99)
- Error Analysis: Operation-specific weakness, fact error detection, skip pattern analysis
- Benchmark Classification: At/Above (green) · Strategic/Approaching (yellow) · Intensive/Below (red)
- Sound feedback: correct (880 Hz), incorrect (220 Hz), warning at 5 sec (660 Hz)

**Literacy Probes:**
- Nonsense Word Fluency (NWF) — K–1
- Letter Naming Fluency (LNF) — Kindergarten
- Rapid Automatized Naming (RAN) — K–2 (measures processing speed and automaticity)
- Phonological Awareness battery (segmentation, blending, isolation, rhyming, spelling)

### 🩺 BehaviorLens (FBA / BIP Clinical Suite)

**Access:** Educator Tools Hub → Lens icon.
**Version:** 1.0.0 (Mar 2026) | Designed for BCBAs, Special Educators, and School Psychologists.

**Clinical Tools (12+ modules):**
| Module | Function |
| :--- | :--- |
| ABC Data Collection | Antecedent–Behavior–Consequence logging with Quick-Fill AI (type natural language → auto-structured) |
| Frequency Counter | Real-time behavior occurrence tracking |
| Interval Grid | Record behavior during specified time intervals (partial, whole, momentary) |
| Function Analysis | Determine behavioral motivation: Attention · Escape · Tangible · Sensory |
| Scatterplot Analysis | Time pattern finder to identify when behaviors cluster |
| IOA Calculator | Inter-observer agreement (5 methods: block-by-block, exact, point-by-point, scored interval, unscored interval) |
| Preference Assessment | MSWO (Multiple Stimulus Without Replacement), Paired, Free Operant |
| Replacement Behavior Planner | Self-regulation strategy builder |
| Token Board | Positive behavior tracking with customizable tokens |
| De-escalation Toolkit | Calming and co-regulation strategies |
| FCT Template | Functional Communication Training planner |
| Reinforcer Assessment | Preference and motivation finder |
| Behavior Contract | Student–Teacher agreement builder |
| SMART Goal Generator | Observable, measurable behavioral goal creation |
| Cumulative Progress View | Longitudinal data visualization with effect sizes (Tau-U, NAP, PND) |
| Task Analysis | Hierarchical task chain builder |
| DRO Protocol | Differential Reinforcement of Other Behavior templates |
| Restorative Questions | Context-specific restorative conversation prompts (auto-generated from the logged A-B-C) |

**Key Design Principles:**
- Dual-label terminology throughout (clinical ABA terms + affirming person-first language)
- Function color coding: Attention (blue) · Escape (yellow) · Tangible (green) · Sensory (purple)
- Restorative language guidelines embedded — prevents punitive framing
- Mobile-optimized for iPad/phone data collection (44px minimum touch targets)
- Affirmative Glossary: Tooltip system translating clinical jargon (e.g., "Extinction" → "Planned Non-Reinforcement")

**Using BehaviorLens (Step-by-Step):**
1. Unlock via TeacherGate → select the Lens icon.
2. Use **Quick-Fill AI**: type a natural language observation ("Student ripped up worksheet when asked to transition") → AI auto-parses it into structured A-B-C with function hypothesis.
3. Log data using Interval Grid, Frequency Counter, or Duration tracking.
4. Use the IOA Calculator (5 methods) for inter-observer agreement.
5. Launch **Preference Assessment** (MSWO, Paired, or Free Operant).
6. Click **Visualize** → Cumulative Records, Scatterplots, Effect Sizes.
7. Access **Interventions** tab → DRO protocols, Token Economies, Behavior Contracts.
8. Generate **Restorative Questions** to de-escalate using strengths-based language.

### 📑 Report Writer Wizard

**Access:** Educator Tools Hub → Report Writer.
**Designed for:** School Psychologists, SLPs, and Special Educators.

**Supported Assessments (15+):**
WISC-V · WIAT-4 · BASC-3 · Vineland-3 · BRIEF-2 · Conners-4 · WJ-IV · KABC-II · DAS-II · CELF-5 · KTEA-3 · SRS-2 · GARS-3 · BOT-2 · Custom Assessment

**Score Classification System:**
| Range | Classification |
| :--- | :--- |
| 130+ | Very Superior |
| 120–129 | Superior |
| 110–119 | High Average |
| 90–109 | Average |
| 80–89 | Low Average |
| 70–79 | Borderline |
| 0–69 | Extremely Low |

**Using the Report Writer (Step-by-Step):**
1. Launch from the Educator Tools Hub.
2. **10-Step Wizard:** Guides through standard scores, observational notes, and background history.
3. **Fact-Chunk Pipeline:** When interpreting scores, an immutable pipeline scrubs PII and strictly verifies facts to prevent hallucination or statistical misinterpretation.
4. **Developmental Norms Database:** Age-specific benchmarks for attention span, tantrum frequency, social play stages, and language vocabulary are embedded.
5. **Score Interpretation Guides:** Key pattern recognition, T-score vs. standard score classification, ability-achievement discrepancy analysis.
6. **Draft Report:** AI synthesizes data into narrative sections (Background History, Score Interpretation, Recommendations).
7. **Export & Translate:** One-click export of a "Technical" version (for district records) and a simplified "Parent" version, auto-translated into the family's native language.

### 🎨 Symbol Studio (AAC & Visual Supports)

**Access:** Educator Tools Hub → Symbol Studio.
**Version:** 2.0.0 (Mar 2026) | For SLPs, Special Educators, and AAC users.

**Tabs:**
| Tab | Function |
| :--- | :--- |
| Symbols Gallery | Generate AI PCS-style symbols with custom styles (Flat Vector, Line Art, Cartoon, Watercolor, Bold Comic) |
| Board Builder | Create custom communication boards with drag-drop layout; color-coded by grammar category |
| Visual Schedule | Sequence daily activities with visual supports for routine comprehension |
| Social Stories | Generate personalized narrative supports for social situations |
| Quick Boards | Pre-built vocabulary boards for immediate use |

**Quick Boards (6 templates, 12 words each):**
- Core Vocabulary, Feelings, Classroom, Mealtime, Playground, Morning Routine

**Social Story Templates (10):**
Waiting My Turn · Feeling Angry · Making Friends · Doctor Visit · Haircut · Schedule Changes · Lunchtime · Asking for Help · Sharing & Turns · New School

**Key Capabilities:**
- AI image generation (Imagen) with 5 style options
- Color-coded vocabulary by grammar: Nouns (yellow) · Verbs (green) · Adjectives (blue) · Other (gray)
- Up to 8 student profiles
- Print-ready export with visual supports
- Board personalization with student-specific vocabulary

---

## 8. Live Session & Engagement Modes

### 📡 Live Session (Classroom Sync)

1. **Teacher:** Click "Start Live Class" → system generates a unique 4-character code.
2. **Students:** Click "Join Class" → enter code → their view syncs with the teacher's screen.

**Modes:**
- **Teacher Paced** — Teacher controls navigation; all student screens mirror the teacher. Ideal for direct instruction and whole-class review.
- **Student Paced** — Students navigate freely while the teacher monitors connection status. Ideal for centers and independent practice.

**Group Assignment:** Assign students to differentiated groups and push different resources to each group simultaneously (Live Differentiation).

### 🎮 Boss Battle Mode

A gamified quiz where the whole class battles a boss character together.
- Students answer questions to deal "damage" to the boss.
- Boss health bar depletes with correct answers; builds back with incorrect answers.
- Teams compete with scorekeeping and sound effects.
- Integrated with the Exit Ticket question pool.

### 🃏 Team Showdown & Democracy Mode

- **Team Showdown** — Real-time competitive quiz with team leaderboard.
- **Democracy Mode** — Class votes on an answer; majority response is submitted. Builds consensus skills.
- **Live Pulse** — Real-time sentiment/comprehension check (thumbs up/down, emoji reactions).

### 🔐 Escape Room Mode

- **Student View** — Puzzle challenge overlay with timed countdown.
- **Teacher View** — Hint distribution controls and escape tracking.
- Teams coordinate to solve challenges; celebration animation on escape.

---

## 9. Accessibility Features

AlloFlow complies with WCAG 2.1 AA and prioritizes Universal Design for Learning.

| Feature | Function | How to Enable |
| :--- | :--- | :--- |
| **Focus Mode** | Strips UI panels for distraction-free full-screen reading | Reader Toolbar → Maximize |
| **Bionic Reading** | Bolds initial letters to guide eye and aid decoding (ADHD/Dyslexia) | Settings → Eye icon |
| **Dyslexia Font** | Applies OpenDyslexic, Lexend, or Atkinson Hyperlegible globally | Text Settings → Font toggle |
| **Reading Ruler** | Mouse-following horizontal bar to isolate individual lines | Reader Toolbar → ScanLine icon |
| **Color Overlays** | Blue, Peach, or Yellow tints for Irlen syndrome support | Settings → Palette icon |
| **High Contrast Mode** | Dark background with high-contrast text | Theme Settings |
| **Dark Mode** | Full dark theme | Theme Settings |
| **Voice Dictation** | Speech-to-text for all input fields (supports dysgraphia, motor challenges) | Mic icon on input fields |
| **Font Scaling** | Global text size adjustment | Text Settings |
| **Line Height / Spacing** | Adjust line height and letter spacing | Text Settings |
| **Motion Reduction** | Reduces animations for vestibular sensitivity | Settings |
| **AlloBot Hide** | Toggle the AI companion off | Settings → AlloBot |

### Text-to-Speech Architecture

> 🛡️ Both TTS engines run *entirely inside the local browser* — audio data is never transmitted to the cloud.

- **Kokoro TTS** — Ultra-high quality English voices (30+ natural voices); primary engine.
- **Piper TTS** — 40+ language multilingual fallback; activates automatically if Kokoro experiences memory pressure.
- **Gemini TTS / Edge TTS** — Cloud TTS options for non-Canvas deployments.
- Voice preference is persisted across sessions.

### Supported Languages (40+)

English, Spanish, French, German, Portuguese, Mandarin, Arabic, Vietnamese, Russian, Japanese, Italian, Korean, Hindi, Dutch, Polish, Indonesian, Turkish, Hebrew, Swedish, Danish, Norwegian, Finnish, Greek, Thai, Czech, Hungarian, Romanian, Ukrainian, Cantonese, Tagalog/Filipino, Bengali, Urdu, Malay, Swahili, Bulgarian, Croatian, Serbian, Slovak, Persian/Farsi, Tamil, Amharic, Afrikaans, Kurdish, and more.

**RTL language support** (auto-detected): Arabic · Hebrew · Persian · Urdu · Kurdish · Pashto · Yiddish

---

## 10. AlloBot (AI Companion)

AlloBot is an embodied AI tutor that lives in the interface and helps both teachers and students navigate AlloFlow.

**Capabilities:**
- **30+ Emotional States** — Happy, confused, thinking, encouraging, celebrating, and more.
- **Viseme Lip-Sync** — Accurate mouth animations synchronized to speech.
- **Dynamic Eye Movement** — Eyes track based on context and attention.
- **Onboarding Tours** — 5-step guided walkthroughs for every major feature.
- **"Show Me" Navigation** — Click a feature name; AlloBot flies to and highlights it.
- **Drag to Reposition** — Drag AlloBot anywhere on screen; releases with inertia physics.
- **Help Mode** — Enables contextual tooltips that appear on hover over any interface element.
- **Particle Effects** — Burst and poof reactions for celebrations and transitions.

> 💡 AlloBot auto-disables after you complete the tutorial or reach Level 3 to prevent distraction. Re-enable via Settings → Reset Onboarding.

### Content Safety Monitor

Real-time analysis of student text input for 7 concern categories:
1. Self-harm indicators
2. Harm to others
3. Bullying or harassment
4. Inappropriate language
5. Concerning emotional content
6. Off-task gaming/social content
7. Gibberish / non-genuine attempts

Teacher receives a notification when a flag is triggered. Severity levels are assigned per category.

---

## 11. Export, Sharing & Data Management

### Export Formats

| Format | Contents | Use Case |
| :--- | :--- | :--- |
| **HTML Pack** | Full interactive lesson (TTS, games, all tools) in a single offline `.html` file | Students with limited home internet; archiving |
| **PDF** | Clean, high-contrast printable document (text, glossary, static quizzes) | Handouts |
| **PowerPoint (.pptx)** | Slides for quizzes, visuals, and organizers | Classroom presentation |
| **IMS Package (.zip)** | Canvas, Blackboard, Moodle-compatible bundle | LMS upload |
| **QTI Export** | Quiz in QTI format for Canvas/Schoology graded assessment | Auto-graded assessments |
| **JSON** | Full workspace state (settings, history, generated content) | Save/resume; share with co-teachers |
| **Storybook PDF** | Adventure session compiled into illustrated narrative | Student memento |

### Data Management

- **Student Profiles** — Save preset configurations (grade, language, interests) as JSON; load in one click for new content.
- **Unit Folders** — Organize resources by unit (e.g., "Civil War Unit", "Fractions Unit").
- **Project Save** — Full workspace state to JSON; resume later.
- **Draft Recovery** — Auto-saves input text to localStorage to prevent loss on browser close.
- **Cloud Sync** — Optional Firebase sync for cross-device session access.
- **IndexedDB** — Adventure images stored locally in browser for offline access.
- **LZ-String Compression** — All localStorage data is compressed for storage efficiency.

---

## 12. Pedagogical Workflows in Practice

### 🎭 Workflow A: General Education Teacher
**Goal:** Differentiate a dense historical text for a 4th-grade inclusive classroom with ELLs and students with ADHD.

1. **Source** — Paste the historical document into Direct Input.
2. **Configure** — Grade: 4th. Language: Spanish (bilingual view). Format: Dialogue Script. Interest: Minecraft.
3. **Generate** — Click Fullpack. The article becomes a Minecraft-analogized Reader's Theater script with synchronized English/Spanish columns.
4. **Engage** — Launch Live Session so students follow on Chromebooks; use Scramble Game as an interactive exit ticket.

---

### 📋 Workflow B: Special Educator / BCBA
**Goal:** Document and intervene upon a behavioral incident for a student with an IEP.

1. **Log Data Fast** — Open BehaviorLens. Use Quick-Fill AI: *"Student ripped up their math worksheet when asked to transition because they wanted to keep playing on the iPad."*
2. **Auto-Structure ABCs** — AI parses into: Antecedent (transition demand) · Behavior (property destruction) · Consequence (task avoidance/access to tangible).
3. **Intervene** — Interventions tab → DRO protocol targeting smooth transitions + Token Economy board.
4. **Restore** — Read AI-generated Restorative Questions to de-escalate using affirming, strengths-based language.

---

### 🧠 Workflow C: School Psychologist
**Goal:** Write a comprehensive Psychoeducational Evaluation Report synthesizing multiple standardized test scores.

1. **Launch Wizard** — Educator Tools Hub → Report Writer.
2. **Input Safely** — 10-step wizard → WISC-V and WIAT-4 scores. Fact-Chunk pipeline scrubs PII and verifies statistics automatically.
3. **Synthesize** — AI drafts Background History and Score Interpretation (standard deviations and percentiles in clear, jargon-free narrative).
4. **Export** — "Technical" version for district records + simplified "Parent" version auto-translated into the family's native language.

---

### 💻 Workflow D: IT Administrator / District Tech Coach
**Goal:** Deploy AlloFlow on district hardware for complete offline operation.

See Section 13: School IT Administration.

---

## 13. School IT Administration (The "School Box")

AlloFlow can be deployed entirely on district hardware — no cloud AI APIs required.

### Hardware Requirements
- Dedicated PC: 32GB+ RAM, NVIDIA RTX 3090/4090 GPU (approx. $2,500).
- Connected to the school's intranet.

### Docker Compose Pipeline

One command (`docker-compose up -d`) spins up 7 interconnected microservices:

| Service | Function | Default Port |
| :--- | :--- | :--- |
| PocketBase | Local database (replaces Firebase Firestore) | 8090 |
| Ollama | LLM text generation (Phi-3.5, Llama 3.1, etc.) | 11434 |
| Flux | Local image generation (replaces Imagen) | 7860 |
| Edge TTS | Text-to-speech (replaces Kokoro for some deployments) | 5001 |
| Piper | Multi-lingual TTS fallback | 5500 |
| SearXNG | Local web search for fact verification | 8888 |
| Nginx | Reverse proxy and SSL termination | 80 / 443 |

### Environment Configuration

Copy `.env.example` to `.env` and set:
```
WEB_PORT=3000
OLLAMA_PORT=11434
OLLAMA_MODEL=phi3.5
TTS_PORT=5002
# GOOGLE_API_KEY=your_key_here   (optional Gemini fallback)
```

### FERPA Compliance

Because the School Box is physically disconnected from external APIs (Google, OpenAI), strict FERPA and COPPA compliance is architecturally guaranteed. No student PII can leave the building's firewall.

---

## 14. Troubleshooting & FAQ

**Q: My Live Session keeps dropping or freezing.**
A: Ensure teacher and student devices are on the same local network and that your school's content filter isn't blocking WebSocket (WSS) connections. End the session and generate a new 4-character code.

**Q: AI text generation is spinning or failing.**
A: Check internet connection (cloud version). Try Shift + Refresh to force a hard cache clear. For School Box, verify the Ollama container hasn't timed out (`docker ps`).

**Q: AlloBot stopped appearing.**
A: AlloBot auto-disables after you complete the tutorial or reach Level 3. Re-enable via Settings → Reset Onboarding.

**Q: TTS voice changed suddenly.**
A: AlloFlow uses a dual-engine TTS architecture. If Kokoro experiences memory pressure, the system seamlessly falls back to Piper. Lock the voice manually in Settings.

**Q: Is Firebase FERPA-compliant?**
A: Yes — for most districts. If your district uses Google Workspace for Education, the Cloud Data Processing Addendum (CDPA) is already incorporated, covering Firebase. AlloFlow uses Firebase *Hosting only* (static files) — no student data is written to Google's servers.

**Q: Do I need a Data Processing Agreement (DPA)?**

| Deployment | DPA Required? | Notes |
| :--- | :--- | :--- |
| Gemini Canvas | ✅ Already covered | Google Workspace agreement acts as the DPA. |
| Firebase Hosting | ✅ Already covered (most districts) | CDPA in Workspace agreement covers GCP. Zero student data touches Google servers. |
| School Box (Docker) | ✅ No DPA needed | All data on local hardware. Gold standard for FERPA. |

**Q: Audio isn't playing.**
A: Ensure the browser tab is not muted. The Web Audio API requires a user gesture (click or keypress) to start. Click anywhere on the page first.

**Q: I can't Tab out of a game.**
A: Press **Esc** to close the game modal and return to the main interface.

---

## 15. Keyboard Shortcuts

### General Navigation

| Key | Action |
| :--- | :--- |
| Tab | Move focus to the next interactive element |
| Shift + Tab | Move focus to the previous element |
| Enter | Activate focused button or link |
| Space | Toggle checkbox or activate button |
| Esc | Close any open modal |
| Ctrl + S | Save session |
| Ctrl + P | Print |
| Ctrl + Shift + S | Download as HTML bundle |
| ? | Open Help Mode |

### Game Controls

**Memory Match:**
- Arrow Keys or Tab → navigate cards
- Enter or Space → flip card
- Screen reader announces match/mismatch

**Matching Worksheet:**
- Tab → left-side term dot
- Enter → select it (pulses yellow)
- Tab → correct definition dot (right side)
- Enter → confirm connection

**Concept Sort:**
- Tab → navigate "Unsorted Items" deck
- Enter → select item (gold border)
- Arrow Keys / Tab → select destination category
- Enter → confirm sort

**Crossword Puzzle:**
- Arrow Keys → move between grid cells
- Space or Enter on a cell → toggle direction (Across / Down)
- A–Z → type letters (cursor auto-advances)
- Backspace → delete letter and move back

**Timeline Sequencer:**
- Tab → focus on Up/Down arrow buttons
- Enter → move item

**Reader Tools:**
- Enter on a sentence in Leveled Text → start TTS from that point
- Enter on a word in Define Mode → open definition popup
- Esc → close definition popup

---

## 16. Accessibility Compliance

AlloFlow complies with WCAG 2.1 AA standards for keyboard navigation and screen reader support. All interactive elements — including games — are fully operable without a mouse.

### UDL Alignment Matrix

| UDL Principle | AlloFlow Features |
| :--- | :--- |
| **Recruiting Interest** | Student Interest integration; Adventure Simulation autonomy; 5 text format styles |
| **Sustaining Effort** | XP gamification; Boss Battle; Escape Room; adjustable difficulty |
| **Self-Regulation** | Socratic Tutor; Restorative Questions; Social Story Mode |
| **Perception** | TTS (40+ languages); Color Overlays; Bionic Reading; Visual Organizers |
| **Language & Symbols** | Glossary with icons; Bilingual views; Syntax Scramble; IPA phonics breakdown |
| **Comprehension** | Visual Organizers; Analysis tool (background knowledge); Fact Verification |
| **Expression** | Dictation; Writing Scaffolds; Alternative quiz formats; Free text Adventure responses |
| **Executive Function** | Lesson Plan; SMART Goals; Rubric Generator; Outline tool |

---

## Appendix A: Spoke Module Versions

| Module | Version | Last Updated |
| :--- | :--- | :--- |
| BehaviorLens | 1.0.0 | Mar 2026 |
| Report Writer | 1.0.0 | Mar 2026 |
| Symbol Studio | 2.0.0 | Mar 2026 |
| Word Sounds | 1.0.0 | Feb 2026 |
| Student Analytics | 1.0.0 | Jan 2026 |
| Math Fluency | 1.0.0 | Jan 2026 |

---

## Appendix B: Quick Reference Card (Print-Ready)

### For Teachers — 30 Seconds to Start
1. Paste your lesson text into the **Source Material** box (left panel).
2. Set Grade Level and any Output Languages.
3. Click **Fullpack** to generate everything at once.
4. Click **Start Live Class** to push to student devices.

### Core Tool Icons at a Glance
| Icon | Tool | Shortcut |
| :--- | :--- | :--- |
| 📖 Book | Leveled Text Reader | — |
| 🌍 Globe | Glossary & Games | — |
| 🔍 Search | Analyze Source | — |
| ⚔️ Sword | Adventure Mode | — |
| ☑️ Checkbox | Exit Ticket / Quiz | — |
| 🧮 Abacus | STEM Lab | — |
| 🗣️ Speaker | Word Sounds Studio | — |
| 📐 Ruler | Visual Organizer | — |
| 📋 Clipboard | Lesson Plan | — |
| 👁️ Lens | BehaviorLens (TeacherGate) | — |
| 📑 Report | Report Writer (TeacherGate) | — |
| 🎨 Symbol | Symbol Studio (TeacherGate) | — |

### Accessibility Quick Toggles
| Toggle | Location |
| :--- | :--- |
| Bionic Reading | Settings → Eye icon |
| Syllabification | Settings |
| Line Focus / Reading Ruler | Reader Toolbar |
| Color Overlay | Settings → Palette |
| OpenDyslexic Font | Text Settings → Font |
| Dark Mode | Theme Settings |
| Global Mute | Header → Speaker icon |
| AlloBot Show/Hide | Settings |

### Export Quick Reference
| Format | Use |
| :--- | :--- |
| HTML Bundle | Offline student access |
| PDF | Paper handouts |
| PPTX | Classroom slides |
| QTI | Canvas/Schoology quiz import |
| IMS Package | LMS upload (Canvas, Moodle) |
| JSON | Save, share, resume |

### Troubleshooting in 10 Seconds
- **Not loading?** → Shift + Refresh (hard cache clear)
- **Audio silent?** → Click anywhere first (browser gesture required)
- **Stuck in game?** → Press Esc
- **AlloBot gone?** → Settings → Reset Onboarding
- **Live Session dropped?** → End session + new code

---

*AlloFlow is free and open-source under AGPL v3. Repository: [github.com/Apomera/AlloFlow](https://github.com/Apomera/AlloFlow)*
*For deployment issues, consult DEPLOY_YOUR_OWN.md (Firebase) or docker/docker-compose.yml (School Box).*
