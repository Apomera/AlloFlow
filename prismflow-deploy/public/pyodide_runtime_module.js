(function() {
'use strict';
if (window.AlloModules && window.AlloModules.PyodideRuntime) {
  console.log('[CDN] PyodideRuntime already loaded, skipping');
  return;
}

// pyodide_runtime_module.js — Pyodide-based Python sandbox for AlloFlow.
//
// Phase 2 of the Report Writer accuracy layer. Phase 1 added Gemini's
// server-side code execution for mid-generation sanity. This module adds
// client-side Python that runs deterministic post-generation checks
// (score-classification table lookups, numerical existence in fact chunks,
// date math, citation existence, etc.).
//
// Architecture:
//   • Lazy singleton — Pyodide (~10MB) is only fetched after first .get()
//   • One shared `pyodideInstance` across all callers; one shared init promise
//     so concurrent callers don't trigger duplicate downloads
//   • All checks live in `REPORT_CHECKS_PY` below — pure-Python, no I/O
//   • Public API:
//       PyodideRuntime.warmup()       — start download, returns promise
//       PyodideRuntime.ready()        — true once loaded
//       PyodideRuntime.run(code)      — eval Python, return JS value
//       PyodideRuntime.runAudit(opts) — run report_checks.audit(...) and
//                                       return findings array
//
// Phase 3 will fill REPORT_CHECKS_PY with the real check library; Phase 2
// ships just the runtime + smoke tests so the wiring is verifiable.

// ── Configuration ────────────────────────────────────────────────────
// Pinned version for reproducibility. Bump when Pyodide ships a new release
// and we've validated it still passes report_checks tests.
const PYODIDE_VERSION = '0.27.5';
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

// ── Embedded Python: report_checks ───────────────────────────────────
// Phase 3 — the real check library (was a stub through Phase 2). Inlined here
// (rather than fetched as a .py file) so (a) one CDN round-trip, (b) the JS
// module's version pins the Python's version automatically, (c) String.raw
// preserves all backslash escapes verbatim (every regex would otherwise need
// double-escaping).
//
// Edit the canonical source at lang_checks repo or C:/tmp/report_checks.py;
// re-embed via embed_python.cjs. Do NOT hand-edit the literal below — any
// backtick or ${ in the Python will break the template literal.
const REPORT_CHECKS_PY = String.raw`
"""
report_checks — deterministic accuracy checks for AlloFlow Report Writer.

Phase 3 (2026-05-31). Pure-Python. No external dependencies beyond Pyodide
stdlib (math, re, json, statistics, datetime).

What it catches that the LLM keeps getting wrong:
  - Score-classification mismatches ("SS 88 (Average)" — should be Low Average)
  - SS↔percentile consistency ("SS 110 (95th percentile)" — actually ~75th)
  - Numeric claims absent from fact chunks (LLM hallucinated scores)
  - Date arithmetic ("4 weeks later on 9/30" — that's 18 days, not 4 weeks)
  - Flesch-Kincaid grade level mismatching the stated target audience
  - Citations to sources that don't appear in any fact chunk

Design notes:
  - Findings are ADVISORY. Severity tells the JS-side self-heal whether to
    regenerate ('high') or surface to the clinician for review ('medium' /
    'low').
  - We use only universal descriptive classification ranges (the same ones
    SCORE_CLASSIFICATIONS uses in report_writer_module.js:82-90). No
    publisher-specific norm tables are embedded.
  - SS↔percentile conversion uses the normal CDF (pure statistics).
  - Everything is wrapped in try/except so one broken check can't take the
    whole audit down.
"""

import json
import math
import re
import statistics
from datetime import datetime, timedelta

VERSION = "0.3.0"

# ─── Public classification ranges ───────────────────────────────────────
# Universal descriptive standards (mirrors JS SCORE_CLASSIFICATIONS).
# These are NOT proprietary publisher norms; they are the descriptive labels
# used in Sattler, IDEA implementation guides, and every assessment textbook.
SS_RANGES = [
    (130, 999, "Very Superior"),
    (120, 129, "Superior"),
    (110, 119, "High Average"),
    (90, 109, "Average"),
    (80, 89, "Low Average"),
    (70, 79, "Borderline"),
    (0, 69, "Extremely Low"),
]

T_RANGES = [
    (70, 999, "Clinically Significant"),
    (65, 69, "At-Risk"),
    (60, 64, "High Average"),
    (40, 59, "Average"),
    (35, 39, "Low"),
    (0, 34, "Very Low"),
]

# Equivalence map — different labels users might write that should match
# the canonical label above. Conservative: only obvious synonyms.
SS_LABEL_SYNONYMS = {
    "very superior": "Very Superior",
    "extremely high": "Very Superior",
    "superior": "Superior",
    "very high": "Superior",
    "high average": "High Average",
    "above average": "High Average",
    "average": "Average",
    "low average": "Low Average",
    "below average": "Low Average",
    "borderline": "Borderline",
    "very low": "Borderline",
    "extremely low": "Extremely Low",
    "deficient": "Extremely Low",
    "intellectually deficient": "Extremely Low",
    "well below average": "Extremely Low",
}

T_LABEL_SYNONYMS = {
    "clinically significant": "Clinically Significant",
    "elevated": "Clinically Significant",
    "at-risk": "At-Risk",
    "at risk": "At-Risk",
    "elevated risk": "At-Risk",
    "high average": "High Average",
    "average": "Average",
    "low": "Low",
    "below average": "Low",
    "very low": "Very Low",
    "well below average": "Very Low",
}


# ─── Classification helpers ─────────────────────────────────────────────

def classify_standard_score(score):
    """Return the descriptive range label for a standard score (M=100, SD=15)."""
    try:
        s = float(score)
    except (TypeError, ValueError):
        return None
    for lo, hi, label in SS_RANGES:
        if lo <= s <= hi:
            return label
    return None


def classify_t_score(score):
    """Return the descriptive range label for a T-score (M=50, SD=10)."""
    try:
        s = float(score)
    except (TypeError, ValueError):
        return None
    for lo, hi, label in T_RANGES:
        if lo <= s <= hi:
            return label
    return None


def _canonical_label(label, score_type):
    """Lower-case + synonym lookup. Returns canonical label or None."""
    if not label:
        return None
    lc = label.strip().lower().rstrip('.,;:!?)')
    table = T_LABEL_SYNONYMS if score_type == "T-score" else SS_LABEL_SYNONYMS
    return table.get(lc)


# ─── Statistics: SS ↔ percentile, T ↔ percentile ────────────────────────

def _normal_cdf(z):
    """Standard normal CDF via erf (avoids scipy dep)."""
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))


def _normal_inv(p):
    """Inverse normal CDF (probit) via Beasley-Springer-Moro approximation."""
    if p <= 0 or p >= 1:
        return float("inf") if p >= 1 else float("-inf")
    # Beasley-Springer-Moro coefficients
    a = [-3.969683028665376e+01, 2.209460984245205e+02,
         -2.759285104469687e+02, 1.383577518672690e+02,
         -3.066479806614716e+01, 2.506628277459239e+00]
    b = [-5.447609879822406e+01, 1.615858368580409e+02,
         -1.556989798598866e+02, 6.680131188771972e+01,
         -1.328068155288572e+01]
    c = [-7.784894002430293e-03, -3.223964580411365e-01,
         -2.400758277161838e+00, -2.549732539343734e+00,
         4.374664141464968e+00, 2.938163982698783e+00]
    d = [7.784695709041462e-03, 3.224671290700398e-01,
         2.445134137142996e+00, 3.754408661907416e+00]
    p_low, p_high = 0.02425, 1 - 0.02425
    if p < p_low:
        q = math.sqrt(-2 * math.log(p))
        return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / \
               ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    if p <= p_high:
        q = p - 0.5
        r = q * q
        return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / \
               (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    q = math.sqrt(-2 * math.log(1 - p))
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / \
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)


def ss_to_percentile(ss):
    """Standard score → percentile rank (M=100, SD=15). Returns 1..99."""
    try:
        s = float(ss)
    except (TypeError, ValueError):
        return None
    z = (s - 100.0) / 15.0
    p = _normal_cdf(z) * 100.0
    # Clamp to commonly-reported 1..99 to match reporting conventions
    return max(1, min(99, round(p)))


def percentile_to_ss(pct):
    """Percentile rank → standard score. Returns float, rounded."""
    try:
        p = float(pct)
    except (TypeError, ValueError):
        return None
    if not (0 < p < 100):
        return None
    z = _normal_inv(p / 100.0)
    return round(100.0 + 15.0 * z)


def t_to_percentile(t):
    """T-score → percentile rank (M=50, SD=10)."""
    try:
        ts = float(t)
    except (TypeError, ValueError):
        return None
    z = (ts - 50.0) / 10.0
    return max(1, min(99, round(_normal_cdf(z) * 100.0)))


# ─── Number/claim extraction ────────────────────────────────────────────

# Patterns:
#   "SS 95", "standard score of 95", "scaled score 12", "T-score of 65",
#   "scored 95", "earned a 95", "obtained a SS of 95"
#   "95th percentile", "at the 95th %ile", "(95th %ile)"
SS_PATTERNS = [
    re.compile(r"(?:standard\s+score|SS|ss)\s*(?:of|=|:)?\s*(\d{1,3})\b", re.I),
    re.compile(r"\b(?:scored|earned)\s+(?:an?\s+)?(?:SS|standard\s+score\s+of)?\s*(\d{2,3})\b", re.I),
]
T_PATTERNS = [
    re.compile(r"(?:T[-\s]?score|t[-\s]?score)\s*(?:of|=|:)?\s*(\d{1,3})\b", re.I),
]
PERCENTILE_PATTERNS = [
    re.compile(r"(\d{1,2})(?:st|nd|rd|th)\s*(?:%ile|percentile|%-ile)", re.I),
    re.compile(r"(?:%ile|percentile)\s*(?:of|=|:)?\s*(\d{1,2})\b", re.I),
]


def extract_score_claims(text):
    """Find score claims with surrounding label context.

    Returns list of {'kind':'ss'|'t'|'pct', 'value':int, 'label':str|None,
                     'span':(start, end), 'snippet':str}.
    The 'label' is the descriptive classification immediately attached
    (e.g., "SS 95 (Average)" → label='Average').
    """
    claims = []
    text_str = text or ""

    def _find_label_after(end_idx):
        """Look ~40 chars after the score for a parenthesized label like '(Average)'."""
        tail = text_str[end_idx:end_idx + 60]
        m = re.search(r"\(([^)]{2,40})\)", tail)
        if m and m.start() < 20:
            return m.group(1).strip()
        return None

    def _add(kind, m):
        try:
            val = int(m.group(1))
        except (TypeError, ValueError):
            return
        if kind == "ss" and not (40 <= val <= 200):
            return
        if kind == "t" and not (20 <= val <= 110):
            return
        if kind == "pct" and not (1 <= val <= 99):
            return
        start, end = m.span()
        snippet = text_str[max(0, start - 30):min(len(text_str), end + 30)]
        claims.append({
            "kind": kind,
            "value": val,
            "label": _find_label_after(end),
            "span": (start, end),
            "snippet": snippet,
        })

    for pat in SS_PATTERNS:
        for m in pat.finditer(text_str):
            _add("ss", m)
    for pat in T_PATTERNS:
        for m in pat.finditer(text_str):
            _add("t", m)
    for pat in PERCENTILE_PATTERNS:
        for m in pat.finditer(text_str):
            _add("pct", m)
    # Dedup: two patterns sometimes match the same token. Keep one per
    # (kind, value, span-start-rounded-to-20-chars).
    seen = set()
    deduped = []
    for c in claims:
        key = (c["kind"], c["value"], c["span"][0] // 20)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(c)
    return deduped


# ─── Check: classification mismatch ─────────────────────────────────────

def check_classification_mismatch(text, score_type_hint=None):
    """Find score+classification pairs where the label doesn't match the value.

    Catches both:
      - 'SS X (Y)' / 'T-score X (Y)' via extract_score_claims
      - 'FSIQ was X (Y)' / 'Working Memory score 88 (Average)' via parenthesized-
        label scan that looks backwards for the nearest plausible score number.
    """
    findings = []
    text_str = text or ""

    # Path 1: explicit "SS X (Y)" / "T-score X (Y)"
    seen_spans = set()
    for c in extract_score_claims(text_str):
        if c["label"] is None or c["kind"] == "pct":
            continue
        seen_spans.add((c["value"], c["span"][0] // 30))
        score_type = "T-score" if c["kind"] == "t" else "standard"
        expected = classify_t_score(c["value"]) if c["kind"] == "t" else classify_standard_score(c["value"])
        if expected is None:
            continue
        canonical = _canonical_label(c["label"], score_type)
        if canonical is None:
            findings.append({
                "source": "python",
                "severity": "low",
                "section": None,
                "claim": f"{c['kind'].upper()} {c['value']} ({c['label']})",
                "finding": (
                    f"Unrecognized classification label '{c['label']}' for "
                    f"{c['kind'].upper()} {c['value']}. Expected: '{expected}'. "
                    f"Verify against your test manual."
                ),
                "status": "unsourced",
                "fix_hint": f"Replace '{c['label']}' with '{expected}' if using standard descriptive ranges.",
            })
            continue
        if canonical != expected:
            findings.append({
                "source": "python",
                "severity": "high",
                "section": None,
                "claim": f"{c['kind'].upper()} {c['value']} ({c['label']})",
                "finding": (
                    f"{c['kind'].upper()} {c['value']} classifies as '{expected}' "
                    f"per standard descriptive ranges, not '{c['label']}'."
                ),
                "status": "contradicts",
                "fix_hint": f"Replace '{c['label']}' with '{expected}'.",
            })

    # Path 2: parenthesized label preceded by a plausible score (catches
    # "FSIQ was 88 (Average)" — no explicit SS/T marker)
    number_hits = []
    for nm in re.finditer(r"\b(\d{2,3})\b", text_str):
        try:
            number_hits.append((nm.start(), nm.end(), int(nm.group(1))))
        except ValueError:
            pass
    for pm in re.finditer(r"\(([^)]{2,40})\)", text_str):
        raw_label = pm.group(1).strip()
        # Try both SS and T synonym tables
        ss_canon = _canonical_label(raw_label, "standard")
        t_canon = _canonical_label(raw_label, "T-score")
        if ss_canon is None and t_canon is None:
            continue
        # Look back up to 80 chars for the nearest 2-3 digit number
        window_start = max(0, pm.start() - 80)
        best = None
        for s, e, v in reversed(number_hits):
            if s < window_start:
                break
            if s >= pm.start():
                continue
            best = (s, e, v)
            break
        if best is None:
            continue
        _, _, score_val = best
        # Skip if already handled by Path 1 (rough dedup by value + span bucket)
        if (score_val, pm.start() // 30) in seen_spans:
            continue
        seen_spans.add((score_val, pm.start() // 30))
        # Try SS first (preferred); fall back to T if SS classification doesn't match
        # AND the label canonicalizes only to T.
        ss_expected = classify_standard_score(score_val) if 40 <= score_val <= 200 else None
        t_expected = classify_t_score(score_val) if 20 <= score_val <= 110 else None
        # Decide kind by which canonical label exists
        if ss_canon is not None and ss_expected is not None:
            kind, expected, canonical = "SS", ss_expected, ss_canon
        elif t_canon is not None and t_expected is not None:
            kind, expected, canonical = "T", t_expected, t_canon
        else:
            continue
        if canonical != expected:
            findings.append({
                "source": "python",
                "severity": "high",
                "section": None,
                "claim": f"{kind} {score_val} ({raw_label})",
                "finding": (
                    f"{kind} {score_val} classifies as '{expected}' "
                    f"per standard descriptive ranges, not '{raw_label}'."
                ),
                "status": "contradicts",
                "fix_hint": f"Replace '{raw_label}' with '{expected}'.",
            })
    return findings


# ─── Check: SS ↔ percentile consistency ─────────────────────────────────

def check_ss_percentile_consistency(text, tolerance_pct=8):
    """Find adjacent SS/T + percentile pairs and verify they're consistent.

    Pattern: 'FSIQ was 110 (95th percentile)' → SS 110 ≈ 75th, mismatch.
    For every percentile we find, look BACKWARDS ~80 chars for the nearest
    plausible SS/T value (avoids requiring a specific score-citation phrasing).
    Tolerance is forgiving (±8 percentile points) — reports round.
    """
    findings = []
    text_str = text or ""
    # Index every plausible 2-3 digit number with its position
    number_hits = []
    for nm in re.finditer(r"\b(\d{2,3})\b", text_str):
        try:
            v = int(nm.group(1))
        except ValueError:
            continue
        number_hits.append((nm.start(), nm.end(), v))
    # For every percentile claim, find the nearest preceding plausible score
    for pat in PERCENTILE_PATTERNS:
        for pm in pat.finditer(text_str):
            try:
                claimed_pct = int(pm.group(1))
            except (TypeError, ValueError):
                continue
            # Look back up to 80 chars for a candidate score value
            window_start = max(0, pm.start() - 80)
            candidates = [(s, e, v) for s, e, v in number_hits if window_start <= s < pm.start()]
            if not candidates:
                continue
            # Take the nearest preceding number that's in a plausible score range
            best = None
            for s, e, v in reversed(candidates):
                # Skip if v IS the percentile (avoid self-match)
                if abs(s - pm.start()) < 5 and v == claimed_pct:
                    continue
                if 40 <= v <= 200:  # SS range
                    best = (s, e, v, "ss")
                    break
                if 20 <= v <= 110 and v != claimed_pct:  # T-score range; ambiguous with SS
                    if best is None:
                        best = (s, e, v, "t")
                    # keep looking for an SS match preferentially
            if best is None:
                continue
            _, _, score_val, kind = best
            expected_pct = (t_to_percentile if kind == "t" else ss_to_percentile)(score_val)
            if expected_pct is None:
                continue
            diff = abs(claimed_pct - expected_pct)
            if diff > tolerance_pct:
                findings.append({
                    "source": "python",
                    "severity": "high" if diff > 15 else "medium",
                    "section": None,
                    "claim": f"{kind.upper()} {score_val} ({claimed_pct}th %ile)",
                    "finding": (
                        f"{kind.upper()} {score_val} ≈ {expected_pct}th percentile "
                        f"(normal distribution), not {claimed_pct}th. Off by {diff} points."
                    ),
                    "status": "contradicts",
                    "fix_hint": f"Replace '{claimed_pct}th percentile' with '{expected_pct}th percentile'.",
                })
    return findings


# ─── Check: numeric claims absent from fact chunks ──────────────────────

def _all_numbers_in_text(text):
    """Yield ints found in the text (filtered to plausible score ranges)."""
    for m in re.finditer(r"\b(\d{2,3})\b", text or ""):
        try:
            n = int(m.group(1))
        except ValueError:
            continue
        if 10 <= n <= 200:
            yield n


def check_numbers_in_chunks(text, fact_chunks, tolerance=1, ignore_below=10):
    """Every prominent score claim in 'text' should appear (±tolerance) in
    at least one fact chunk. Catches hallucinated SS / T-score values.

    fact_chunks: list of {'text': str, ...} or list of str.
    """
    findings = []
    chunk_numbers = set()
    for ch in fact_chunks or []:
        ct = ch.get("text", "") if isinstance(ch, dict) else str(ch)
        for n in _all_numbers_in_text(ct):
            for d in range(-tolerance, tolerance + 1):
                chunk_numbers.add(n + d)
    claims = extract_score_claims(text or "")
    seen = set()
    for c in claims:
        if c["kind"] == "pct":
            continue
        if c["value"] < ignore_below:
            continue
        # Dedup so we don't flag the same value 5 times
        key = (c["kind"], c["value"])
        if key in seen:
            continue
        seen.add(key)
        if c["value"] not in chunk_numbers:
            findings.append({
                "source": "python",
                "severity": "high",
                "section": None,
                "claim": f"{c['kind'].upper()} {c['value']}",
                "finding": (
                    f"{c['kind'].upper()} {c['value']} is reported but does not "
                    f"appear (±{tolerance}) in any uploaded fact chunk. "
                    f"Possible hallucinated score."
                ),
                "status": "unsourced",
                "fix_hint": "Remove the claim or verify the source document.",
            })
    return findings


# ─── Check: date arithmetic ─────────────────────────────────────────────

# Captures patterns like "4 weeks later", "3 months after", "2 weeks earlier"
# adjacent to two dates within ~60 chars.
DATE_PAT = re.compile(
    r"\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b"
)
DURATION_PAT = re.compile(
    r"\b(\d{1,2})\s*(day|week|month|year)s?\b", re.I
)


def _parse_date(m):
    a, b, c = m.group(1), m.group(2), m.group(3)
    year = int(c) if c else datetime.utcnow().year
    if year < 100:
        year += 2000
    try:
        return datetime(year, int(a), int(b))
    except ValueError:
        try:
            return datetime(year, int(b), int(a))  # try DD/MM
        except ValueError:
            return None


def check_date_arithmetic(text):
    """Find 'date1 ... N weeks later ... date2' patterns and verify the math."""
    findings = []
    text_str = text or ""
    dates = [(m, _parse_date(m)) for m in DATE_PAT.finditer(text_str)]
    dates = [(m, d) for m, d in dates if d is not None]
    for i, (m1, d1) in enumerate(dates):
        for m2, d2 in dates[i + 1:]:
            # Only consider date pairs within 200 chars of each other
            if m2.start() - m1.end() > 200:
                break
            between = text_str[m1.end():m2.start()]
            dm = DURATION_PAT.search(between)
            if not dm:
                continue
            n = int(dm.group(1))
            unit = dm.group(2).lower()
            unit_days = {"day": 1, "week": 7, "month": 30, "year": 365}[unit]
            claimed_days = n * unit_days
            actual_days = abs((d2 - d1).days)
            # 10% tolerance, minimum 3 days
            tol = max(3, claimed_days * 0.1)
            if abs(claimed_days - actual_days) > tol:
                findings.append({
                    "source": "python",
                    "severity": "medium",
                    "section": None,
                    "claim": f"{d1.date()} → {d2.date()} ({n} {unit}{'s' if n != 1 else ''})",
                    "finding": (
                        f"Stated as '{n} {unit}{'s' if n != 1 else ''}' "
                        f"({claimed_days} days) but actual span is {actual_days} days."
                    ),
                    "status": "contradicts",
                    "fix_hint": "Verify the dates and the stated interval.",
                })
    return findings


# ─── Check: Flesch-Kincaid grade level ──────────────────────────────────

# Heuristic syllable counter — same approach as the textstat library.
VOWELS = "aeiouyAEIOUY"


def _count_syllables_word(word):
    word = word.lower().strip()
    if not word:
        return 0
    # Strip trailing 'e' (silent in many words)
    if word.endswith("e") and not word.endswith("le"):
        word = word[:-1]
    count = 0
    prev_vowel = False
    for ch in word:
        is_vowel = ch in "aeiouy"
        if is_vowel and not prev_vowel:
            count += 1
        prev_vowel = is_vowel
    return max(1, count)


def flesch_kincaid_grade(text):
    """Returns the Flesch-Kincaid Grade Level for 'text'. ~Public-domain formula."""
    text = (text or "").strip()
    if not text:
        return None
    sentences = max(1, len(re.findall(r"[.!?]+(?:\s|$)", text)))
    words = re.findall(r"[A-Za-z'-]+", text)
    if not words:
        return None
    syllables = sum(_count_syllables_word(w) for w in words)
    asl = len(words) / sentences
    asw = syllables / len(words)
    return 0.39 * asl + 11.8 * asw - 15.59


def check_reading_level(text, target_level=None, tolerance=2.0):
    """Compare actual F-K grade to the stated target audience.

    target_level: e.g. 'Parent-Friendly' → ~grade 8;
                  'Student-Friendly (Elem)' → ~grade 3;
                  'Student-Friendly (Secondary)' → ~grade 7;
                  None / 'Professional' → no check.
    """
    target_grades = {
        "parent-friendly": 8.0,
        "student-friendly (elem)": 3.0,
        "student-friendly (secondary)": 7.0,
        "elementary": 4.0,
        "middle school": 7.0,
        "high school": 10.0,
    }
    if not target_level:
        return []
    tgt = target_grades.get(str(target_level).lower())
    if tgt is None:
        return []
    actual = flesch_kincaid_grade(text)
    if actual is None:
        return []
    if abs(actual - tgt) > tolerance:
        return [{
            "source": "python",
            "severity": "medium" if abs(actual - tgt) > 4 else "low",
            "section": None,
            "claim": f"Reading level target: {target_level}",
            "finding": (
                f"Target ≈ grade {tgt:.1f}; actual Flesch-Kincaid ≈ "
                f"grade {actual:.1f}. Audience mismatch."
            ),
            "status": "info",
            "fix_hint": "Simplify or elaborate to match the target audience.",
        }]
    return []


# ─── Check: citation existence ─────────────────────────────────────────

# Patterns the report uses to cite a source:
#   "per the BASC-3 results", "the WISC-V Full Scale", "based on the teacher report",
#   "according to the parent interview"
CITATION_PAT = re.compile(
    r"\b(?:per|according to|based on|the)\s+(?:the\s+)?"
    r"([A-Z][A-Za-z0-9\-]+(?:\s+[A-Z][A-Za-z0-9\-]+){0,3})"
    r"\s+(?:report|results?|interview|observations?|assessment|battery|score|data|protocol|findings?|profile)",
)


def check_citations(text, fact_chunks):
    """Flag cited sources that don't appear in any fact chunk's text.

    Very conservative — only flags clearly-named entities (proper nouns) that
    look like a test or report name.
    """
    findings = []
    text_str = text or ""
    chunk_blob = " ".join(
        (ch.get("text", "") if isinstance(ch, dict) else str(ch))
        for ch in (fact_chunks or [])
    ).lower()
    seen = set()
    for m in CITATION_PAT.finditer(text_str):
        cited = m.group(1).strip()
        if cited.lower() in seen:
            continue
        seen.add(cited.lower())
        # Skip very short or generic citations
        if len(cited) < 4:
            continue
        if cited.lower() in ("student", "teacher", "parent", "clinician", "examiner", "report"):
            continue
        # Look for the cited term (or a stripped version) in the chunks
        cited_key = cited.lower().replace("-", "").replace(" ", "")
        chunk_key = chunk_blob.replace("-", "").replace(" ", "")
        if cited_key in chunk_key:
            continue
        # Also accept partial matches for compound names (e.g. "BASC" matches "BASC-3")
        first_token = re.split(r"[\s-]", cited)[0].lower()
        if len(first_token) >= 4 and first_token in chunk_blob:
            continue
        findings.append({
            "source": "python",
            "severity": "medium",
            "section": None,
            "claim": f"Cited: '{cited}'",
            "finding": (
                f"The report cites '{cited}' but this source does not appear in any "
                f"uploaded fact chunk. Possible fabricated reference."
            ),
            "status": "unsourced",
            "fix_hint": "Verify the source document was uploaded, or remove the citation.",
        })
    return findings


# ─── Check: SMART goal heuristic ────────────────────────────────────────
#
# Phase 4b. Opt-in: only runs on sections whose name matches a "goals" /
# "objectives" / "recommendations" heuristic. False-positive cost is high
# here — flagging a paragraph that's NOT meant to be an IEP goal as "missing
# components" annoys the clinician. So:
#   • We only look at sentences that look LIKE a goal: starts with "By [time],"
#     or "[Student] / Student / he / she will" — i.e., the canonical SMART
#     opening.
#   • We score Specific / Measurable / Time-bound only. Achievable and Relevant
#     aren't programmatically checkable without external context.
#   • Findings are severity:medium (advisory) — never high. The clinician is
#     the final judge.

# A sentence is a goal candidate if it has [Student]/student + will + an
# action verb. We're generous with what counts as a "goal sentence".
GOAL_SENTENCE_PAT = re.compile(
    r"(?:^|[.!?]\s+|\n+\s*[-•\*]?\s*)"             # sentence/list-item boundary
    r"((?:[Bb]y\s+[^.,;]{4,80}?,\s+)?"             # optional "By [time],"
    r"(?:\[Student\]|[Tt]he\s+student|[Ss]tudent|[Hh]e|[Ss]he|[Tt]hey)\s+"  # subject
    r"will\s+"                                      # auxiliary
    r"[^.!?]{8,400})"                              # rest of goal (8-400 chars)
    r"(?=[.!?]|$)"                                  # ends at sentence boundary
)

# Specific: action verb after "will". Generous list — anything in this set
# counts as specific enough to not flag.
SPECIFIC_VERBS = {
    "identify", "demonstrate", "produce", "write", "read", "decode", "encode",
    "blend", "segment", "solve", "compute", "calculate", "explain", "describe",
    "compare", "contrast", "summarize", "predict", "use", "apply", "select",
    "complete", "construct", "draw", "label", "match", "sort", "classify",
    "respond", "follow", "initiate", "request", "name", "list", "recall",
    "recognize", "decode", "encode", "increase", "decrease", "maintain",
    "spell", "pronounce", "argue", "discuss", "evaluate", "analyze",
    "ask", "answer", "indicate", "show", "express", "share", "participate",
    "transition", "regulate", "manage", "track", "monitor", "graph",
    "raise", "wait", "take", "give", "share", "engage", "complete",
}

# Measurable: numeric criterion like "80% accuracy", "4 of 5 trials",
# "WPM > 100", "≥ 90% over 4 consecutive sessions".
MEASURABLE_PAT = re.compile(
    r"\b\d{1,3}\s*%"                                # 80%, 90 %
    r"|"
    r"\b\d{1,3}\s*(?:percent|out\s+of|/)\s*\d{0,3}" # 8 out of 10, 4/5
    r"|"
    r"\b\d{1,3}\s+(?:of|out\s+of)\s+\d{1,3}"        # 4 of 5
    r"|"
    r"\b(?:WPM|WCPM|DCPM|wpm|wcpm)\s*[><=≥≤]?\s*\d+"  # WPM > 80
    r"|"
    r"\bwith\s+(?:at\s+least\s+)?\d+\s*(?:%|percent)"
    r"|"
    r"\b(?:at\s+least|no\s+more\s+than|fewer\s+than|more\s+than)\s+\d+"
    r"|"
    r"\b\d+\s+(?:consecutive|out\s+of\s+the\s+last|of\s+the\s+last)\s+\d+",
    re.I,
)

# Time-bound: explicit deadline or duration.
TIMEBOUND_PAT = re.compile(
    r"\bby\s+(?:the\s+end\s+of\s+)?(?:the\s+)?"
    r"(?:\d{1,2}/\d{1,2}/\d{2,4}|\d{4}|[Jj]an\w*|[Ff]eb\w*|[Mm]ar\w*|[Aa]pr\w*|"
    r"[Mm]ay|[Jj]un\w*|[Jj]ul\w*|[Aa]ug\w*|[Ss]ep\w*|[Oo]ct\w*|[Nn]ov\w*|[Dd]ec\w*|"
    r"quarter|trimester|semester|IEP\s+year|school\s+year|academic\s+year|"
    r"reporting\s+period|grading\s+period|annual\s+review|year)\b"
    r"|"
    r"\bwithin\s+\d+\s+(?:day|week|month|year)s?\b"
    r"|"
    r"\bin\s+\d+\s+(?:day|week|month|year)s?\b"
    r"|"
    r"\bover\s+(?:the\s+)?(?:next|coming|following)\s+\d+\s+(?:day|week|month|year)s?\b",
    re.I,
)


def _is_goal_section(section_name):
    """True if the section name suggests IEP-style goals/objectives/recs."""
    if not section_name:
        return False
    s = str(section_name).lower()
    return any(k in s for k in ("goal", "objective", "recommend", "iep"))


def check_smart_goal(text):
    """Find goal-shaped sentences and flag any missing SMART components.

    Returns one finding per goal sentence, listing the missing components.
    Never returns 'absence of goals' findings — silence = no goals to check.
    """
    findings = []
    text_str = text or ""
    for gm in GOAL_SENTENCE_PAT.finditer(text_str):
        goal_text = gm.group(1).strip()
        if len(goal_text) < 15:
            continue
        # SPECIFIC: action verb anywhere after the first "will"
        will_idx = goal_text.lower().find("will")
        rest = goal_text[will_idx + 4:] if will_idx >= 0 else goal_text
        words_after_will = re.findall(r"\b([A-Za-z']+)\b", rest)[:10]
        has_specific = any(w.lower() in SPECIFIC_VERBS for w in words_after_will)
        # MEASURABLE: numeric criterion
        has_measurable = bool(MEASURABLE_PAT.search(goal_text))
        # TIME-BOUND: deadline / duration anywhere in the goal sentence
        has_timebound = bool(TIMEBOUND_PAT.search(goal_text))
        missing = []
        if not has_specific:
            missing.append("Specific (no clear action verb)")
        if not has_measurable:
            missing.append("Measurable (no numeric criterion like '80%', '4 of 5 trials')")
        if not has_timebound:
            missing.append("Time-bound (no target date, duration, or 'by [period]')")
        if not missing:
            continue
        snippet = goal_text[:120] + ("…" if len(goal_text) > 120 else "")
        findings.append({
            "source": "python",
            "severity": "medium",
            "section": None,
            "claim": f"Goal: \"{snippet}\"",
            "finding": (
                "Goal-shaped sentence is missing SMART component(s): "
                + "; ".join(missing) + "."
            ),
            "status": "info",
            "fix_hint": "Add the missing component(s) — or, if this isn't intended as a SMART goal, rephrase so it doesn't start with '[Student] will'.",
        })
    return findings


# ─── Audit entry point ─────────────────────────────────────────────────

def smoke_test():
    """Returns a dict proving the module loads and math works."""
    return {
        "version": VERSION,
        "math_works": (2 + 2 == 4),
        "sqrt_2": math.sqrt(2),
        "ss_100_pct": ss_to_percentile(100),
        "ss_70_pct": ss_to_percentile(70),
        "ss_130_pct": ss_to_percentile(130),
        "class_88": classify_standard_score(88),
        "class_95": classify_standard_score(95),
        "class_115": classify_standard_score(115),
    }


def audit(report_sections_json, fact_chunks_json, score_entries_json,
          target_audience=None):
    """Main entry — called from JS-side runAudit().

    Returns a JSON-encoded list of finding dicts. Each finding has:
      source, severity, section, claim, finding, status, fix_hint.
    """
    try:
        sections = json.loads(report_sections_json) if report_sections_json else {}
        chunks = json.loads(fact_chunks_json) if fact_chunks_json else []
        scores = json.loads(score_entries_json) if score_entries_json else []
    except json.JSONDecodeError as e:
        return json.dumps([{
            "source": "python",
            "severity": "low",
            "section": "_setup",
            "claim": "input parse",
            "finding": f"Could not parse audit input JSON: {e}",
            "status": "error",
            "fix_hint": None,
        }])

    findings = []
    for section_name, section_text in (sections.items() if isinstance(sections, dict) else []):
        if not isinstance(section_text, str) or not section_text:
            continue
        for check in (
            check_classification_mismatch,
            check_ss_percentile_consistency,
            check_date_arithmetic,
        ):
            try:
                for f in check(section_text):
                    f["section"] = section_name
                    findings.append(f)
            except Exception as e:
                findings.append({
                    "source": "python",
                    "severity": "low",
                    "section": section_name,
                    "claim": check.__name__,
                    "finding": f"Check failed: {e}",
                    "status": "error",
                    "fix_hint": None,
                })
        try:
            for f in check_numbers_in_chunks(section_text, chunks):
                f["section"] = section_name
                findings.append(f)
        except Exception as e:
            findings.append({
                "source": "python", "severity": "low",
                "section": section_name, "claim": "check_numbers_in_chunks",
                "finding": f"Check failed: {e}", "status": "error", "fix_hint": None,
            })
        try:
            for f in check_citations(section_text, chunks):
                f["section"] = section_name
                findings.append(f)
        except Exception as e:
            findings.append({
                "source": "python", "severity": "low",
                "section": section_name, "claim": "check_citations",
                "finding": f"Check failed: {e}", "status": "error", "fix_hint": None,
            })
        if target_audience:
            try:
                for f in check_reading_level(section_text, target_audience):
                    f["section"] = section_name
                    findings.append(f)
            except Exception as e:
                findings.append({
                    "source": "python", "severity": "low",
                    "section": section_name, "claim": "check_reading_level",
                    "finding": f"Check failed: {e}", "status": "error", "fix_hint": None,
                })
        # Phase 4b: SMART goal heuristic — opt-in by section name only, so
        # narrative sections don't get false-positive flagged.
        if _is_goal_section(section_name):
            try:
                for f in check_smart_goal(section_text):
                    f["section"] = section_name
                    findings.append(f)
            except Exception as e:
                findings.append({
                    "source": "python", "severity": "low",
                    "section": section_name, "claim": "check_smart_goal",
                    "finding": f"Check failed: {e}", "status": "error", "fix_hint": None,
                })

    return json.dumps(findings)
`;

// ── Singleton state ─────────────────────────────────────────────────
let _pyodide = null;
let _initPromise = null;
let _loadStartedAt = null;

// Dynamically inject the Pyodide loader script. Returns a promise that
// resolves once `window.loadPyodide` is callable.
function _loadPyodideScript() {
  if (typeof window.loadPyodide === 'function') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PYODIDE_CDN + 'pyodide.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load pyodide.js from ' + script.src));
    document.head.appendChild(script);
  });
}

