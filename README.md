<div align="center">
  <img src="./rainbow-book.jpg" alt="AlloFlow Logo" width="150"/>

  # AlloFlow (v1.0)
  **Adaptive Levels, Layers, & Outputs ➔ Flexible Learning Options for Whole-Student Education**

  [![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
  [![Local-First Architecture](https://img.shields.io/badge/Architecture-Local--First-brightgreen.svg)](#school-box-deployment)
  [![Privacy: FERPA & COPPA](https://img.shields.io/badge/Privacy-FERPA_Compatible-red.svg)](#-privacy--ferpa-compliance)
</div>

---

## 🚀 What is AlloFlow?

AlloFlow is an **open-source, privacy-first AI differentiation engine** built explicitly for specialized education, Response to Intervention (RTI) scaling, and clinical behavior support. 

Originally a simple text-adaptation tool, **Version 1.0** features a **Hub-and-Spoke Microservice Architecture** encompassing 450+ interactive STEM Lab modules, built-in Tier 1/2/3 Response to Intervention (RTI) screening, and a secure Clinical Reasoning Suite engineered specifically for Special Educators, Board Certified Behavior Analysts (BCBAs), and School Psychologists.

### 📚 Core Pedagogical Differentiators
- **Instant Leveled Texts & Scaffolds:** Generate bilingual interactive readers, cloze passages, and gamified reviews (Jeopardy, Escape Rooms, Adventure Modes).
- **🗣️ Word Sounds Studio:** 13 interactive phonemic awareness drills ranging from syllable segmentation to digital letter-tracing.
- **🧮 STEM & Visual Lab:** 450+ dynamic HTML5 manipulations (Calculus Graphing, Neuroanatomy Viewers, Star Systems, and Coding Playgrounds).
- **📋 BehaviorLens (Clinical):** Gated ABA data collection (ABC tracking, MSWO Preference Assessments, Frequency/Interval counting) with automated DRO logic and IOA calculations.
- **🧠 Report Writer Wizard:** A high-privacy, "Fact-Chunk" pipeline that prevents AI hallucination when synthesizing standardized assessments into bilingual psychoeducational reports.

---

## 🏛️ Local-First Architecture (The "School Box")

AlloFlow represents a paradigm shift away from cloud reliance. Our mission is to eliminate continuous API licensing costs for underfunded school districts via the **School Box Deployment**.

By utilizing the `aiProvider.js` integration and Docker, School IT departments can run AlloFlow **entirely offline** on local intranet hardware (e.g., an RTX 3090/4090 workstation). 

1. **Frontend Host:** The React UI (`AlloFlowANTI.txt`) processes all student interactions and gamification locally in the browser utilizing LZ-String compressed caching.
2. **Ollama Inference:** Routes all generative LLM requests to local, open-source models (Llama 3.1, Phi-3.5) hosted on the school's own hardware.
3. **Dual-Engine TTS:** The system utilizes an ultra-high-quality offline English engine (Kokoro) and multi-lingual fallback (Piper) executing securely within the browser namespace, ensuring text-to-speech audio never hits cloud APIs. 

---

## 🔐 Privacy & FERPA Compliance

**No student data leaves your school.**

AlloFlow is designed to be **FERPA-compatible** by default:
- **Zero API Telemetry:** By deploying the School Box architecture, absolutely no student PII is transmitted to Google, OpenAI, or other 3rd party servers.
- **On-Device Storage:** High-speed persistence happens via the browser's encrypted local storage JSON objects.
- **TeacherGate Security:** Grading rubrics, answer keys, and the Clinical Reasoning Suite are isolated behind rigorous educator verification gating, separating authoring mode from the student-facing consumption interface.

---

## ♿ UDL & Accessibility Priority

Every element of AlloFlow inherently maps to Universal Design for Learning (UDL) checkpoints:
- **Dyslexia fonts** (OpenDyslexic) and Bionic Reading overlays.
- **Offline Text-to-Speech (TTS)** with word-for-word audio tracking.
- **Color overlays** for Irlen Syndrome support (Peach, Blue, Yellow).
- **Line focus / Reading ruler** visual isolation bars.
- Complete voice-dictation natively supported on all input fields.

---

## 🛠️ Installation & Getting Started

Because AlloFlow distributes complex interactive modules via localized scripts and CDN commit-hash pinning, developers and IT admins can launch the platform seamlessly:

```bash
# 1. Clone the repository
git clone https://github.com/apomera/AlloFlow.git

# 2. Deploy the core frontend to Firebase Hosting (Cloud Option) 
# OR spin up the School Box (Local Option)
docker-compose up -d

# 3. Access the platform at local HTTP port
```

For comprehensive tutorials, pedagogical workflows, and advanced configurations, please refer to the extensively documented [**AlloFlow v1.0 Comprehensive User Manual.md**](./AlloFlow%20v1.0%20Comprehensive%20User%20Manual.md) included in this repository.

---

## 📄 Licensing & Contribution

AlloFlow is distributed under the **AGPL v3 License** — free and open source forever, to ensure educational technology remains a public good.

<p align="center">
  <strong>Built by a school psychologist, for educators.</strong><br>
  <em>"Differentiation should be the default, not the exception."</em>
</p>
