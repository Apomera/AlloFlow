---
description: Scope guard for AlloFlow UDL Platform work — prevents cross-contamination with other products
---

# AlloFlow Scope Definition

## What IS AlloFlow
- The UDL (Universal Design for Learning) literacy and education platform
- Lives in: `AlloFlowANTI.txt` (~70K lines, single-file React monolith)
- Runs in: Google Gemini Canvas
- Core features: Word Sounds Studio (phonics), content analysis, glossary, quiz, flashcards, 
  concept maps, story/adventure mode, simplified text, AlloBot chat guide, RTI monitoring,
  teacher dashboard, escape room, study timer, letter tracing
- Infrastructure: Gemini API (text, image, TTS), Firebase auth + Firestore, IndexedDB offline

## What is NOT AlloFlow (separate products — DO NOT mix in)
- **Digital Kinship Parenting Tool** — Indigenous-centric parenting app (Hearth Hub, Tribal Nations Explorer, Digital Auntie, Parent Wellness Studio, Conflict Resolution Lab)
- **Report Writing App** — GEIS protocol, Blueprint Mode, Adaptation Studio, User Report Profile
- **AI-CPBL Pilot Proposal** — Research/policy document (not a software product)

## When working on AlloFlow
1. Only reference `AlloFlowANTI.txt` and files in the UDL-Tool-Updated workspace
2. Do NOT pull features, bugs, or tasks from the parenting tool or report writing app KIs
3. If a KI mentions "Hearth", "Digital Auntie", "Tribal Nations", "Blueprint Mode", "Adaptation Studio", or "GEIS" — it belongs to a DIFFERENT product
4. When suggesting new features, verify they align with UDL education principles
