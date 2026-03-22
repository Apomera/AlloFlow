![AlloFlow Cover](./rainbow-book.jpg)

# AlloFlow (v1.0)
## Comprehensive User Manual & Pedagogical Guide

**Adaptive Levels, Layers, & Outputs ➔ Flexible Learning Options for Whole-Student Education**

*Copyright 2026, Aaron Pomeranz, PsyD*  
*Distributed with AGPL 3.0 (GNU Affero General Public License v3)*

---

## ⚠️ CRITICAL DATA PRIVACY WARNING
This tool is designed strictly for **curriculum adaptation, lesson planning, and anonymized student engagement**.

* 🛑 **Do NOT input Personally Identifiable Information (PII)** such as student names, dates of birth, home addresses, or parent contact information.
* 🛑 **Do NOT input confidential student data**, including ID numbers, IEP/504 specifics, medical information, or behavioral records (unless utilizing the specialized, isolated *Clinical Reasoning Suite*).
* 🛑 **Do NOT input sensitive district data** or internal administrative credentials.
* ✅ **Best Practice:** Always use pseudonyms (e.g., "Student A", "Group Blue", "The Thursday Cohort") or generic profiles when saving configurations. If pasting student work for grading, ensure all names and identifying details are redacted first.
* ✅ **Recommended:** Log in with your district’s Google Education account when utilizing AlloFlow to reduce the risk of inadvertent privacy breaches. While AlloFlow is designed with a privacy-first FERPA compatible architecture, it is always best to contact your district administrator and IT to ensure that use of AlloFlow aligns with your district’s acceptable use policy.

---

## 1. Introduction to AlloFlow

AlloFlow is an advanced, privacy-conscious generative AI platform created to help educators instantly differentiate curriculum materials. Powered by Google Gemini 2.5 Flash for text logic and Imagen for visual generation—as well as optional local Open-Source models—it transforms static, one-size-fits-all source text into a dynamic suite of interactive, gamified, and accessible learning resources.

**Version 1.0 brings major architectural enhancements**, including a Hub-and-Spoke modular architecture, dedicated Clinical tools, advanced STEM lab simulations, and interactive onboarding tours.

### The Philosophy: Universal Design for Learning (UDL)
AlloFlow is built upon the principles of Universal Design for Learning (UDL), a framework to improve and optimize teaching and learning for all people based on scientific insights into how humans learn. Instead of retrofitting accommodations for individual students after a lesson fails, AlloFlow helps you design lessons that are accessible from the start by providing:

* **Multiple Means of Representation**: Presenting the same core content in various formats—text, audio, diagrams, and interactive games—to ensure that learners perceive and comprehend information differently (e.g., a visual learner versus a text-based learner).
* **Multiple Means of Action & Expression**: Allowing students to demonstrate understanding through diverse avenues, such as taking quizzes, participating in sorting activities, or using creative writing scaffolds, rather than relying solely on standard written tests.
* **Multiple Means of Engagement**: Using gamification, interest-based analogies, and adventure simulations to tap into learners' interests, offer appropriate challenges, and increase motivation.

### Key Architectural & Core Capabilities

* ⚙️ **Hub-and-Spoke Architecture**: AlloFlow v1.0 uses a highly efficient modular loading system. Heavy tools like the STEM Lab or the Clinical Reasoning Suite only load when accessed, significantly improving performance on older school devices.
* 📦 **Open-Source Local Models (The "School Box")**: Through the new `aiProvider.js` integration, schools can seamlessly deploy AlloFlow to their own Firebase instances in minutes. By connecting to local AI models like Ollama (e.g., Phi-3.5) running on school network hardware, districts can completely disconnect from cloud AI providers. This ensures absolute data sovereignty, zero ongoing API costs, and strict FERPA compliance.
* 🤖 **Allobot Interactive Tours**: A guided, embodied AI character (Allobot) provides immersive 5-step walkthroughs for new users, ensuring educators can quickly learn the platform's advanced tools.
  ![Allobot Assistant](./allobot.png)
