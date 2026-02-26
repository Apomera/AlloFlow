"""
date_range_filter.py — Add date range filtering for the student report.

Changes:
1. Add reportDateRange state (startDate, endDate) to StudentAnalyticsPanel
2. Add date picker UI between the progress summary and download button
3. Pass date range to the button click handler
4. Filter progressSnapshots by date range in the report function
"""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    changes = 0

    # === 1. Add state variable after showDiagnostics (inside StudentAnalyticsPanel) ===
    # Find an existing useState near the top of the component
    state_anchor = "const [showRTISettings, setShowRTISettings] = useState(false);"
    state_addition = """const [showRTISettings, setShowRTISettings] = useState(false);
    const [reportStartDate, setReportStartDate] = useState('');
    const [reportEndDate, setReportEndDate] = useState('');"""
    
    if state_anchor in content and 'reportStartDate' not in content:
        content = content.replace(state_anchor, state_addition, 1)
        changes += 1
        print("1. Added date range state variables")
    else:
        if 'reportStartDate' in content:
            print("1. SKIP - already present")
        else:
            print("1. FAIL - anchor not found")

    # === 2. Add date picker UI before the download button ===
    old_button = """                                <button
                                    onClick={() => generateStudentFriendlyReport({ history, wordSoundsHistory, phonemeMastery, wordSoundsBadges, gameCompletions, globalPoints, globalLevel, progressSnapshots: (rosterKey?.progressHistory && Object.values(rosterKey.progressHistory)[0]) || [] })"""
    
    date_picker_ui = """                                <div className="mt-4 p-3 bg-white/80 rounded-xl border border-slate-200">
                                    <div className="text-xs font-bold text-slate-600 uppercase mb-2">&#x1F4C5; Report Date Range (optional)</div>
                                    <div className="flex gap-2 items-center">
                                        <input
                                            type="date"
                                            value={reportStartDate}
                                            onChange={(e) => setReportStartDate(e.target.value)}
                                            className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700"
                                            placeholder="Start"
                                        />
                                        <span className="text-xs text-slate-400">to</span>
                                        <input
                                            type="date"
                                            value={reportEndDate}
                                            onChange={(e) => setReportEndDate(e.target.value)}
                                            className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700"
                                            placeholder="End"
                                        />
                                        {(reportStartDate || reportEndDate) && (
                                            <button
                                                onClick={() => { setReportStartDate(''); setReportEndDate(''); }}
                                                className="text-xs text-slate-400 hover:text-red-500 px-1"
                                                title="Clear dates"
                                            >&#x2716;</button>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">Leave empty to include all sessions</p>
                                </div>
"""

    new_button = date_picker_ui + """                                <button
                                    onClick={() => generateStudentFriendlyReport({ history, wordSoundsHistory, phonemeMastery, wordSoundsBadges, gameCompletions, globalPoints, globalLevel, progressSnapshots: (rosterKey?.progressHistory && Object.values(rosterKey.progressHistory)[0]) || [], dateRange: { start: reportStartDate, end: reportEndDate } })"""

    if old_button in content:
        content = content.replace(old_button, new_button, 1)
        changes += 1
        print("2. Added date picker UI + updated button click")
    else:
        print("2. FAIL - button anchor not found")

    # === 3. Add date filtering logic in the report function ===
    old_snapshots = """        // === Multi-session data from roster ===
        const snapshots = sessionData?.progressSnapshots || [];"""
    
    new_snapshots = """        // === Multi-session data from roster ===
        const allSnapshots = sessionData?.progressSnapshots || [];
        const dateRange = sessionData?.dateRange || {};
        const snapshots = allSnapshots.filter(s => {
            if (dateRange.start && s.date < dateRange.start) return false;
            if (dateRange.end && s.date > dateRange.end) return false;
            return true;
        });
        const dateRangeLabel = (dateRange.start || dateRange.end) ? ' (' + (dateRange.start || 'start') + ' to ' + (dateRange.end || 'now') + ')' : '';"""
    
    if old_snapshots in content:
        content = content.replace(old_snapshots, new_snapshots, 1)
        changes += 1
        print("3. Added date filtering logic in report function")
    else:
        print("3. FAIL - snapshot anchor not found")

    # === 4. Add date range label to report header ===
    old_header = "date + (hasHistory ? ' \\u2022 ' + snapshots.length + ' sessions tracked' : '')"
    new_header = "date + (hasHistory ? ' \\u2022 ' + snapshots.length + ' sessions tracked' + dateRangeLabel : '')"
    
    if old_header in content:
        content = content.replace(old_header, new_header, 1)
        changes += 1
        print("4. Added date range label to report header")
    else:
        print("4. FAIL - header anchor not found")

    SRC.write_text(content, encoding='utf-8')
    
    # Verify
    final = SRC.read_text(encoding='utf-8')
    checks = [
        ('reportStartDate', 'Date state'),
        ('type="date"', 'Date inputs'),
        ('dateRange', 'Date filtering'),
        ('dateRangeLabel', 'Date label'),
    ]
    print(f"\nDone! {changes}/4 changes.")
    for pattern, label in checks:
        ct = final.count(pattern)
        print(f"  {'OK' if ct > 0 else 'MISSING'} ({ct}): {label}")

if __name__ == "__main__":
    main()
