# Final Email to Sharron Rush — Ready to Send

**To:** knowbility@knowbility.org (or Sharron's direct email if provided)
**Subject:** Re: Thank you for contacting Knowbility — open-source accessibility partnership proposal

---

Dear Sharron,

Thank you so much for the warm response and for Knowbility's openness to working with open-source developers. I read through every document you shared — the Auditing-Testing Methodology in particular deeply resonated with me, especially your emphasis that manual testing by native screen reader users is irreplaceable. I couldn't agree more, and it's exactly why I reached out.

(Small note while I'm thinking of it: on page 1 of the methodology doc, there appears to be a missing word — "cannot the quality of the text provided" may be "cannot *assess* the quality." I only mention it because I read it closely enough to notice, which I hope speaks to how seriously I take this work.)

**About the project:** I'm a school psychologist (PsyD) who just started at Portland Public Schools in Maine. Over the past five months, I've built AlloFlow — a free, open-source (GNU AGPL v3), AI-powered educational platform with 80+ tools for teachers, school psychologists, and students. It's live at https://prismflow-911fe.web.app and the full source is on GitHub.

**The accessibility work:** With the Title II ADA deadline upon us, I've invested significant effort in WCAG 2.1 AA compliance — 390+ individual fixes across 60+ module files, a VPAT 2.5 self-assessment, and a PDF accessibility remediation pipeline that I believe could be relevant to Knowbility's mission. The pipeline includes:

- 5-10 auditor triangulated AI accessibility audit with reliability statistics (ICC, Cronbach's alpha, 95% CI)
- axe-core (Deque) automated WCAG verification integrated directly
- A self-healing loop that feeds axe-core violations back for AI correction and re-verification
- A JSON data pipeline that separates content extraction from deterministic styled HTML rendering
- An editable preview with themes, brand matching, and accessibility inspection overlays

Everything I've described is free, will stay free, and stores zero student PII.

**What I need that only Knowbility can provide:** I've done everything static code analysis and automated tools can do. What I cannot do alone is what your methodology document so clearly articulates — the 65% that requires expert human judgment, native screen reader testing with real users, and the kind of deep manual evaluation that Knowbility has pioneered for 25 years.

**What I think I can offer in return:** AlloFlow could serve as a free tool Knowbility recommends to education clients who can't afford full-scale remediation — handling the 70-80% of straightforward documents so Knowbility's expert services can focus on the complex work that genuinely requires human expertise. I'd also welcome the opportunity to present jointly at AccessU or co-author a case study on how AI-powered remediation complements expert auditing. The entire codebase is open source and could serve as a reference implementation for developers building accessible AI tools.

I'm a first-year school psychologist, not a funded startup — I don't have a services budget. But I have a working platform that could advance Knowbility's mission of digital inclusion in education at a scale that's hard to reach through paid services alone. I'd love to explore whether there's a partnership model that makes sense for both of us.

I'm available for a demo meeting on:
- [Insert 3-4 date/time options]

I'd be happy to walk through the live platform, the VPAT, the PDF pipeline, and the codebase. I think once you see what the tool does, the conversation about how we might work together will be much more concrete.

Thank you for 25 years of leadership in this field. Knowbility's expertise is exactly what AlloFlow needs to become truly trustworthy for the institutions and students it's built to serve.

With respect and appreciation,

Aaron Pomeranz, PsyD
School Psychologist, Portland Public Schools (Maine)
apomeranz@alloflow.org
https://prismflow-911fe.web.app | GitHub: github.com/Apomera/AlloFlow