* 🔐 **Educator Tools Hub & TeacherGate**: Professional utilities are securely gated behind a Teacher verification check (TeacherGate), ensuring students cannot access grading rubrics, clinical tools, or sensitive answer keys.
* 👥 **Teacher vs. Student Modes**:
   * **Teacher View**: A powerful creation suite for generating, editing, and refining resources.
   * **Student View**: A locked, distraction-free interface focused purely on consumption and interaction.
* 🎮 **Global Gamification Engine**: The entire platform functions as a game. Students earn XP (Experience Points) and Level Up by completing reading tasks, quizzes, and games across all tools. 
* 📡 **Live Collaboration (Classroom Sync)**: Teachers can launch a "Live Session" to push their screen state to student devices in real-time (Teacher Paced or Student Paced modes).
* 🎤 **Multimodal Input**: The system accepts diverse inputs—upload PDFs, images, audio recordings, or video transcripts—and standardizes them into text for generation.

---

## 2. Sourcing Content
**Location:** Left Panel ("Source Material" Accordion)

The "Source Material" is the ground truth for all AI generation. You *must* provide this first before generating any other resources.

### How to Use Inputs

| Input Method | Supported Formats / Action | Description |
| :--- | :--- | :--- |
| **📝 Direct Input** | Copy & Paste | Paste text directly from a digital textbook, news article, or document. |
| **📁 File Upload** *(Max 20MB)* | Images (PNG, JPG) & PDF | The system uses strict OCR to scan visual documents and extract readable text. |
| | Audio/Video (MP3, MP4, WAV) | Processes media and automatically generates a comprehensive text transcript. |
| **🌐 URL Import** | Direct Link | The system acts as a secure proxy to scrape and isolate the main educational text. |
| | Find with AI | The AI searches the web for a specific topic and imports safe, high-quality content. |
| **✨ AI Generation** | "Create from Scratch" | Click the Sparkles to have the AI write the lesson based on a Topic, Tone, and Standard. |

> 💡 **PRO TIP:** If you are pasting a YouTube link, navigate to the YouTube video, open the transcript panel, and paste the transcript directly into the "Direct Input" field for the most accurate generation.

---

## 3. Configuration & Adaptation
**Location:** Left Panel (Below Input)

These settings control the "lens" through which the AI processes your source material. 

| Configuration Setting | What it Adapts |
| :--- | :--- |
| **Target Grade Level** | Adjusts reading complexity ranging from Kindergarten to Graduate Level. |
| **Output Languages** | Select up to 4 distinct languages simultaneously for translated Glossaries and Side-by-Side bilingual interactive text views. |
| **Student Interests** | The AI will weave custom interests (e.g., "Minecraft", "Dinosaurs") seamlessly into analogies and explanations. |
| **Text Format** | Transform the output structural style (Standard Article, Dialogue Script, Social Media Thread, Podcast Script, or Mock Advertisement). |
| **Webb's DOK Target** | Explicitly force the Depth of Knowledge (DOK) rigor level for all generated questions. |
| **Standards Alignment** | Input specific regulatory standards (CCSS, NGSS, CASEL) for the AI to align against. |
| **Fullpack Generation** | Click a single button to generate the Glossary, Leveled Text, Scaffolds, and Quizzes all at once using your current configurations. |

> 💡 **PRO TIP:** Try setting the "Text Format" to *Dialogue Script* and the "Student Interest" to *Minecraft* to instantly turn a boring historical article into an engaging script the students can perform!

---

## 4. The Scaffolding & Learning Tools
**Location:** Right Panel Toolbar *(Click icons to expand tools)*

---
### 🔍 Analyze Source & Content Alignment
Creates a diagnostic profile of your source text, providing Flesch-Kincaid reading levels, Grammar checks, and Verification (Fact-Checking) against the web. The Alignment Tool audits generated resources against CCSS/NGSS standards, providing "Pass/Revise" ratings and specific rigor evidence.

