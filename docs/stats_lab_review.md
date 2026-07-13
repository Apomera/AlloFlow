# Statistics Lab — deep-dive review (2026-06-21)

> **Historical review snapshot, not current open-bug status (2026-07-09):** This June deep dive is preserved for its analysis of the tool at that time. Later STEM refinements and QA reports may have changed individual findings; verify against current source/mirrors/tests before treating an item as open.

Tool: `stem_lab/stem_tool_statslab.js` (`statsLab`, ~5,540 lines). A genuine inferential
statistics package (AP Psych / AP Bio focus): descriptives, t-tests, ANOVA + Tukey,
correlation, linear & multiple regression, chi-square, repeated-measures ANOVA, Mann-Whitney,
Wilcoxon, power analysis. p-values delegate to **jStat** (lazy-loaded from a CDN, graceful
fallback). Directly relevant to a school psychologist's assessment-stats work — so its
correctness matters to the platform's credibility.

## Headline

**The statistics are correct and the pedagogy is scientifically honest — a genuinely
high-quality tool.** I verified the engine by hand and found no math errors; the only concrete
gap was a missing degenerate-data guard in regression (now fixed). The main contribution is a
test suite that locks the trusted engine.

## What's verified correct

- **Descriptives** (`:124`–167): mean, median, mode; **`variance(arr, sample)` handles n−1
  (sample, default) vs n (population) correctly**; and — the part most implementations get
  wrong — **skewness and kurtosis use the bias-corrected G1/G2 formulas** (matching Excel
  SKEW/KURT), not the naive population versions. Quartiles use the standard R-7 interpolation.
- **t-tests**: one-sample (t, df=n−1, Cohen's d) ✓; paired ✓; independent — **both pooled and
  Welch's, and the Welch-Satterthwaite df is exactly right** (`:284`), the #1 place people slip.
  Pooled-SD Cohen's d and t-critical CIs ✓.
- **Linear regression** (`:427`): least-squares slope/intercept, R², **adjusted R² (n−2)**, SE
  of slope (sₑ/√Σdx²), and the overall F-test all correct.
- **p-value plumbing**: delegated to jStat (`studentt.cdf` / `centralF.cdf` / `chisquare.cdf` /
  `normal.cdf`) — a trusted library; two-tailed = 2·P(T>|t|) ✓, t-critical via `.inv` ✓.
- **Interpretation honesty** (this is the standout): the tool actively teaches *against* the
  classic misconceptions. It defines the p-value correctly ("NOT the probability H₀ is true…
  given H₀, how often you'd see data this extreme", `:4846`), gives the correct frequentist CI
  interpretation (`:3545`), grades student write-ups for the "5% chance the result is wrong"
  error (`:1731`), and uses graded strength-of-evidence language ("no significant evidence",
  never "proves the null"). The quiz bank covers significance≠importance, Type II/power, and
  CI misreadings. Aligns with the project's scientific-integrity stance.

## Fix applied

**Regression with constant predictor (`denom = Σ(x−x̄)² = 0`) had no guard** (`:442`) — all-
identical x → `slope = num/0` → NaN/Infinity reaching the student (chi-square and multiple
regression *were* guarded). Added a clean early-return: *"All x values are identical — the
slope is undefined (a vertical line has no finite slope)."*

## Tests

`tests/stats_lab_science.test.js` (2): renders the data-tab summary card with hand-verified
datasets and pins the descriptive engine — mean, **sample SD (n−1, not the population value)**,
median, and the **bias-corrected G1 skewness** (0.82 and 2.35) — so a future refactor of this
numerically-critical, trusted code can't silently break it. (jStat-dependent p-values aren't
render-testable in jsdom; the test statistics were verified by hand above.)

## Notes / possible follow-ups (not done)
- **jStat is a CDN dependency**: if jsdelivr is blocked (CSP) or offline, the whole inferential
  half shows NaN / "(loading…)". It degrades gracefully, but a bundled/offline fallback would
  make the inferential tools robust in locked-down environments.
- A zero-variance t-test (`se = 0` → `t = ±Infinity`) is mathematically degenerate but
  un-guarded; lower priority than the regression case (it at least renders a finite-looking
  "Infinity" rather than NaN).
- Extend the locking tests to the inferential statistics once jStat is available in the test
  env (vendor it, or stub the specific CDFs).
