'use strict';

module.exports = {
  memoryAids: {
    ap_calculus_ab_foundation_pilot: {
      'ap-calc-ab-memory-01-01': {
        content: [
          'Attempt direct substitution first; if 0/0 arises, factor, rationalize, or rewrite trigonometric forms rather than stopping at undefined.',
          'Compare left-hand and right-hand limits separately at piecewise boundaries, jump breaks, and vertical asymptotes.',
          'Analyze end behavior as x approaches ±infinity by comparing dominant terms to locate horizontal asymptotes.',
          'Verify all three continuity conditions at c: f(c) exists, the two-sided limit exists, and the limit equals f(c).',
          'Confirm continuity on [a, b] and check that target k lies between f(a) and f(b) before invoking the Intermediate Value Theorem (IVT) or Squeeze Theorem.',
        ],
      },
      'ap-calc-ab-memory-02-01': {
        content: [
          'Distinguish average rate of change (secant slope [f(b)-f(a)]/(b-a)) from instantaneous rate of change (limit of the difference quotient).',
          'Test continuity and compare left- and right-hand derivatives at piecewise joins before claiming differentiability.',
          'Rewrite roots, reciprocals, and simple products into power-rule form whenever possible to avoid unnecessary rule errors.',
          'Select product or quotient rules cleanly for multi-factor expressions and recall exact trig, exponential, and logarithmic derivatives.',
          'State the derivative value as an instantaneous rate with output-per-input units and verify tangent-line slope agreement.',
        ],
      },
      'ap-calc-ab-memory-03-01': {
        content: [
          'Peel composite functions from outer layer to inner layer with the Chain Rule, multiplying by each interior derivative in turn.',
          'When x and y are intertwined, differentiate every term with respect to x, attach dy/dx to y-terms, and isolate dy/dx algebraically.',
          "Evaluate inverse function derivatives via (f^-1)'(b) = 1 / f'(a) after confirming f(a) = b and f'(a) != 0.",
          'Apply inverse trigonometric derivative templates (arcsin, arctan, arcsec) alongside the chain factor for the argument u(x).',
          'Use repeated differentiation carefully for d^2y/dx^2 in implicit relations, substituting dy/dx back in before evaluating at a point.',
        ],
      },
      'ap-calc-ab-memory-04-01': {
        content: [
          "Translate verbal rates into derivative notation (dV/dt, dr/dt, v(t) = x'(t), a(t) = v'(t)) and list known values at the target instant.",
          'For related rates, establish the general geometric or physical equation first, differentiate with respect to t, and substitute instantaneous values only afterward.',
          "Build tangent-line linearization L(x) = f(a) + f'(a)(x - a) and use the sign of f''(x) to justify whether L(x) overestimates or underestimates f(x).",
          'For particle motion, check the sign of v(t) for direction and compare the signs of v(t) and a(t) to determine whether speed is increasing or decreasing.',
          "Before applying L'Hospital's Rule, write the separate numerator and denominator limits to prove a 0/0 or infinity/infinity indeterminate form.",
        ],
      },
      'ap-calc-ab-memory-05-01': {
        content: [
          'Verify continuity on [a, b] and differentiability on (a, b) before citing the Mean Value Theorem (MVT) or Extreme Value Theorem (EVT).',
          "Find all critical points where f'(x) = 0 or f'(x) is undefined inside the domain, then track sign changes of f' for local extrema.",
          'For absolute extrema on a closed interval, apply the Candidates Test by comparing f(x) at every interior critical point and both endpoints.',
          "Determine concavity and points of inflection by verifying an actual sign change in f''(x), or use the Second Derivative Test when f'(c) = 0 and f''(c) != 0.",
          'In optimization, write the objective in one variable using the constraint, establish the feasible domain, and justify the global optimum analytically.',
        ],
      },
      'ap-calc-ab-memory-06-01': {
        content: [
          'Match the prompt to a Riemann sum (left, right, midpoint) or trapezoidal sum using exact subinterval widths, and check monotonicity for over/underestimates.',
          "Apply FTC Part 1 to differentiate accumulation functions g(x) = integral from a to u(x) of f(t) dt, multiplying by u'(x) when the upper bound is composite.",
          'Evaluate definite integrals with FTC Part 2 by finding an antiderivative F(x), computing F(b) - F(a), and adding +C for indefinite integrals.',
          'Select u-substitution when an inner derivative appears up to a constant factor, and convert definite integral bounds directly to u-values.',
          'Use algebraic division, splitting numerators, or completing the square to reduce rational integrands into power, ln|u|, or arctan(u) forms.',
        ],
      },
      'ap-calc-ab-memory-07-01': {
        content: [
          'Translate proportional-rate language directly into a differential equation such as dy/dt = ky, verifying units on both sides.',
          'Read slope fields by testing horizontal (dy/dx = 0), vertical, and sign-change patterns along axes and equilibrium lines before sketching a curve.',
          'Separate variables completely into g(y) dy = f(x) dx before integrating both sides; never integrate a mixed expression directly.',
          'Introduce a single constant of integration C immediately upon integrating, and solve for C using the initial condition (x0, y0) before simplifying when cleaner.',
          'Isolate y(x) explicitly, select the correct branch sign for roots or absolute values using (x0, y0), and state the domain interval containing x0.',
        ],
      },
      'ap-calc-ab-memory-08-01': {
        content: [
          "Compute average value with (1/(b - a)) times the integral of f(x) dx on [a, b] and net change via x(b) = x(a) + integral of x'(t) dt, using integral of |v(t)| dt for total distance.",
          'For accumulation rates in context, pair inflow and outflow rates as the integral of (R_in - R_out) dt and check critical points where R_in(t) = R_out(t).',
          'Set up area between curves by solving for intersection bounds and integrating (top - bottom) dx or (right - left) dy over each non-overlapping region.',
          'For cross-sectional solids, express the base length s = top - bottom (or right - left) and integrate the exact cross-section area formula A(x) over the base.',
          'For solids of revolution, measure outer radius R and inner radius r from the exact axis of rotation (not just the coordinate axis) and integrate pi * (R^2 - r^2).',
        ],
      },
    },
    ap_statistics_foundation_pilot: {
      'ap-stats-ch-01-memory': {
        content:
          'Identify the quantitative or categorical variable and study design → describe distributions with SOCS (shape, outliers via 1.5×IQR, center: mean/median, spread: SD/IQR) using comparative language for multiple groups → match robust summaries (median, IQR) to skewed data and mean/SD or z-scores (z = (x − μ)/σ) to roughly symmetric distributions → verify random sampling (SRS, stratified, cluster) for population generalization and random assignment (with control, replication, and blocking) for causal claims → state conclusions strictly within the sampled population and design scope.',
      },
      'ap-stats-ch-02-memory': {
        content:
          'Define the random event or discrete/continuous random variable X → choose two-way tables, tree diagrams, General Addition/Multiplication rules, Binomial (BINS: Binary, Independent, fixed Number n, Same p; μ = np, σ = √(np(1−p))), Geometric, or Normal models → check independence (P(A|B) = P(A)) and the 10% condition when sampling without replacement → combine independent random variables using μ_{X±Y} = μ_X ± μ_Y and σ²_{X±Y} = σ²_X + σ²_Y (variances always add) → interpret probabilities and expected values as long-run relative frequencies or averages over many repeated trials.',
      },
      'ap-stats-ch-03-memory': {
        content:
          'Define the population proportion(s) p (or p₁ − p₂) or categorical distribution → select a 1-proportion z-interval/test, 2-proportion z-interval/test, or chi-square test (goodness-of-fit, homogeneity, independence) → verify Random selection/assignment, the 10% condition (n ≤ 0.10N), and Large Counts (np̂ ≥ 10 and n(1−p̂) ≥ 10 for intervals; np₀ ≥ 10 for 1-prop tests; pooled p̂_c for 2-prop tests; all expected counts ≥ 5 for χ²) → compute z or χ² = Σ(O − E)²/E and the p-value or interval estimate → compare p-value to α (noting Type I/II error and power trade-offs) and conclude in context without claiming to prove H₀.',
      },
      'ap-stats-ch-04-memory': {
        content:
          'Define the population mean μ, mean difference μ_diff (paired), or difference of means μ₁ − μ₂ (two independent groups) → match the study design to a 1-sample t, paired t, or 2-sample t interval/test (t = (stat − null)/SE, using s/√n and exact or conservative df) → check Random selection/assignment, 10% condition, and Normal/Large Sample (normal population, n ≥ 30 by CLT, or sample plot showing no strong skewness or outliers) → calculate the t-statistic, df, and p-value or x̄ ± t*(s/√n) → interpret the confidence interval or significance decision directly in terms of the mean parameter and measurement units.',
      },
      'ap-stats-ch-05-memory': {
        content:
          'Inspect the scatterplot for direction, unusual features (outliers, high-leverage points), form, and strength before fitting a least-squares line ŷ = a + bx → interpret slope b as predicted change in y per 1-unit increase in x, r as linear strength/direction, r² as proportion of y-variation explained, and s as typical residual size → verify LINE conditions for slope inference (Linearity via a random residual plot, Independence/10%, Normal residuals, Equal residual variance) → compute t = (b − β₀)/SE_b with df = n − 2 from regression output → bound predictions inside the observed x-domain (no extrapolation) and keep claims associative unless randomly assigned.',
      },
    },
    ap_us_government_foundation_pilot: {
      'ap-usg-ch-01-memory': {
        content:
          'Identify the democratic model (participatory, pluralist, or elite) or constitutional principle (separation of powers, checks and balances, federalism) → specify the textual mechanism (Commerce Clause, Necessary and Proper Clause, Supremacy Clause, Tenth Amendment, or categorical/block grants and mandates) → anchor the claim to required documents and precedent (Declaration of Independence, Articles of Confederation, Federalist No. 10 and No. 51 vs. Brutus No. 1, McCulloch v. Maryland, and U.S. v. Lopez) → state the constitutional limit on federal versus state authority in the specific policy context.',
      },
      'ap-usg-ch-02-memory': {
        content:
          'Pinpoint the branch or linkage actor (House Rules Committee/discharge petition, Senate filibuster/cloture and advise-and-consent, presidential veto/executive order/bully pulpit, federal judiciary, or bureaucratic agency) → trace the constitutional or institutional check (bicameral lawmaking, power of the purse, oversight hearings, Federalist No. 70 unitary energy vs. Federalist No. 78 judicial independence, Marbury v. Madison judicial review, discretionary rulemaking) → link the mechanism to a concrete interbranch tension or iron triangle/issue network → note the structural limit on unilateral action.',
      },
      'ap-usg-ch-03-memory': {
        content:
          'Distinguish civil liberties (Bill of Rights restraints on government) from civil rights (Fourteenth Amendment Equal Protection guarantees against discrimination) → identify the governing clause and doctrine (Establishment/Free Exercise, Free Speech time-place-manner/clear-and-present-danger, selective incorporation via Fourteenth Amendment Due Process, procedural vs. substantive due process) → cite controlling precedent or text (Engel v. Vitale, Wisconsin v. Yoder, Tinker v. Des Moines, Schenck v. U.S., Gideon v. Wainwright, McDonald v. Chicago, Brown v. Board of Education, Letter from Birmingham Jail) → state how courts balance individual liberty against compelling government interests.',
      },
      'ap-usg-ch-04-memory': {
        content:
          'Connect core American political values (individualism, equality of opportunity, free enterprise, rule of law, limited government) and socialization agents (family, education, peers, media, lifecycle/generational effects) to liberal, conservative, or libertarian policy stances → evaluate public opinion data by checking probability sampling, question wording, sample size, and margin of error (identifying statistical ties inside ±MOE) → link ideological coalitions to fiscal policy (taxation/spending) versus Federal Reserve monetary policy → specify what a single poll can and cannot prove about lasting voter realignment.',
      },
      'ap-usg-ch-05-memory': {
        content:
          'Identify the participation channel (voting models—rational choice, retrospective, prospective, party-line—political parties, interest groups, PACs/Super PACs, or news/social media) → explain the structural mechanism (15th/19th/24th/26th Amendments, Voting Rights Act, registration laws, winner-take-all Electoral College and single-member districts, primary/caucus rules, lobbying/amicus briefs, FEC limits, Citizens United v. FEC) → connect to empirical evidence on voter turnout, incumbency advantage, or free-rider/policy-agenda effects → recognize institutional and structural limits on third-party viability and individual voter influence.',
      },
    },
  },
  workshops: {
    teaching_reading_5205: {
      'tr5205-workshop-01': {
        prompt:
          "Analyze this kindergarten student's phonological and early spelling profile. (1) Identify the narrowest controlling phonemic awareness need supported by the evidence, separating oral segmentation from print knowledge. (2) Describe an explicit oral-to-encoding routine—with modeling, guided practice, tactile scaffolds, and classroom access supports—that builds full CVC phoneme segmentation without conflating spoken sounds with printed letters. (3) Justify why this match fits the student's readiness and specify brief progress-monitoring evidence showing transfer to CVC spelling.",
      },
      'tr5205-workshop-02': {
        prompt:
          "Evaluate this first-grade student's CVC decoding, guessing, and medial-vowel spelling data. (1) Identify the controlling word-reading and encoding need evidenced by stretched blending versus connected-text guessing. (2) Propose a coordinated instructional plan linking phoneme–grapheme mapping, cumulative blending, dictation, and controlled decodable text—with explicit modeling, guided practice, corrective feedback, and differentiation—while eliminating picture or context guessing. (3) Justify the instructional match and define formative checks that verify medial-vowel encoding and accurate transfer in connected reading.",
      },
      'tr5205-workshop-03': {
        prompt:
          "Examine this second-grade student's transition from regular one-syllable words to multisyllabic reading. (1) Identify the primary structural word-analysis need evidenced by first-syllable guessing and uneven syllable-type recognition. (2) Outline a focused, cumulative decoding and encoding routine targeting high-utility syllable patterns and familiar affixes, detailing explicit modeling, multisensory guided practice, meaning connections, and classroom differentiation. (3) Justify how this sequence leverages the student's strong oral language and specify assessment evidence signaling readiness for more complex multisyllabic words.",
      },
      'tr5205-workshop-04': {
        prompt:
          "Analyze this fourth-grade student's narrative fluency, informational accuracy, and comprehension profile. (1) Distinguish the relative roles of phrasing/prosody, multisyllabic academic word analysis, topic vocabulary, and sentence-level comprehension in the student's performance. (2) Design two coordinated instructional routines—covering modeling, guided practice, connected application, and differentiation—and explain why timed rate drills alone are insufficient. (3) Justify the instructional fit and specify separate measures to monitor prosodic transfer, academic decoding, and passage comprehension.",
      },
      'tr5205-workshop-05': {
        prompt:
          "Review this fifth-grade class's performance on grade-level science reading and summary writing. (1) Identify the controlling informational comprehension and vocabulary needs evidenced by fact-listing and missed text structures. (2) Plan an explicit instructional sequence that builds background knowledge, models text-structure analysis and gist synthesis using headings, diagrams, and causal signals, integrates text-dependent questions and written summaries, and differentiates without replacing grade-level text with simplified fact lists. (3) Justify your approach and explain how formative evidence will guide flexible regrouping and track summary transfer.",
      },
      'tr5205-workshop-06': {
        prompt:
          "Analyze this sixth-grade student's source comprehension, note-taking, and explanatory writing sample. (1) Identify the primary reading–writing integration needs shown by verbatim copying, unattributed notes, weak focus, and flat transitions. (2) Design an explicit instructional routine integrating purposeful annotation, paraphrasing, source tracking, controlling-idea organization, sentence combining, drafting, and revision—detailing modeling, guided practice, differentiation, and gradual release to independent writing. (3) Justify why this sequence matches the evidence and specify how you will evaluate both source comprehension and written expression.",
      },
      'tr5205-workshop-07': {
        prompt:
          "Evaluate this fourth-grade multilingual learner's science knowledge, home-language strengths, and developing English literacy profile. (1) Identify the specific English academic language, morphological, and syntactic needs while distinguishing developing English proficiency from disability. (2) Propose an explicit classroom plan that preserves grade-level science access, leverages multilingual assets strategically, teaches targeted English vocabulary and sentence structures through modeling and guided practice, and offers varied response options within appropriate classroom role boundaries. (3) Justify the instructional alignment and specify progress-monitoring evidence capturing growth in both English literacy and content understanding.",
      },
      'tr5205-workshop-08': {
        prompt:
          "Examine this third-grade student's response to documented, high-fidelity phonics intervention and ongoing word-reading data. (1) Identify the persistent foundational literacy needs evidenced in phonemic manipulation, automatic word recognition, spelling, and text transfer alongside strong listening comprehension. (2) Propose intensified, error-driven classroom instruction—including explicit modeling, guided practice, and accessible grade-level content participation—while specifying appropriate collaboration within the school's multidisciplinary team and classroom teacher role boundaries. (3) Justify why neither informal dyslexia labeling nor delaying a warranted evaluation is defensible, and define progress-monitoring data to share with the team.",
      },
      'tr5205-workshop-09': {
        prompt:
          "Analyze this fifth-grade advanced reader's comprehension strengths, worksheet disengagement, imprecise text citation, and hurried revision. (1) Identify the controlling instructional needs for intellectual depth, evidence precision, and revision craft rather than basic skill repetition. (2) Design a feasible classroom extension plan using challenging texts, inquiry, analytical writing craft, explicit modeling of precise citation and revision, and purposeful peer collaboration—without assigning extra busywork or using the student as a substitute tutor. (3) Justify why this plan fits the student's profile and specify clear criteria and assessment evidence for monitoring growth.",
      },
    },
  },
};