---
### 📖 Leveled Text (The Reader)
The core reading experience, rewritten to match target grade/format settings.
* **Interaction Modes**: Read Aloud (with word tracking), Define, Phonics Breakdown, Cloze (fill-in-the-blanks), Syntax Scramble, and Explain/Revise for highlighting sections.
* **Bilingual View**: Synchronized multi-lingual columns.
* **Compare Mode**: A "Diff" visualizer showing how text was simplified from the source.

---
### 🌍 Glossary & Games
Automated vocabulary support.
* **Tier 2/3 Identification**: Categorizes Academic vs. Domain-Specific words.
* **Games Suite**: Memory Match, Word Search, Crossword Puzzle, Matching Worksheet, Bingo, Scramble game.
* **Visual Icons & Nano Banana**: Auto-generates vector-style icons. The Nano Banana engine helps scrub garbled AI text from images.

---
### 🗣️ Word Sounds Studio & Phonological Awareness
A massive dedicated module focusing on foundational literacy and early reading skills.
* **Phonemic Awareness Suite**: Interactive auditory and visual drills spanning Phonics Tracking (Mapping), Syllable Segmentation, Phoneme Blending, Phoneme Isolation, Sound Counting, and Rhyming.
* **Multisensory Practice**: Includes an onscreen Letter Tracing interface for orthographic practice and instant audio playback of distinct phonemes from a curated embedded voice library.

---
### 📐 Visual Organizer & Visual Support
* **Organizers**: Flow Charts, Venn Diagrams (Concept Sort), Cause & Effect diagrams.
* **Visual Support Models**: Generates custom imagery using the Imagen model (Isometric, Pixel Art, Watercolor, etc.). Includes a "Worksheet Mode" for black & white printables.

---
### ☑️ Exit Ticket (Quiz) & Review Mode
Formative assessment generators.
* **Presentation & Review Games**: Jeopardy-style game boards for teams, featuring sound effects and scoring.
* **AI Fact Check**: The AI explains why specific distractors are incorrect to prevent hallucinations.

---
### ⚔️ Adventure Simulation & Persona Panels
* **Adventure Mode**: A "Choose Your Own Adventure" roleplaying engine with XP, Inventory, and dynamic scene generation based on free-text inputs.
* **Persona Panel**: Single or Multi-character conversational simulations allowing students to chat with historical figures, scientists, or fictionalized concepts interactively.

---
### 🧮 STEM Lab & Math Solver
Advanced browser-based simulations powered by the modular engine.
* **Tools**: Algebra Solver (step-by-step breakdowns), Anatomy Viewer, Dissection Lab, DNA Replication/Transcription, Periodic Table (with Bohr models), Galaxy & Star Simulator, Geography Maps, Probability Lab, Coding Playground, and Data Studio.
* **Practice Generation**: Instantly spin up similar problem sets for unlimited drill practice.

---
### 📝 Writing Scaffolds, Brainstorming & Outlines
* Generates sentence frames, paragraph structures, and customizable grading rubrics.
* **Outline & Brainstorm Tools**: Quickly generate structured lesson plan outlines or creative activity ideas.
* **Auto-Grader**: Instant AI feedback highlighting "Glows" and "Grows".

---

## 5. Professional Tiers: Educator Tools Hub & Clinical Suite
*Gated securely behind TeacherGate, these tools are for educators only.*

### 📊 Research Dashboard & Student Analytics
Comprehensive tracking of student progress via automated Response to Intervention (RTI) tiering.
* **Automated RTI Classification**: The system automatically classifies students into Tier 1 (On Track), Tier 2 (Strategic), or Tier 3 (Intensive) based on quiz averages, Word Sounds accuracy, engagement data, and fluency metrics.
* **Anomaly Flags**: The system automatically flags "paste event" cheating, sudden score spikes, and severe engagement drop-offs to alert educators.
* **Assessment Center Export**: Export detailed CSV screening reports across all foundational reading and math probes.

