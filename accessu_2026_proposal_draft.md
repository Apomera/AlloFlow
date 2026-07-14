# AccessU 2026 Session Proposal — DRAFT

**Conference:** John Slatin AccessU 2026 (May 11-14, Austin TX / Virtual)
**Submission URL:** https://knowbility.org/programs/john-slatin-accessu-2026/call-for-proposals
**Status:** DRAFT — Review before submitting

> **Currency note (2026-07-09):** DOJ has extended the Title II web/mobile accessibility rule compliance dates to April 26, 2027 for state/local entities with populations of 50,000 or more and April 26, 2028 for smaller entities and special district governments. Source: [ADA.gov fact sheet](https://www.ada.gov/resources/2024-03-08-web-rule/). Keep this proposal's urgency framed as the 2027/2028 readiness window, not as an April 2026 deadline that has already passed.

---

## Session Title

**When AI Meets axe-core: An Open-Source Pipeline for Scalable Document Accessibility Remediation**

## Session Type

Hands-On Workshop (90 minutes)

## Track

Developers / Content Creators (dual-track)

## Abstract (200 words)

The DOJ Title II web and mobile accessibility rule has put public schools, universities, and state/local agencies on a 2027/2028 readiness timeline for WCAG 2.1 AA web and mobile content. That extension does not make the document backlog smaller: thousands of legacy PDFs still need triage, remediation evidence, expert review, and realistic prioritization. At $5-25 per page for professional remediation, many districts face an impossible equation: comply well or spend beyond what their budgets can absorb.

This workshop introduces an open-source, AI-powered document accessibility remediation pipeline that combines multi-auditor AI analysis with axe-core (Deque) automated verification and a self-healing fix loop. Attendees will see the pipeline process real PDFs live, examine before/after audit scores, and understand exactly where AI remediation succeeds and where human expertise remains irreplaceable.

Key takeaways:
- How to architect an AI pipeline that generates schema-validated, accessibility-oriented HTML instead of unchecked AI markup
- Why statistical triangulation across multiple AI auditors produces more reliable scores than single-pass analysis
- How to integrate axe-core verification into any AI workflow
- The 35-65 split: what automated tools can catch vs. what requires native assistive technology testing
- An accessibility evidence report that documents remediation efforts for institutional review

All code is open source (GNU AGPL v3). All tools are free. No vendor pitch — just working code you can deploy today.

## Learning Objectives

1. Attendees will understand how to combine AI generation with automated WCAG verification to produce reliably accessible documents at scale.
2. Attendees will be able to identify the specific WCAG criteria that automated tools can and cannot evaluate, and plan complementary manual testing accordingly.
3. Attendees will learn how self-healing remediation loops (AI fix → axe-core verify → AI re-fix) reduce violation counts without human intervention.
4. Attendees will take away a deployable, open-source tool they can use immediately for their own document portfolios.

## Session Outline (90 minutes)

| Time | Segment | Description |
|------|---------|-------------|
| 0-10 | The Title II Problem | Scope of the compliance challenge: how many documents, how much it costs, why districts are stuck |
| 10-25 | Live Demo: Single PDF | Upload a real inaccessible PDF → watch multi-auditor AI analysis → see before score → one-click remediation → axe-core verification → A11y Inspector overlay → export |
| 25-35 | Architecture Deep Dive | How the pipeline works: Vision API for layout preservation, JSON data pipeline for schema-validated HTML, self-healing loop mechanics |
| 35-50 | Live Demo: Batch Processing | Process 5 PDFs simultaneously → watch the accessibility evidence report generate → examine per-document results → discuss the "expert review" flags |
| 50-60 | The 35-65 Split | Honest assessment: what AI catches vs. what it misses. Specific WCAG criteria that require human judgment. How this pipeline complements (not replaces) accessibility professionals |
| 60-75 | Hands-On: Try It Yourself | Attendees bring their own PDFs and run them through the pipeline. Facilitated discussion of results. Troubleshooting complex documents together |
| 75-85 | Integration Patterns | How to add axe-core to any AI workflow. API patterns for Gemini Vision + document processing. How the self-healing loop generalizes beyond PDFs |
| 85-90 | Q&A + Resources | Open source links, VPAT, documentation, community channels |

## Speaker Bio

**Aaron Pomeranz, PsyD** is a school psychologist at Portland Public Schools (Maine) and the creator of AlloFlow, a free, open-source Universal Design for Learning platform with a broad K-12 toolset spanning STEM, SEL, AAC, accessibility, and clinical workflows. Over five months of AI-assisted development, Aaron built AlloFlow to address the accessibility and differentiation gaps he encountered as a practitioner — including a PDF remediation pipeline designed specifically for the Title II readiness challenge facing many public school districts. He holds a doctorate in psychology and brings a clinician's perspective to educational technology: the students who need accessible documents most are the ones whose schools can least afford to create them.

## Technical Requirements

- Projector/screen for live demo
- Internet access (the pipeline calls cloud AI APIs)
- Attendees should bring laptops with Chrome for the hands-on portion
- No software installation required (web-based tool)

## Accessibility Statement

The session will be designed for full participation by attendees using assistive technology. The live demo will use AlloFlow's WCAG-oriented accessibility features and published VPAT/audit materials, with exact current-build conformance caveats stated clearly. All slides and handouts will be provided in accessible formats 48 hours before the session. The presenter welcomes accommodation requests in advance.

---

## Strategic Notes (do not include in submission)

**Why this session works for Knowbility:**
- Directly addresses their mission (digital accessibility)
- Timely (the 2027/2028 Title II readiness window gives schools urgency without pretending automated remediation replaces expert review)
- Practical (attendees leave with a working tool, not just theory)
- Honest about limitations (the 35-65 split positions human accessibility experts as essential, not replaceable)
- Open source (aligns with Knowbility's community-first values)

**Potential co-presenter:** If the Knowbility partnership materializes, propose Jillian Fortin Burtnett or a Knowbility accessibility specialist as co-presenter. This transforms it from "developer shows tool" to "tool validated by accessibility experts."

**Fallback:** If not accepted as a workshop, resubmit as a shorter presentation (45 min) without the hands-on portion.

**Connection to the meeting:** Share this draft with Sharron/Jillian as evidence of commitment. "We've already drafted a session proposal for AccessU — would Knowbility like to co-present?"
