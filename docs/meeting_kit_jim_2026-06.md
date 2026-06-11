# AlloFlow — Meeting Kit (Jim Hayden, June 2026)

Two parts: a one-page leave-behind (print or paste into a doc), then a 10-minute demo script with fallbacks.

---

## Part 1 — One-pager

# AlloFlow
### Free, verifiable document accessibility for K-12 — built by a school psychologist, run entirely in the browser.

**The problem.** Every IEP, worksheet, and parent letter a district produces is legally required to be accessible (ADA Title II; DOJ compliance deadlines April 2027/2028, HHS May 2027/2028). Commercial remediation runs **$5–25 per page** or five-figure enterprise contracts — pricing that excludes the schools that need it most. DOJ explicitly extended its deadlines citing the unreliability of automated remediation tools.

**The approach: DOJ's caution, as engineering.** AlloFlow treats that distrust as a design spec:
- **Three verification engines** — axe-core and IBM Equal Access (deterministic, industry-standard) plus an AI rubric; the score always uses the more conservative deterministic result, before *and* after remediation.
- **Evidence-gated claims** — the tool *withholds* its own PDF/UA conformance declaration unless a post-save structural walk proves every element is reachable. It declines to claim what it cannot show.
- **Honest AI labeling** — every AI-estimated artifact (image descriptions, chart data, translations, plain-language rewrites) is labeled as such, with human-review prompts; deterministic checks are verified per section, and failures are reported rather than papered over.

**What it does today** (all client-side; the only cost is a school Google account's existing Gemini quota):
- **Input:** PDF (born-digital or scanned), Word, PowerPoint, Markdown, CSV, Excel, audio/video recordings, YouTube links — one at a time or folder batches.
- **Output:** verified tagged PDF, accessible Word/HTML, spoken audio (resumable across sessions), screen-reader-simulation audio, braille-ready text — plus, per document: **any-language translation** (structure-verified, IDEA parent-communication ready), a **plain-language easy-read version**, and a **document-grounded glossary**.
- **Operable hands-free**: a built-in assistant with keyboard palette, chat commands, and opt-in voice control — the accessibility tool is itself accessible.

**Traction & provenance.** Built and maintained by Aaron Pomeranz, PsyD (practicing school psychologist); piloting at King Middle School 2026-27; University of Maine relationship in progress; AGPL-licensed, free forever for schools. ~1,500 automated tests, golden-master suites, and an ISO-validator harness behind every release.

**What we're looking for.** Stewardship and governance that scales distribution and funds **independent validation** (expert-scored calibration corpus, assistive-technology user testing) — while the mission stays fixed: free for schools, open source, clinician-led.

**Contact.** Aaron Pomeranz, PsyD — [email] · Live demo: prismflow-911fe.web.app

---

## Part 2 — 10-minute demo script

**Setup beforehand (5 min):** open the app in Canvas or at the demo URL; have two files ready — a real district PDF (the 16-pager that went 52→84 works well) and any Spanish-relevant parent letter. Run Platform Check once to confirm the environment.

1. **The one-click story (3 min).** Upload the PDF → *Make Accessible*. While it runs, narrate the running banner: "it audits with two deterministic engines plus AI, fixes, re-verifies, and keeps going until it hits 90 or tells you honestly why it stopped." Show the score breakdown when it lands: before/after, both engines named, "What Equal Access flagged" expander.
2. **The honesty beat (2 min).** Open Downloads → point at the tagged PDF note: "it only declares PDF/UA when a structural walk *proves* it — this is the anti-overclaim architecture DOJ said tools lack." If the declaration was withheld on this doc, show that instead — *the refusal is the feature*.
3. **The family beat (3 min).** Translate the document to Spanish (or any typed language) → open **Compare** side-by-side → tap **Audio (es)**. Line: "IDEA requires parent-language access to these documents; districts pay per page for this. Structure-verified, labeled for bilingual review, with audio — at zero cost."
4. **The wow close (2 min).** Say "start voice control" → "what's my score" → "where is the export menu" (watch it spotlight). Line: "the agent runs on the same audited help system as everything else — an accessibility tool you can operate without hands or sight."

**Fallbacks.** If quota/network hiccups: the run-history panel shows prior runs; the saved project file reloads a completed session instantly; screenshots of the 52→84 run as last resort.

**Three numbers to have ready.** $5–25/page commercial pricing; DOJ deadline extension to April 2027/2028 (citing automated-tool limits — our positioning); 45/45 original issues resolved on the real-document demo run.

**Questions to ask Jim.** (1) Advisory, board, or engagement — which hat would he wear? (2) Which 2–3 governance models fit a clinician-led, AGPL, free-for-schools project? (3) Who in his network funds *validation* specifically (the calibration corpus is the credibility unlock)? (4) What would he need from us to make an introduction comfortable?