### 📈 Psychometric & Curriculum-Based Measurement (CBM) Probes
A comprehensive suite of diagnostic assessment tools to measure foundational student skills automatically.
* **Math Fluency Probes**: K-8 grade-normed DCPM (Digits Correct Per Minute) arithmetic drills for addition, subtraction, multiplication, and division. Features error analysis tracking.
* **Literacy Probes**: Standardized diagnostic reading assessments including K-1 Nonsense Word Fluency (NWF), Kindergarten Letter Naming Fluency (LNF), and K-2 Rapid Automatized Naming (RAN) to measure processing speed and automaticity.

### 🩺 Clinical Reasoning Suite (Report Writer & BehaviorLens)
An isolated, high-privacy module designed specifically for School Psychologists, SLPs, and Special Educators.
* **8-Step Report Wizard**: Guides the clinician through synthesizing assessment data into comprehensive, parent-friendly psychoeducational reports utilizing the Fact-Chunk Engine to minimize AI hallucinations through a Dual-Pass audit.
* **Tier 1 RAG Libraries**: Custom reference libraries embedded within the tool.
* **BehaviorLens (FBA/BIP Suite)**: A comprehensive behavioral observation toolkit featuring live ABC Data Collection (Antecedent-Behavior-Consequence), Interval tracking, and Frequency counters.
   * **Quick-Fill AI**: Allows educators to type natural language descriptions which are automatically parsed into structured ABC Data.
   * **Restorative Questions Generator**: Instantly creates context-specific restorative conversation questions tailored to the exact antecedent and consequence logged.
   * **Affirmative Glossary**: A specialized tooltip system containing dual labels and definitions for clinical ABA terms (e.g., translating "Extinction" to "Planned Non-Reinforcement") to enforce restorative, strengths-based language.

---

## 6. Accessibility Features
AlloFlow complies with WCAG 2.1 AA and prioritizes Universal Design for Learning.

| Feature | Functionality | Enable Via |
| :--- | :--- | :--- |
| **🔍 Focus Mode** | Strips away UI panels for distraction-free full-screen reading. | Reader Toolbar |
| **🅰️ Dyslexia Support** | Toggles OpenDyslexic font and Bionic Reading formatting. | Settings Panel |
| **📏 Reading Ruler** | Activates a mouse-following horizontal bar to isolate individual lines of text. | Reader Toolbar |
| **🎙️ Voice Dictation** | Speech-to-Text inputs are natively supported across all input fields. | Input Fields |
| **🎨 Color Overlays** | Implements Blue, Peach, or Yellow screen tints for Irlen syndrome support. | Settings Panel |

> ⚠️ **SECURITY & PRIVACY:** AlloFlow features a **Dual-Engine Offline Text-to-Speech (TTS) system**. Unlike standard Chrome extensions, both the **Kokoro TTS** (Ultra-high quality English) and **Piper TTS** (40+ language fallback) run *entirely* inside your local browser. Audio data is never transmitted to the cloud, ensuring absolute FERPA compliance for special education materials.

---

## 7. Export, Sharing & Data Management

**Outputs:**
* **HTML Pack**: Single, offline-capable `.html` file with all interactive tools embedded.
* **Accessible PDF & PowerPoint** Exports
* **IMS Package (.zip)** for Canvas, Blackboard, Moodle.
* **QTI Export** for direct quiz ingestion.

**Live Session sync** for Classroom collaboration.

**Data Management:** Save student JSON profiles, Unit Folders, Project Saves, and local Draft Recovery.

---

## 8. Deep-Dive: How to Use the Advanced Suites

Due to the massive feature footprint (over 1,000 interactive elements), this section provides step-by-step guidance on utilizing AlloFlow's most complex modules.

