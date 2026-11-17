#!/usr/bin/env python3
"""Writes tests/fixtures/report_writer_python_parity.json.

Report Writer's audit has two checks that exist twice: in Python
(report_checks.py, embedded in pyodide_runtime_module.js) and in the app
(rwCheckDateArithmetic and rwCheckCitations in report_writer_module.js), for
devices where the Python runtime cannot load. This runs the real Python on a
fixed set of texts and saves its answers; tests/report_writer_in_app_audit_checks.test.js
holds the in-app copy to them.

Run it again after changing either check or the cases below:
    python dev-tools/build_report_writer_parity_fixture.py
"""
import json
import os
import types

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODULE = os.path.join(ROOT, "pyodide_runtime_module.js")
OUT = os.path.join(ROOT, "tests", "fixtures", "report_writer_python_parity.json")

source = open(MODULE, encoding="utf-8").read()
START = "const REPORT_CHECKS_PY = String.raw`"
begin = source.index(START) + len(START)
report_checks = types.ModuleType("report_checks")
exec(compile(source[begin:source.index("`;", begin)], "report_checks.py", "exec"), report_checks.__dict__)

CHUNKS = [
    {"text": "WISC-V Full Scale IQ 97 (standard score; Average)"},
    {"text": "BASC-3 (Parent) Hyperactivity 68 (T-score)"},
    {"text": "Referral Reason: Referred by the classroom teacher in March."},
    "Woodcock-Johnson IV Broad Reading 88",
]
# Only a date that carries its year is read as a date; the cases with bare
# number pairs are here to hold both copies to that.
CASES = [
    "For ages 8-12 the program ran 2 weeks; grades 9-12 followed, with 3/4 trials correct after 6 weeks and scores of 4-5.",
    "Seen on 9/2 and again 4 weeks later on 9/20.",
    "Testing began on September 2, 2026 and ended 4 weeks later on September 20, 2026.",
    "Testing began on September 2, 2026 and ended 4 weeks later on Sept. 30, 2026.",
    "Referred 2 March 2026; evaluated 3 months later on 14th December 2026.",
    "Intake was 2026-01-05 and the review came 1 year later on 2027-01-04.",
    "Intake was 2026-01-05 and the review came 2 months later on 2026-09-05.",
    "First seen Jan 5, 2026, then 10 days later on 1/15/2026, then 2 weeks later on 2026-03-01.",
    "The student may 5, 2026 times out of 10 respond; in may 2026 we met 2 weeks later than May 2026.",
    "Seen February 30, 2026 and 1 week later on March 9, 2026; also 2026-13-01 and 1 day later 2026-12-02.",
    "Testing began on 9/2/2026 and ended 4 weeks later on 9/20/2026.",
    "Testing began on 9/2/2026 and ended 4 weeks later on 9/30/2026.",
    "The first session was 1/5/26; the second came 1 day later, on 1/6/26, and the last 2 months later on 3/9/26.",
    "Seen on 13/2/2026 and again 3 weeks later on 6/3/2026.",
    "Observed 2-14-2025, then 1 year later on 2-14-2026, then 10 days later on 4-1-2026.",
    "On 2/30/2026 nothing happened. On 12/1/2025 intake; 6 months later, 6/2/2026, review.",
    "A score of 85-115 is average. Sessions ran 3/1/2026 to 3/8/2026, 1 week apart.",
    "Evaluated 10/1/2026." + (" filler" * 40) + " Then 2 weeks later on 12/25/2026.",
    "Per the WISC-V results, reasoning was average. According to the Zorblax Battery findings, attention was weak.",
    "Based on the BASC-3 report and the Woodcock Johnson IV assessment, as well as the Teacher interview.",
    "According to the Vineland Adaptive Behavior Scales profile and per the Conners 4 data, plus the BASC results.",
    "the Parent report, the ABC data, per the Zorblax Battery results and again the Zorblax Battery findings.",
    "According to the Wide Range Achievement Test score, and based on the Woodcock-Johnson protocol.",
    "Nothing to see here: no dates, no sources.",
]
FIELDS = ("claim", "finding", "status", "severity", "fix_hint")


def trimmed(findings):
    return [{key: finding[key] for key in FIELDS} for finding in findings]


cases = [{
    "text": text,
    "dates": trimmed(report_checks.check_date_arithmetic(text)),
    "citations": trimmed(report_checks.check_citations(text, CHUNKS)),
} for text in CASES]

# Whole-audit sample: score sections written the way Report Writer's prompt
# phrases scores, with each test's own labels. "correct" reports must not be
# blocked; each "planted" one carries one error. The test runs the app's own
# score verifier on the same text, so the two can be compared.
REPORTS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "report_writer_audit_sample_reports.json"), encoding="utf-8"))
SCORE_TYPE = {"standard": "standard score", "T-score": "T-score"}


def ordinal(n):
    return "%d%s" % (n, "th" if 10 <= n % 100 <= 20 else {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th"))


def fact_text(s):
    # The text Report Writer now sends for a score fact: source, field, then
    # rwScoreFactText's "value (type; label; percentile; CI)".
    parts = [SCORE_TYPE.get(s.get("scoreType"), "standard score")]
    if s.get("classification"):
        parts.append(s["classification"])
    if s.get("percentile") is not None:
        parts.append(ordinal(int(s["percentile"])) + " percentile")
    if s.get("ciLow") is not None:
        parts.append("%s%% CI %s-%s" % (s.get("ciLevel", 95), s["ciLow"], s["ciHigh"]))
    return "%s %s %s (%s)" % (s["assessment"], s["subtest"], s["score"], "; ".join(parts))


reports = []
for report in REPORTS:
    chunks = [{"id": "c%d" % i, "text": fact_text(s)} for i, s in enumerate(report["scores"])]
    found = json.loads(report_checks.audit(json.dumps({"Results": report["text"]}), json.dumps(chunks), json.dumps(report["scores"])))
    reports.append(dict(report, python=trimmed(found)))

with open(OUT, "w", encoding="utf-8", newline="\n") as handle:
    json.dump({"generatedBy": "dev-tools/build_report_writer_parity_fixture.py", "chunks": CHUNKS, "cases": cases, "reports": reports},
              handle, ensure_ascii=False, indent=1)
    handle.write("\n")
print("%d cases: %d date findings, %d citation findings; %d sample reports" % (
    len(cases), sum(len(c["dates"]) for c in cases), sum(len(c["citations"]) for c in cases), len(reports)))
