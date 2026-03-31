# Response to Sharron Rush, Executive Director, Knowbility

---

**Subject:** Re: Thank you for contacting Knowbility — partnership proposal for open-source EdTech accessibility

Dear Sharron,

Thank you so much for your thoughtful response and for Knowbility's openness to working with open-source developers. I read through the materials you shared cover to cover — the methodology document in particular resonated deeply with me, especially your emphasis on manual testing by native screen reader users as irreplaceable. I couldn't agree more. (Small note: on page 1 of the Auditing-Testing Methodology doc, there may be a missing word — "cannot the quality" might be "cannot *assess* the quality" — I mention this only because I read it so carefully.)

I'd love to share some context about the project and propose what I think could be a mutually beneficial collaboration.

### About Me and AlloFlow

I'm a school psychologist (PsyD) who just started at Portland Public Schools in Maine. Over the past five months, I've built AlloFlow — a free, open-source (GNU AGPL v3), AI-powered educational platform with 80+ tools for teachers, school psychologists, and students. It's deployed at https://prismflow-911fe.web.app and the source is on GitHub.

AlloFlow includes clinical tools (psychoeducational report writer, behavioral observation/analysis), 57 STEM interactive tools, 19 social-emotional learning tools, multilingual content differentiation (18+ languages), and — most relevant to this conversation — a **PDF accessibility remediation pipeline** that I believe could be of significant interest to Knowbility's mission.

### The PDF Accessibility Pipeline

With the April 24, 2026 Title II ADA deadline for WCAG 2.1 AA compliance, schools and universities face an enormous remediation backlog. AlloFlow now includes:

- **5-10 auditor triangulated AI accessibility audit** with statistical reliability metrics (ICC, Cronbach's alpha, 95% confidence intervals)
- **axe-core (Deque) automated WCAG 2.1 AA verification** — the industry standard, integrated directly
- **Self-healing remediation loop** — axe-core violations are fed back to AI for targeted fixes, re-verified automatically
- **JSON data pipeline** — AI extracts structured content and style metadata separately, then deterministic code renders guaranteed-valid accessible HTML
- **Preview & Edit modal** with inline editing, themes, brand matching, a11y inspection overlays, and AI image tools
- **VPAT 2.5 self-assessment** documenting 50 WCAG criteria (36 Supports, 11 Partially Supports pending runtime verification, 0 Does Not Support)

All of this is free. It will stay free. It stores zero student PII.

### What I Think I Need (and Where Knowbility's Expertise Is Irreplaceable)

I've done everything that static code analysis and automated tools can do. What I **cannot** do on my own:

1. **Native screen reader usability testing** — Your AccessWorks community of 1,000+ testers is exactly what AlloFlow needs. No amount of code analysis replaces a blind user navigating the actual interface with JAWS or NVDA.

2. **Expert manual audit** — Your methodology document perfectly articulates why: automated tools catch ~35% of issues. The remaining 65% requires human judgment. I know my VPAT has gaps that only your team's expertise can identify.

3. **VPAT/ACR validation** — A self-assessed VPAT is a starting point. A Knowbility-validated Accessibility Conformance Report would transform AlloFlow's credibility for institutional adoption.

### What I Can Offer Knowbility in Return

I understand Knowbility is a nonprofit advancing a mission, not running a charity. Here's what I think AlloFlow could bring to your work:

1. **A free tool you can recommend to education clients.** When a school district or university comes to Knowbility saying "we can't afford $5-25/page to remediate 10,000 PDFs," you could point them to AlloFlow's pipeline as a free first-pass solution — handling the 70-80% of simple documents so Knowbility's expert services can focus on the complex 20-30% that genuinely need human remediation.

2. **A case study for AccessU.** "How AI-Powered Accessibility Remediation Complements Expert Human Auditing" — presented jointly — would be a compelling session. It demonstrates that AI isn't replacing accessibility professionals; it's extending their reach.

3. **An open-source reference implementation.** AlloFlow's axe-core integration, self-healing loop, and VPAT are all open source. Knowbility could point developers to the codebase as an example of how to build accessibility verification into AI tools.

4. **Education sector impact at scale.** AlloFlow serves K-12 and higher education — a sector where Knowbility's mission is deeply needed but where budgets are smallest. A partnership puts Knowbility's name on a tool reaching the students who need accessibility most.

### What I'm Proposing

Rather than a standard client engagement, I'd love to explore a **mission partnership**:

- Knowbility provides expert accessibility review and AccessWorks usability testing
- AlloFlow remains free and open source, with Knowbility acknowledged as the accessibility validation partner
- We jointly publish the results (case study, conference presentation, or white paper)
- I integrate any findings back into the platform immediately — the self-healing architecture means fixes deploy in minutes, not months

I have no budget for $250/hour auditing — I'm a first-year school psychologist, not a funded startup. But I have a working platform that could advance Knowbility's mission of digital inclusion in education at a scale that paid services alone cannot reach.

I'm available for a meeting on [dates]. I'd be happy to do a live demo and walk through the codebase, the VPAT, and the PDF pipeline. I think once you see what the tool does, you'll understand why I believe this partnership could be meaningful for both of us.

Thank you for considering this. Knowbility's 25 years of leadership in this field is exactly the expertise that AlloFlow needs to become truly trustworthy for the institutions and students it's built to serve.

With deep respect,
Aaron Pomeranz, PsyD
School Psychologist, Portland Public Schools (Maine)
apomeranz@alloflow.org

---

## Strategic Notes

**Tone:** Respectful of their expertise, honest about limitations, clear about mutual value. Not asking for charity — offering a partnership.

**Key framing choices:**
- Led with reading their docs carefully (shows respect + the typo mention proves it)
- Positioned AlloFlow as complementary to their services, not competitive
- Explicitly said "I have no budget" early — gets it out of the way honestly
- Offered 4 concrete things of value (recommendation tool, case study, reference code, sector reach)
- The "mission partnership" framing aligns with their nonprofit identity
- Mentioned the self-healing architecture — shows that their audit findings would be acted on immediately, not filed away

**What Sharron said that matters:** "We are quite open to discounts for open source developers." This means they already have a framework for supporting projects like yours. The question is whether you can get from "discount" to "partnership" — which depends on how compelling the demo is.

**The typo:** Mentioning it is the right play. It shows:
1. You actually read the methodology document (most prospects don't)
2. You care about details (relevant for an accessibility partnership)
3. You're collegial, not adversarial about it

**Best case outcome:** Knowbility does a pro bono or heavily discounted accessibility audit as a case study, validates the VPAT, provides AccessWorks testing, and you present together at AccessU 2026. That gives AlloFlow a "Validated by Knowbility" credential that would be worth more than any amount of self-testing.

**Worst case outcome:** They offer a discounted audit at maybe $100-150/hour for 10-20 hours ($1,000-3,000). Even that would be valuable, but push for the partnership model first.
