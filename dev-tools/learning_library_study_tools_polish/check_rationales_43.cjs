'use strict';

module.exports = {
  ap_chemistry_foundation_pilot: {
    'ap-chem-ch-07-check-02': {
      rationale:
        "Reversing A <=> 2 B to 2 B <=> A swaps reactants and products in the mass-action expression, replacing K = [B]^2/[A] with its reciprocal K' = [A]/[B]^2 = 1/K. At the same temperature, K' = 1 / 4.0 = 0.25, whereas 2.00 or 16.00 come from taking a root or squaring instead of inverting.",
    },
  },
  ap_statistics_foundation_pilot: {
    'ap-stats-ch-02-section-02-transfer-check': {
      rationale:
        'Conditional probability P(A | B) = P(A and B) / P(B) restricts the reduced sample space to outcomes where event B has already occurred. Because you are finding the fraction of B outcomes that also satisfy A, outcomes in event B supply the denominator rather than event A or outcomes outside B.',
    },
    'ap-stats-ch-03-section-01-transfer-check': {
      rationale:
        'Estimating a single unknown population proportion p from one categorical sample calls for a confidence interval based on the standard normal model: a one-proportion z interval. By contrast, t procedures target quantitative means and two-sample tests compare two groups rather than estimating one p.',
    },
    'ap-stats-ch-03-section-02-transfer-check': {
      rationale:
        'A p-value is computed by assuming the null hypothesis is true and measuring the probability of observing a sample statistic at least as extreme as the observed result by random chance alone. It never gives the probability that the alternative hypothesis is proven true or that the statistic equals the parameter.',
    },
    'ap-stats-ch-04-section-01-transfer-check': {
      rationale:
        'Because the sample mean x-bar is an unbiased estimator of the population parameter mu, its sampling distribution across repeated random samples has expected value E(x-bar) = mu and centers at the population mean. Sample size n and standard deviation affect the spread of x-bar, not its center.',
    },
    'ap-stats-ch-04-section-02-transfer-check': {
      rationale:
        'A paired t procedure applies when observations are naturally linked, such as repeated measures on the same subject or matched pairs, so each unit yields one within-pair difference. Analyzing that single list of quantitative differences removes between-unit variation that independent-group methods do not separate.',
    },
    'ap-stats-ch-05-section-02-transfer-check': {
      rationale:
        'In least-squares linear regression, a residual equals observed response minus predicted response (e = y - y-hat), measuring the signed vertical distance from a data point to the fitted line. Positive residuals lie above the regression line and negative residuals lie below it.',
    },
    'ap-stats-ch-05-section-03-transfer-check': {
      rationale:
        'The coefficient of determination r-squared quantifies the proportion of variation in the response variable explained by the linear relationship with the explanatory variable, taking values from 0 to 1. Because strong linear fit can still arise from confounding variables, r-squared alone never establishes causation.',
    },
  },
  school_librarian_5312: {
    'sl5312-ch-02-check-01': {
      rationale:
        'In annual fiscal planning, responsible stewardship ties every budget line to documented campus priorities and ongoing lifecycle costs like renewals, repairs, and replacements. Transparent, evidence-based budgeting defends funding requests while ensuring purchases expand equitable learner access.',
    },
    'sl5312-ch-02-check-02': {
      rationale:
        'Strong operational evaluation pairs process metrics (such as scheduling, access barriers, and participation) with learner-outcome evidence rather than relying solely on circulation counts. Reviewing both operational delivery and learning impact lets the librarian pinpoint service gaps and refine programs.',
    },
    'sl5312-ch-02-check-03': {
      rationale:
        'Formalizing library governance requires board-aligned written procedures developed with stakeholder input that codify legal compliance, safety, borrower privacy, reconsideration, and appeals. Clear operational rules prevent ad hoc decisions and keep daily staff routines fair and defensible.',
    },
    'sl5312-ch-02-check-04': {
      rationale:
        'Before allocating operational funds or staff time, a librarian conducts a needs assessment combining disaggregated usage, achievement, curriculum, access, and stakeholder feedback. Examining subgroup gaps prevents schoolwide averages from masking underserved learners during budget planning.',
    },
    'sl5312-ch-02-check-05': {
      rationale:
        'Operational routines and evaluation benchmarks work best when anchored to a mission and measurable goals aligned with school priorities and learner needs. Explicitly embedding open access and intellectual freedom into those goals keeps daily management true to core librarianship standards.',
    },
    'sl5312-ch-04-check-01': {
      rationale:
        'Routine deselection keeps the discovery catalog trustworthy and shelves easy to browse by removing outdated, damaged, or redundant titles under board-approved criteria. Weighing accuracy, condition, usage, and curricular fit ensures weeding improves navigability without drifting into personal censorship.',
    },
    'sl5312-ch-04-check-02': {
      rationale:
        'Flexible scheduling and accessible physical and digital portals ensure classes and individual learners can reach collections and tools at the point of instructional need. Rigid fixed-only calendars restrict point-of-need inquiry and disadvantage students whose schedules or devices limit library entry.',
    },
    'sl5312-ch-04-check-03': {
      rationale:
        'Borrower confidentiality in circulation and interlibrary loan workflows depends on data minimization: capturing only essential transaction fields, purging reading histories once items return, restricting staff access, and honoring lawful lending agreements so students can inquire freely without surveillance.',
    },
    'sl5312-ch-04-check-04': {
      rationale:
        'Discovery serves every learner when acquisitions follow board selection policy, curriculum and community data, professional reviews, and diversity audits. Grounding curation in accessibility and representation ensures catalog searches return relevant materials for all.',
    },
    'sl5312-ch-04-check-05': {
      rationale:
        'Standardized bibliographic records, controlled subject headings, and authorized access points make catalog searching predictable across print and digital holdings. Writing objective, unbiased local notes further supports equitable discovery by avoiding stigmatizing terminology that hides resources from learners.',
    },
    'sl5312-ch-06-check-01': {
      rationale:
        "Handling a reconsideration challenge through established, viewpoint-neutral policy safeguards both due process and students' First Amendment access while formal review proceeds. This approach respects an individual family's choices for their own child without removing materials from the wider school community.",
    },
    'sl5312-ch-06-check-02': {
      rationale:
        'Ethical media use in schools goes beyond citing a source; educators and students must check copyright ownership, database or Creative Commons license terms, public-domain status, permissions, and the four fact-specific fair-use factors before copying, remixing, or distributing protected content.',
    },
    'sl5312-ch-06-check-03': {
      rationale:
        'Comprehensive digital citizenship instruction equips students to manage digital footprints, seek consent before posting, safeguard personal data, engage in respectful dialogue, and recognize algorithmic bias and platform risks. Teaching these habits actively prepares learners for responsible online participation.',
    },
    'sl5312-ch-06-check-04': {
      rationale:
        'Pairing ethical inquiry with search planning teaches learners to turn broad topics into focused questions, keywords, synonyms, chosen databases, and iterative plans. Methodical searching supports intellectual freedom by helping students investigate varied viewpoints.',
    },
    'sl5312-ch-06-check-05': {
      rationale:
        'Within digital citizenship instruction, evaluating sources by authority, supporting evidence, purpose, currency, context, and cross-source corroboration trains students to verify claims before sharing or citing them. Judging fit for the inquiry task prevents reliance on misleading or out-of-context online posts.',
    },
    'sl5312-ch-08-check-01': {
      rationale:
        'When collecting learning evidence across diverse classrooms, holding learning targets steady while offering varied text formats, language supports, assistive tools, and response modes separates true mastery from access barriers. This ensures every student can demonstrate understanding without lowering academic rigor.',
    },
    'sl5312-ch-08-check-02': {
      rationale:
        'In a differentiated inquiry unit, formative checks add value when ongoing evidence is shared with students to deliver specific, actionable coaching and reshape upcoming scaffolds. Adjusting instruction mid-unit helps learners close skill gaps before summative products are due.',
    },
    'sl5312-ch-08-check-03': {
      rationale:
        "Differentiating for diverse readers means matching authentic book choice, culturally sustaining titles, and multiple reading formats to each learner's interests and background. Pairing open access with welcoming dialogue and warm guidance builds motivation without stigmatizing reading levels.",
    },
    'sl5312-ch-09-check-01': {
      rationale:
        "A dedicated reading culture flourishes when librarians know learners' identities and preferences, curate wide-ranging collections, remove borrowing barriers, and invite peer-and-adult book talk. Supporting genuine choice and community dialogue nurtures lifelong readers far better than rigid points programs.",
    },
    'sl5312-ch-09-check-02': {
      rationale:
        'Building media literacy alongside critical reading teaches students to verify claims across print, visual, audio, and social platforms by tracing primary evidence and analyzing persuasive techniques. Adding ethical sharing habits ensures readers evaluate accuracy before amplifying information.',
    },
    'sl5312-ch-09-check-03': {
      rationale:
        'Active reading workshops and collaborative media inquiry run smoothly when students help shape shared norms, move predictably across quiet and collaborative zones, and practice responsible device routines. Restorative responses preserve belonging and keep learners engaged in inquiry rather than excluded.',
    },
    'sl5312-ch-09-check-05': {
      rationale:
        'Partnering early with classroom teachers to co-plan standards, media-inquiry targets, shared teaching roles, accessible texts, and formative checkpoints weaves reading engagement into core coursework. Planning transfer together ensures learners apply critical media skills beyond a single library visit.',
    },
    'sl5312-ch-10-check-01': {
      rationale:
        'Designing purposeful physical and digital spaces requires intentional zone layouts, clear transition routines, explicit technology workflows, and co-created community norms. Using restorative responses when disruptions arise maintains a welcoming, orderly environment without cutting off tool access.',
    },
    'sl5312-ch-10-check-02': {
      rationale:
        'Responsible technology integration puts instructional goals ahead of novelty, vetting every digital tool for WCAG accessibility, student data privacy, technical reliability, and evidence of learning impact. Adopting tools on those criteria ensures library tech widens access instead of adding friction.',
    },
    'sl5312-ch-10-check-03': {
      rationale:
        'Technology-enabled library spaces have the greatest instructional impact when librarians and teachers co-plan standards, inquiry goals, co-teaching roles, accessible digital resources, and formative checks in advance. Early co-design aligns space and tools directly to classroom learning transfer.',
    },
    'sl5312-ch-10-check-04': {
      rationale:
        'Integrating technology effectively starts with observable, cognitively rigorous learner outcomes and then aligns modeling, guided practice, digital tools, and assessment to those exact targets. This prevents flashy apps or maker gadgets from eclipsing the substantive thinking students are meant to master.',
    },
    'sl5312-ch-10-check-05': {
      rationale:
        'In a technology-rich library, accessibility and differentiation mean preserving high academic expectations while leveraging multimodal representations, translation and language aids, scaffolds, assistive tools, and flexible creation formats so every learner can participate fully.',
    },
    'sl5312-ch-11-check-04': {
      rationale:
        'Instructional leadership with faculty succeeds when professional learning is rooted in campus needs data and structured around modeling, guided rehearsal, job-embedded feedback, and follow-up impact review. Sustained coaching changes classroom practice far more reliably than one-off slide workshops.',
    },
    'sl5312-ch-11-check-05': {
      rationale:
        "Campus instructional leadership expands its reach through reciprocal alliances linking students, families, faculty, public libraries, and local partners around shared literacy and inquiry goals. Two-way collaboration multiplies expertise and access while honoring each partner's voice.",
    },
    'sl5312-ch-12-check-01': {
      rationale:
        'Persuasive messaging for administrators and funding decision makers pairs documented learner needs and program outcomes with concrete student stories tailored to district priorities. Closing with a clear, feasible ask turns awareness of library impact into actionable resource support.',
    },
    'sl5312-ch-12-check-02': {
      rationale:
        'Embedding needs-driven capacity-building, complete with live modeling, rehearsal, feedback, and outcome tracking, into collaborative communication equips educators to use library tools confidently. Ongoing shared learning creates visible instructional impact that deepens campus buy-in.',
    },
    'sl5312-ch-12-check-03': {
      rationale:
        'Durable external alliances with families, public libraries, and community organizations rest on mutual benefit, shared literacy goals, and consistent two-way communication. Framing outreach as reciprocal partnership rather than one-way solicitation sustains long-term community investment.',
    },
    'sl5312-ch-12-check-04': {
      rationale:
        'Presentations to families and governing boards resonate most when objective program metrics and identified student needs are paired with vivid classroom examples linked directly to community priorities. Including a realistic, well-scoped ask helps stakeholders see exactly how to champion the library.',
    },
    'sl5312-ch-12-check-05': {
      rationale:
        'Coordinating campus-wide initiatives works best when the librarian models job-embedded professional learning anchored in real staff needs, hands-on demonstration, rehearsal, coaching feedback, and measurable learner impact. Demonstrating tangible classroom gains simultaneously serves as credible advocacy.',
    },
  },
  special_education_learning_disabilities_5383: {
    'ld5383-ch-12-check-05': {
      rationale:
        'After a structured math intervention for learners with SLD, checking target mastery and diagnosing recurring error patterns supplies actionable data to adjust explicit instruction and scaffolds. Tracking worksheet coverage, personal warmth, or blaming motivation fails to guide the next instructional step.',
    },
  },
};