### 🔬 8.1 STEM Lab & Math Solver (550+ Simulations)
The STEM Lab loads dynamically to save memory. 
1. **Accessing the Lab:** Click the `abacus` or `microscope` icon in the right-hand panel.
2. **Choosing a Domain:** Select from over 40 distinct simulations, including Aquarium (30+ species), Anatomy (100+ organs), Neuroscience (30+ brain regions), Pharmacology (20+ neurotransmitters), Geology (30+ rocks), Galaxy, Drone, Chemistry, Physics, and the Coding Playground.
3. **Interacting:** Use your mouse or touch to manipulate elements (e.g., zoom into the Bohr model of an atom, or manipulate the drone simulator). 
4. **Generating Practice:** Click **"Generate Drill"** within any tool to instantly spin up endless, dynamically generated problem sets related to the current simulation state.

### 🗣️ 8.2 Word Sounds Studio & ORF Probes (13 Activity Types)
This module provides a complete phonemic awareness curriculum.
1. **Accessing Word Sounds:** Select the `Speaker` icon from the target vocabulary list or the main toolbar.
2. **Selecting an Activity:** Choose from 13 distinct interactive modes: Isolation, Blending, Segmentation, Counting, Rhyming, Sound Sort, Word Families, Missing Letter, Letter Tracing, Mapping, Orthography, Spelling Bee, and Word Scramble.
3. **Letter Tracing:** Use a touchscreen or mouse to follow the animated visual guides for orthographic handwriting practice.
4. **Oral Reading Fluency (ORF):** Launch the ORF assessment to time student reading. The system calculates Words-Per-Minute (WPM) and logs errors for Response to Intervention (RTI) records.

### 🩺 8.3 BehaviorLens Module (ABA & Clinical Data)
A comprehensive suite for Special Education teachers and BCBAs containing 18+ clinical tools and 310 data tracking configurations.
1. **Accessing BehaviorLens:** Unlock via TeacherGate and select the `Eye/Lens` icon.
2. **Data Collection:** Use the built-in sheets for Interval Recording, Frequency Counts, Duration, or Latency tracking. Use the **IOA Calculator** (5 distinct methods) for inter-observer agreement.
3. **Conducting Assessments:** Launch the Preference Assessment module to run MSWO (Multiple Stimulus Without Replacement), Paired, or Free Operant assessments. You can also generate hierarchical Task Analyses.
4. **Analyzing Data:** Click the **Visualize** tab to generate Cumulative Records, Scatterplots, and calculate quantitative Effect Sizes (Tau-U, NAP, PND).
5. **Clinical Interventions:** Access templates for DRO (Differential Reinforcement of Other Behavior), Token Economies, Behavior Contracts, SMART Goal generation, and Extinction/Stimulus control protocols.

### 📑 8.4 Report Writer Wizard
A secure tool designed for School Psychologists and evaluators.
1. **Initiate Wizard:** Launch from the Educator Tools Hub.
2. **The 10-Step Flow:** The wizard will guide you through 10 steps, asking for standard scores, observational notes, and background history.
3. **Fact-Chunk Pipeline:** When interpreting test scores, the AI uses an immutable "Fact-Chunk" pipeline that scrubs PII and strictly verifies facts to prevent hallucination.
4. **Demographic/Language Translation:** Automatically export the finalized report into multiple languages and adjust the reading level (Technical for clinicians, Simplified for parents).

---

## 9. Pedagogical Workflows In Practice

To demystify the massive feature set, here are three realistic "Day in the Life" workflows demonstrating how different educators utilize AlloFlow's tools in tandem.

### 🎭 Workflow A: The General Education Teacher
**Goal:** Differentiate a dense historical text for a 4th-grade inclusive classroom containing English Language Learners (ELLs) and students with ADHD.
1. **Source the Text:** Paste the historical document into the *Direct Input* box.
2. **Configure:** Set Target Grade to "4th Grade", Output Language to "Spanish" (for a bilingual view), Text Format to "Dialogue Script", and enter "Minecraft" in the *Student Interests* field.
3. **Generate:** Click the Fullpack generation button. The boring article is instantly converted into a play script where historical figures use Minecraft analogies to explain concepts, presented in a side-by-side English/Spanish interactive view.
4. **Engage:** Launch the *Live Session* so students can follow along on their Chromebooks, and use the *Scramble Game* as an interactive exit ticket.

