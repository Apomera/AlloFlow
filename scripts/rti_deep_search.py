"""Deep search for RTI features in App.jsx — checking each gap category thoroughly."""
import sys

FILE = r"C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\prismflow-deploy\src\App.jsx"
with open(FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

def search(category, terms):
    print(f"\n{'='*60}")
    print(f"  {category}")
    print(f"{'='*60}")
    total = 0
    for term in terms:
        hits = [(i+1, lines[i].strip()[:130]) for i, l in enumerate(lines) if term.lower() in l.lower()]
        if hits:
            total += len(hits)
            print(f"\n  '{term}' — {len(hits)} hits:")
            for ln, snippet in hits[:5]:
                print(f"    L{ln}: {snippet}")
            if len(hits) > 5:
                print(f"    ... and {len(hits)-5} more")
    if total == 0:
        print("  *** NO HITS FOUND ***")
    print(f"  TOTAL HITS: {total}")

# GAP #2: Auto-generated progress monitoring report
search("GAP #2: PROGRESS MONITORING REPORT", [
    "progressReport", "progress_report", "progressMonitor",
    "generateReport", "exportReport", "rtiReport", "rti_report",
    "monitoringReport", "monitoring_report", "reportCard",
    "studentReport", "student_report", "printReport",
    "fluencyReport", "fluency_report", "assessmentReport",
    "dataReport", "data_report", "generatePDF", "toPDF"
])

# GAP #3: Tier movement recommendations
search("GAP #3: TIER MOVEMENT / RECOMMENDATIONS", [
    "tierRecommend", "tier_recommend", "moveTier", "move_tier",
    "tierChange", "tier_change", "tierSuggestion", "suggestTier",
    "rtiRecommend", "rti_recommend", "escalate", "deescalate",
    "tierMovement", "tier_movement", "rtiDecision", "rti_decision",
    "rtiAlert", "rti_alert", "flagStudent", "flag_student",
    "atRisk", "at_risk", "rtiFlag", "rti_flag",
    "well_below", "approaching", "tierLevel", "tier_level"
])

# GAP #4: Trend visualization
search("GAP #4: TREND / VISUALIZATION", [
    "trendLine", "trend_line", "sparkline", "lineChart", "line_chart",
    "chartData", "chart_data", "dataVisualization", "graphData",
    "trendData", "trend_data", "progressGraph", "progress_graph",
    "scoreHistory", "score_history", "performanceTrend",
    "overTime", "over_time", "historicalData", "historical_data",
    "wcpmHistory", "wcpm_history", "accuracyHistory",
    "chartComponent", "canvas.*chart", "Chart",
    "dataPoint", "data_point", "plotData"
])

# GAP #6: Parent communication
search("GAP #6: PARENT COMMUNICATION", [
    "parentReport", "parent_report", "parentSummary", "parent_summary",
    "parentView", "parent_view", "parentMode", "parent_mode",
    "isParentMode", "parentDashboard", "parent_dashboard",
    "parentLetter", "parent_letter", "homeReport", "home_report",
    "familyReport", "family_report", "parentProgress",
    "shareWithParent", "share_with_parent", "parentEmail",
    "parentComm", "parent_comm", "guardianReport"
])

# BONUS: Check what the dashboard actually exports
search("BONUS: DASHBOARD EXPORT DETAILS", [
    "handleExportCSV", "dashboard_export", "exportDashboard",
    "downloadCSV", "download_csv", "generateCSV", "generate_csv",
    "exportData", "export_data"
])
