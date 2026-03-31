# Email Draft — Paul Cochrane, Center for Academic Innovation, USM

**Subject:** AlloFlow — Free PDF → Accessible Content Pipeline for Title II Compliance

---

Dear Paul,

Thank you for connecting — Flynn spoke highly of your work leading the Title II compliance effort through the Center for Academic Innovation, and I'm excited about the possibility of collaborating.

I'm Aaron Pomeranz — I completed my PsyD at USM and now work as a school psychologist at Portland Public Schools (Maine). Over the past six months, I've been building an open-source educational platform called AlloFlow that may be directly relevant to your Title II work.

### The PDF Problem

I understand USM is working through the challenge of making thousands of legacy course materials WCAG 2.1 AA compliant — PDFs, syllabi, presentations, handouts. Traditional PDF remediation runs $5-25 per page, which at scale becomes prohibitive. And the April 2026 deadline has arrived.

### What AlloFlow Does

AlloFlow takes a different approach than traditional remediation tools. Instead of tagging an inaccessible PDF to make it technically compliant, AlloFlow **transforms** it into an accessible, interactive learning resource:

1. **Upload any PDF** — AlloFlow uses AI (Google Gemini) to extract text and structure
2. **Simplify to any reading level** — adjust complexity with a slider (Flesch-Kincaid Grade 3 through college)
3. **Generate supporting materials** — glossary with definitions, comprehension quiz with answer key, visual organizers, sentence frames, bilingual translations in 40+ languages
4. **Narrate with neural TTS** — 50+ voices in 40+ languages, with synchronized word-by-word highlighting (karaoke read-along)
5. **Export as accessible HTML** — proper landmarks (`<main>`, `<nav>`, `<footer>`), skip navigation, table header scope, dynamic `lang` attribute, ARIA labels throughout
6. **Print to accessible PDF** — the HTML export prints to a structurally sound PDF

The result isn't just a compliant document — it's a **differentiated, multilingual, audio-enabled learning experience** that serves students with disabilities, English learners, and diverse readers far better than a tagged PDF ever could.

### What Makes This Different

- **Free and open-source** (GNU AGPL v3) — no procurement process, no licensing fees, no vendor lock-in
- **Zero student data collection** — FERPA compliant by architecture, not by policy
- **80+ tools beyond PDFs** — STEM simulations, SEL activities, AAC communication, clinical reporting, writing studio, progress monitoring
- **Built by a clinician** — I work with students on IEPs and 504 plans. The accessibility features aren't afterthoughts; they're the foundation.
- **Embedded research suite** — IRB-ready pilot protocol, automated fidelity logging, survey instruments, CSV/PDF data export

### How This Could Work for USM

I see a few possibilities:

**Immediate value:** Faculty in your training programs could use AlloFlow to transform their most problematic PDFs into accessible, engaging resources — today, for free. No integration required; it runs in a browser.

**Pilot study:** The Center for Academic Innovation could partner with me on a formal evaluation — "AI-Powered Document Accessibility for Title II Compliance." I have an IRB-ready protocol with pre/post surveys and embedded data collection. This is publishable research that advances your center's mission.

**WCAG audit partnership:** AlloFlow has undergone extensive accessibility remediation (~900 fixes across 90+ files in the past week), but a professional third-party WCAG audit would give USM the confidence to recommend it institutionally. If AlloFlow becomes part of USM's Title II strategy, the audit cost (~$2,500-5,000) would be a fraction of per-page remediation costs — and it protects the institution's compliance posture.

### Demo

I'd love to show you the PDF pipeline in action — it takes about 5 minutes to upload a document and see the full transformation. I'm happy to use one of your actual course materials as the demo so you can see the results on content you care about.

Would you have 30 minutes in the next week or two?

Warm regards,

**Aaron Pomeranz, PsyD**
School Psychologist, Portland Public Schools (Maine)
USM Alumni — PsyD, Educational & School Psychology
Creator of AlloFlow
GitHub: github.com/Apomera/AlloFlow
[Email] | [Phone]

---

## Talking Points for the Meeting

**If Paul asks about Ally (which USM already uses):**
"Ally is great for flagging accessibility issues inside Brightspace. AlloFlow is complementary — Ally tells you what's wrong, AlloFlow transforms the content into something better. They're not competing tools; they're different parts of the pipeline. Ally audits, AlloFlow remediates and enhances."

**If Paul asks about scale:**
"A single faculty member can transform a semester's worth of PDFs in an afternoon. The AI handles extraction, simplification, glossary generation, and quiz creation. The faculty member reviews and adjusts. It's not a per-page cost model — it's unlimited use, forever, for free."

**If Paul asks about accuracy:**
"The AI extraction isn't perfect — complex tables, mathematical notation, and image-heavy documents need human review. But for the 80% of course materials that are text-based (syllabi, articles, handouts, study guides), it works well. And the output is always editable before export."

**If Paul asks about institutional adoption:**
"It's open-source. USM can host it on your own servers via Docker (air-gapped, no external dependencies), run it through Firebase Hosting, or use it directly in Google Gemini Canvas. No vendor agreement needed. No data leaves your control."

**If Paul asks about the WCAG audit:**
"I've done extensive self-assessment and automated testing. For USM to confidently recommend it, a third-party audit from someone like Knowbility would give you a proper Accessibility Conformance Report. If AlloFlow becomes part of your Title II infrastructure, the audit is an investment in your compliance — not a donation to my project."

**The killer demo:**
1. Open AlloFlow
2. Upload one of Paul's actual course PDFs
3. Show: text extracted → simplified to 5th grade level → glossary auto-generated → quiz created → bilingual Spanish translation → TTS narration with karaoke highlighting
4. Export as HTML → open in browser → show accessible structure (inspect landmarks, ARIA)
5. Print to PDF → show it's a clean, readable, structurally sound document
6. Total time: ~5 minutes
7. Total cost: $0