### 📋 Workflow B: The Special Educator (BCBA/SpEd)
**Goal:** Document and intervene upon a sudden behavioral incident for a student with an IEP.
1. **Log Data Fast:** Open the secure *BehaviorLens* tool. Use the **Quick-Fill AI** to type a natural language log: *"Student ripped up their math worksheet when asked to transition because they wanted to keep playing on the iPad."*
2. **Auto-Structure ABCs:** The AI instantly parses this sentence into structured Antecedent (Demand to transition), Behavior (Property destruction), and Consequence (Task avoidance/Access to tangible) log.
3. **Intervene:** Using the *Interventions* tab, immediately generate a **DRO (Differential Reinforcement of Other Behavior)** protocol template targeting smooth transitions, and print a custom *Token Economy* board using the Visual Support tool.
4. **Restore:** Read off the AI-generated *Restorative Questions* to calmly de-escalate the student using affirming, strengths-based clinical language.

### 🧠 Workflow C: The School Psychologist
**Goal:** Write a comprehensive Psychoeducational Evaluation Report synthesizing multiple standardized test scores into parent-friendly language.
1. **Launch the Wizard:** Enter the *Educator Tools Hub* and launch the *Report Writer Suite*.
2. **Input Data Safely:** Use the 10-step wizard to input standard scores from the WISC-V and WIAT-4. The system’s **Fact-Chunk pipeline** automatically scrubs PII and strictly verifies facts to prevent any AI hallucination or statistical misinterpretations.
3. **Synthesize:** The AI drafts the Background History and Score Interpretation sections, translating complex standard deviations and percentiles into clear, jargon-free narrative summaries.
4. **Export & Translate:** With one click, export a "Technical" version for the district records, and an intentionally simplified "Parent" version translated into the family's native language.

---

## 10. School IT Administration (The "School Box")

AlloFlow is designed to be easily deployed by District IT teams on local hardware, ensuring 100% data sovereignty and zero recurring API costs.

### Setting Up the Offline Docker Architecture
Instead of relying on cloud LLM APIs, schools can utilize the `aiProvider.js` backend integration to route all 450+ interactive tools through local, open-source models (like Llama 3.1 or Phi-3.5) running on a mid-tier local workstation (approx. $2,500).

1. **Hardware Requirements:** A dedicated PC with at least 32GB RAM and an NVIDIA RTX 3090/4090 GPU connected to the school's intranet.
2. **The `docker-compose.yml` Pipeline:** AlloFlow uses a pre-configured Docker cluster that spins up three interconnected microservices with one command (`docker-compose up -d`):
   * **Node/React Frontend Container**: Hosts the AlloFlow UI and offline `.html` export engine.
   * **Ollama Inference Server**: Handles all text generation, report drafting, and BehaviorLens JSON parsing completely offline.
   * **Local TTS Proxy**: Handles audio generation caching so repeated auditory prompts don't hit the local processor twice.
3. **FERPA Compliance:** Because this system is physically disconnected from the broader internet and external APIs (like OpenAI or Google), strict FERPA and COPPA compliance is architecturally guaranteed. No student PII can ever leave the building's firewall.

---

## 11. Troubleshooting & FAQ

**Q: My "Live Session" keeps dropping or freezing.**
A: Ensure that both the Teacher and Student devices are on the same local network, and that your school's content filter isn't blocking generic WebSocket (WSS) connections. If the problem persists, try ending the session and generating a new 4-digit code.

**Q: The AI text generation is spinning forever or failing to load.**
A: First, check your internet connection (if using the cloud version). Second, Chrome's experimental QUIC protocol can aggressively cache service worker connections. Try holding `Shift` while clicking the refresh button to force a hard cache clear. If you are using the "School Box" Docker version, ensure the Ollama container hasn't timed out. 