async function _init() {
  if (_pyodide) return _pyodide;
  _loadStartedAt = Date.now();
  console.log('[PyodideRuntime] Initializing… (~10MB download on first load)');
  await _loadPyodideScript();
  _pyodide = await window.loadPyodide({ indexURL: PYODIDE_CDN });
  // Inject the report_checks module into the Pyodide filesystem so we can
  // `import report_checks` cleanly from any caller.
  _pyodide.runPython('import sys; sys.path.insert(0, "/")');
  _pyodide.FS.writeFile('/report_checks.py', REPORT_CHECKS_PY);
  // Eager import to surface any syntax errors at boot, not at first audit.
  _pyodide.runPython('import report_checks');
  const elapsed = ((Date.now() - _loadStartedAt) / 1000).toFixed(1);
  console.log(`[PyodideRuntime] Ready in ${elapsed}s`);
  return _pyodide;
}

// ── Public API ──────────────────────────────────────────────────────
const PyodideRuntime = {
  /** Start the download in the background; returns the init promise. */
  warmup() {
    if (!_initPromise) _initPromise = _init();
    return _initPromise;
  },

  /** True once Pyodide is loaded and report_checks is importable. */
  ready() {
    return _pyodide !== null;
  },

  /** Run an arbitrary Python expression. Used for smoke tests + debugging. */
  async run(code) {
    const py = await this.warmup();
    return py.runPython(code);
  },

  /** Phase 2 smoke test — confirms Pyodide is alive end-to-end. */
  async smokeTest() {
    const py = await this.warmup();
    const result = py.runPython('import report_checks, json; json.dumps(report_checks.smoke_test())');
    return JSON.parse(result);
  },

  /**
   * Run the report_checks audit. Returns an array of findings in the same
   * shape the JS-side reconciliation engine already consumes from the LLM
   * audit passes, just with `source: "python"`.
   *
   * Phase 2 returns []. Phase 3 fills out the real checks.
   *
   * @param {object} opts
   * @param {object} opts.reportSections   { sectionName: "text...", ... }
   * @param {array}  opts.factChunks       [{ id, type, text, verified, ... }]
   * @param {array}  opts.scoreEntries     [{ assessment, subtest, score, scoreType, classification, ... }]
   */
  async runAudit({ reportSections = {}, factChunks = [], scoreEntries = [] } = {}) {
    const py = await this.warmup();
    // Pass everything through JSON to avoid Pyodide proxy lifetime headaches.
    const sectionsJson = JSON.stringify(reportSections);
    const chunksJson = JSON.stringify(factChunks);
    const scoresJson = JSON.stringify(scoreEntries);
    // Bind into the Python globals so we don't have to escape them into a code string.
    py.globals.set('_rw_sections_json', sectionsJson);
    py.globals.set('_rw_chunks_json', chunksJson);
    py.globals.set('_rw_scores_json', scoresJson);
    const result = py.runPython(
      'import report_checks; ' +
      'report_checks.audit(_rw_sections_json, _rw_chunks_json, _rw_scores_json)'
    );
    try { return JSON.parse(result); }
    catch (e) {
      console.error('[PyodideRuntime] audit() returned non-JSON:', result);
      return [];
    }
  },
};

// ── Registration ─────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.PyodideRuntime = PyodideRuntime;
  console.log('[PyodideRuntime] Registered (lazy — no download yet)');
}
})();
