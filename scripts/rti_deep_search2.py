"""Compact RTI gap summary — just counts and key lines."""
FILE = r"C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\prismflow-deploy\src\App.jsx"
with open(FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

def search(category, terms):
    print(f"\n--- {category} ---")
    all_hits = []
    for term in terms:
        hits = [(i+1, term, lines[i].strip()[:130]) for i, l in enumerate(lines) if term.lower() in l.lower()]
        all_hits.extend(hits)
    # Dedupe by line number
    seen = set()
    unique = []
    for ln, term, snippet in all_hits:
        if ln not in seen:
            seen.add(ln)
            unique.append((ln, term, snippet))
    unique.sort()
    print(f"  UNIQUE LINES: {len(unique)}")
    for ln, term, snippet in unique[:8]:
        print(f"  L{ln} [{term}]: {snippet}")
    if len(unique) > 8:
        print(f"  ... +{len(unique)-8} more")

search("GAP2: PROGRESS REPORT", [
    "progressReport", "progress_report", "generateReport", "exportReport",
    "rtiReport", "monitoringReport", "studentReport", "printReport",
    "fluencyReport", "assessmentReport", "generatePDF", "toPDF",
    "export_pdf"
])

search("GAP3: TIER MOVEMENT", [
    "tierRecommend", "moveTier", "tierChange", "suggestTier",
    "escalate", "deescalate", "tierMovement", "rtiDecision",
    "rtiAlert", "flagStudent", "atRisk", "at_risk", "rtiFlag",
    "well_below", "approaching", "tierLevel"
])

search("GAP4: TREND VISUALIZATION", [
    "trendLine", "trend_line", "sparkline", "lineChart",
    "chartData", "trendData", "progressGraph", "scoreHistory",
    "performanceTrend", "overTime", "over_time", "wcpmHistory",
    "Chart", "dataPoint", "data_point", "svg.*line", "canvas"
])

search("GAP6: PARENT COMMUNICATION", [
    "parentReport", "parentSummary", "parentView", "parentMode",
    "isParentMode", "parentDashboard", "parentLetter", "homeReport",
    "familyReport", "parentProgress", "shareWithParent", "parentEmail",
    "parent_mode", "parent_view", "parent_report"
])