**Q: The Allobot Tour stopped appearing.**
A: The system automatically disables Allobot once you've completed the tutorial or reached Level 3 to prevent distraction. You can always manually reactivate Allobot via the `Settings -> Reset Onboarding` toggle.

**Q: The text-to-speech voice changed suddenly.**
A: AlloFlow uses a Dual-Engine offline architecture. If the primary ultra-high-quality English engine (Kokoro) experiences memory pressure, the system seamlessly falls back to the secondary multi-lingual engine (Piper) to ensure uninterrupted accessibility. You can manually lock the voice via the Settings panel.

**Q: Is Google Firebase FERPA-compliant for hosting AlloFlow?**
A: **Yes — and most districts are already covered.** Over 170 million students and educators worldwide use Google Workspace for Education, and 93% of U.S. school districts purchase Chromebooks, which are deeply integrated with Google's education ecosystem. If your district already uses Google Workspace for Education, your agreement already incorporates the **Cloud Data Processing Addendum (CDPA)** by reference — which covers Firebase and other Google Cloud Platform services.

If your district needs to explicitly accept the CDPA, it takes roughly 5 clicks:
1. Sign in to the **Google Admin Console** with a super administrator account.
2. Navigate to **Account → Account Settings → Legal and Compliance**.
3. Under "Security and Privacy Additional Terms," click **Review and Accept**.

That's it. No lawyers, no lengthy negotiations.

> 💡 **PRO TIP:** AlloFlow's Firebase deployment uses Firebase *Hosting* only (serving static files), NOT Firebase Auth, Firestore, or Realtime Database. This means **no student data is ever written to Google's servers** — Firebase simply delivers the application code, similar to a CDN. This dramatically simplifies your FERPA compliance posture.

**Q: What is a DPA (Data Processing Agreement) and do I need one?**
A: A **Data Processing Agreement (DPA)** — sometimes called a Data Processing Addendum — is a legally binding contract between your school district (the "data controller") and a technology vendor (the "data processor"). Under FERPA, any vendor that accesses student education records must be designated as a "school official" with a "legitimate educational interest." The DPA formalizes this relationship, specifying:
- What data is processed and for what purpose.
- How the vendor protects and encrypts the data.
- What happens to the data when the contract ends (deletion/return).
- Breach notification timelines (typically 72 hours).

The good news: **for AlloFlow, the DPA situation is straightforward across all three deployment pathways:**

| Deployment Path | DPA Required? | Notes |
|---|---|---|
| **Gemini Canvas** | ✅ Already covered | Your existing Google Workspace for Education agreement acts as the DPA. Google is designated as a "school official" under FERPA. |
| **Firebase Hosting** | ✅ Already covered (for most districts) | The CDPA in your Workspace agreement covers GCP/Firebase. Since AlloFlow only uses static hosting (no database), zero student data touches Google's servers. |
| **School Box (Docker)** | ✅ No DPA needed | All data stays on your local hardware. No third-party processor is involved — the gold standard for FERPA. |

**Q: Which deployment option is the most private?**
A: The **School Box** is the most private option, but all three pathways are designed to protect student data. Because AlloFlow stores all student information in the teacher's local browser `localStorage` (never in cloud databases), even the Canvas and Firebase pathways maintain a strong privacy posture. That said, for districts with the strictest requirements or those serving vulnerable populations (e.g., students with IEPs), the School Box is recommended because no data ever leaves the building's network.

---

## Appendix & UDL Alignment
AlloFlow seamlessly maps to the standard UDL Checkpoints across Engagement, Representation, and Action & Expression guidelines. The platform shifts the economics of lesson planning, closing the gap between mandate and reality, empowering educators with the capabilities of a dedicated Special Education planning specialist.

**Status:** Open Source / Pilot Ready  
*For deployment issues via the School Box, consult the Docker implementation guide.*
