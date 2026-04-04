# Email to Hayley Didriksen — DRAFT

## VERSION A: After Jesse's Referral (Preferred)

**To:** didrih@portlandschools.org
**From:** Aaron Pomeranz
**Subject:** Title II Document Accessibility — Free Remediation Tool (Jesse Applegate Suggested I Reach Out)

---

Hi Hayley,

I'm Aaron Pomeranz — I just started as a school psychologist in Student Support Services this week. Jesse Applegate suggested I reach out to you about something that may be relevant to the district's Title II ADA compliance work.

Over the past several months, I've been developing an open-source educational platform called AlloFlow. One of its components is a document accessibility remediation pipeline — it takes PDFs and other digital documents, runs them through multi-auditor AI analysis combined with axe-core verification (the same WCAG checker used by major corporations), auto-remediates common violations, and generates a compliance portfolio report documenting the before/after results.

I know the April 24th Title II deadline requires WCAG 2.1 AA conformance for all public-facing digital content, and that professional remediation services typically run $5–25 per page. AlloFlow's pipeline handles 70–80% of standard documents automatically, at zero cost. It processes everything locally in the browser — no documents leave the device, no data is transmitted externally.

A few relevant details:

- **External validation:** I've been working with Knowbility (the organization behind AccessU) on an accessibility audit of the platform. They've expressed interest and are currently scoping the engagement.
- **No budget required:** AlloFlow is free and open-source (GNU AGPL v3). The only potential cost would be Knowbility's audit fee, which validates the tool for any district that uses it.
- **Privacy architecture:** Zero student data is collected or stored. Everything runs client-side in localStorage.

I'd be happy to run a small batch of the district's public-facing documents through the pipeline and share the results — no commitment needed, just a demonstration of what it can do. Would a brief meeting or demo be useful?

Best,
Aaron Pomeranz, PsyD
School Psychologist, Student Support Services
Portland Public Schools

---

## VERSION B: Standalone (If Jesse Doesn't Make the Connection)

**To:** didrih@portlandschools.org
**From:** Aaron Pomeranz
**Subject:** Title II Document Accessibility — A Resource That Might Help

---

Hi Hayley,

I'm Aaron Pomeranz — I'm starting as a school psychologist in Student Support Services next week. I wanted to introduce myself and flag something that may be relevant to the Data & Technology team's work.

I know the April 24th Title II ADA deadline is approaching, requiring WCAG 2.1 AA conformance for all public-facing digital content. Professional remediation at $5–25 per page can be prohibitive for districts with large document libraries.

I've developed a free, open-source tool called AlloFlow that includes a document accessibility remediation pipeline. It combines AI-powered analysis with axe-core automated WCAG verification to identify and auto-fix common accessibility violations in PDFs and HTML documents. It produces a compliance portfolio report suitable for documentation purposes. Everything processes locally — no documents leave the device.

I'm currently working with Knowbility (the organization behind AccessU and the AIR program) on external accessibility validation of the platform. They've expressed interest in the project and are scoping a formal audit.

I realize this may already be well in hand on your end — I just wanted to make sure you knew the resource exists in case it's useful. I'm happy to run a few sample documents through the pipeline and share what it finds, with no commitment needed.

Would a brief conversation be helpful, or should I connect with someone else on your team?

Best,
Aaron Pomeranz, PsyD
School Psychologist, Student Support Services
Portland Public Schools

---

## NOTES ON TONE & STRATEGY

### What the email does:
- Leads with the PROBLEM (Title II deadline, cost of remediation), not the tool
- Positions Aaron as helpful colleague, not a vendor or a pitchman
- Names Knowbility immediately for credibility
- Emphasizes "free" and "no data leaves the device" — the two objection-killers
- Offers a low-commitment next step (run sample docs, share results)
- Keeps it under 200 words of body text — Hayley is busy

### What the email does NOT do:
- Mention AI-generated educational content, clinical tools, or student-facing features
- Pitch AlloFlow as a platform — it's framed as a compliance utility
- Ask for a formal meeting or approval process — just "would a conversation be helpful?"
- Oversell — "70-80% of standard documents" is honest, not "it fixes everything"

### Why Version A is better:
- "Jesse Applegate suggested I reach out" = instant credibility
- She knows Jesse. She doesn't know you yet.
- A referral from a fellow department head transforms this from unsolicited to endorsed

### Hayley-specific framing notes:
- Her Harvard CEPR and Abt Associates background means she respects evidence, methodology, and external validation — hence Knowbility front and center
- She handled PPS's Feb 2025 data breach — privacy/security language ("zero data transmitted, everything local") will resonate
- She's a researcher-turned-administrator — she'll appreciate the conciseness over a longer pitch
