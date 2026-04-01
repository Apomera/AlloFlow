# Email to Paul Cochrane - Ready to Send

**To:** Paul Cochrane, Center for Academic Innovation, USM
**Subject:** PDF accessibility pipeline for USM - built in response to Flynn Ross's feedback

---

Dear Paul,

My name is Aaron Pomeranz. I'm a school psychologist (PsyD) who just started at Portland Public Schools in Maine. I recently had the opportunity to speak with Flynn Ross about the challenges USM faces with Title II ADA compliance for document accessibility. She emphasized how significant the PDF remediation burden is for the university, and I took that feedback seriously.

Over the past several days, I built a free, open-source PDF accessibility remediation pipeline specifically designed to address this problem. I'd love to explore whether USM would be interested in piloting it.

**What the pipeline does:** Upload any PDF. In a few minutes (long enough to help a student or grab a coffee), it:
- Runs a 5-10 auditor triangulated accessibility audit with statistical reliability metrics
- Auto-remediates to fully accessible HTML, verified by axe-core (the industry-standard WCAG checker from Deque)
- Offers a preview editor where you can customize themes, fonts, and branding to match USM's visual identity
- Translates into 17+ languages and simplifies to any grade level, all stackable in one document
- Exports as accessible PDF, HTML, or a detailed compliance report

I tested it on USM's Professional Development Programs Course Catalogue (35 pages). The output scored 90+ on axe-core verification and looks better than the original.

**The cost angle:** Document remediation through vendors typically costs $5-25 per page. For a university with thousands of documents, this adds up quickly. This pipeline is free and open source. If it can reliably handle 70-80% of straightforward educational documents (syllabi, handouts, course materials, newsletters), that's a significant reallocation of funds that could go toward expert remediation of the complex 20-30% that genuinely need it.

**What I'm proposing:** A pilot study at USM, starting with a validation study for the PDF pipeline. Graduate students could test the tool against a sample of real USM documents, measure the before/after accessibility scores, and compare output quality to vendor-remediated versions. This produces publishable research data while simultaneously remediating real documents.

The pipeline is part of a larger platform called AlloFlow (80+ tools for differentiation, assessment, and clinical reporting), which also has a VPAT 2.5 self-assessment. The VPAT's runtime verification section is specifically designed as a graduate student testing project.

I'm available for a 30-minute demo on [insert 3-4 dates/times]. I'd be happy to walk through the pipeline using an actual USM document so you can see the quality firsthand.

This is free, it will stay free, and it stores zero student PII. I'm not selling anything. I'm a practitioner who built a tool because the problem Flynn described matters, and I'd like USM's help validating whether it works.

Warm regards,
Aaron Pomeranz, PsyD
School Psychologist, Portland Public Schools (Maine)
apomeranz@alloflow.org
Demo: https://prismflow-911fe.web.app
Source: github.com/Apomera/AlloFlow
