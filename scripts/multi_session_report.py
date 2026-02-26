"""
multi_session_report.py — Enhance generateStudentFriendlyReport to pull
cross-session data from rosterKey.progressHistory.

Changes:
1. Accept rosterKey + studentName as optional params
2. Extract progressHistory snapshots if available
3. Add "Progress Over Time" section with trend data
4. Add "Session History" section showing past snapshots
5. Calculate growth metrics (first session → latest)
"""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

# The enhanced report function (replaces the existing one)
NEW_REPORT_FN = r"""
    const generateStudentFriendlyReport = (sessionData) => {
        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const totalActivities = (sessionData?.history || []).length;
        const quizzes = (sessionData?.history || []).filter(h => h.type === 'quiz');
        const avgQuizScore = quizzes.length > 0 ? Math.round(quizzes.reduce((sum, q) => sum + (q.score || 0), 0) / quizzes.length) : null;
        const wsHistory = sessionData?.wordSoundsHistory || [];
        const wsCorrect = wsHistory.filter(h => h.correct).length;
        const wsAccuracy = wsHistory.length > 0 ? Math.round((wsCorrect / wsHistory.length) * 100) : null;
        const xp = sessionData?.globalPoints || 0;
        const level = sessionData?.globalLevel || 1;
        const badges = sessionData?.wordSoundsBadges || {};
        const badgeCount = Object.keys(badges).length;
        const masteredPhonemes = Object.entries(sessionData?.phonemeMastery || {}).filter(([_, v]) => v.accuracy >= 80);

        // === Multi-session data from roster ===
        const snapshots = sessionData?.progressSnapshots || [];
        const hasHistory = snapshots.length > 1;
        const first = hasHistory ? snapshots[0] : null;
        const latest = hasHistory ? snapshots[snapshots.length - 1] : null;

        const growthCard = (label, startVal, endVal, unit) => {
            const diff = Math.round(endVal - startVal);
            const color = diff > 0 ? '#16a34a' : diff < 0 ? '#dc2626' : '#64748b';
            const arrow = diff > 0 ? '\u2191' : diff < 0 ? '\u2193' : '\u2192';
            return '<div style="background:white;border-radius:12px;padding:14px;text-align:center;border:2px solid ' + color + '20"><div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">' + label + '</div><div style="font-size:24px;font-weight:800;color:' + color + '">' + arrow + ' ' + (diff > 0 ? '+' : '') + diff + unit + '</div><div style="font-size:10px;color:#94a3b8;margin-top:4px">' + Math.round(startVal) + unit + ' \u2192 ' + Math.round(endVal) + unit + '</div></div>';
        };

        const sessionRow = (snap, idx) => {
            return '<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:8px 12px;font-size:12px;color:#64748b">' + (idx + 1) + '</td><td style="padding:8px 12px;font-size:12px;font-weight:600;color:#334155">' + snap.date + '</td><td style="padding:8px 12px;font-size:12px;color:#6366f1;font-weight:700">' + Math.round(snap.wsAccuracy || 0) + '%</td><td style="padding:8px 12px;font-size:12px;color:#16a34a;font-weight:700">' + Math.round(snap.quizAvg || 0) + '%</td><td style="padding:8px 12px;font-size:12px;color:#0891b2;font-weight:700">' + (snap.totalActivities || 0) + '</td></tr>';
        };

        const getEncouragement = (score) => {
            if (score >= 90) return { emoji: '\u{1F31F}', msg: 'Amazing work! You are a superstar!' };
            if (score >= 70) return { emoji: '\u{1F4AA}', msg: 'Great progress! Keep it up!' };
            if (score >= 50) return { emoji: '\u{1F331}', msg: 'You are growing! Every practice session helps!' };
            return { emoji: '\u{1F680}', msg: 'Keep practicing \u2014 you are on your way!' };
        };
        const statCard = (icon, label, value, color) => '<div style="background:white;border-radius:16px;padding:20px;text-align:center;border:2px solid ' + color + '20;box-shadow:0 2px 8px rgba(0,0,0,0.04)"><div style="font-size:32px;margin-bottom:8px">' + icon + '</div><div style="font-size:28px;font-weight:800;color:' + color + '">' + value + '</div><div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">' + label + '</div></div>';
        const quizEnc = avgQuizScore !== null ? getEncouragement(avgQuizScore) : { emoji: '\u{1F4DD}', msg: 'Try a quiz to see your score!' };

        const badgeHtml = badgeCount > 0 ? '<div style="margin-top:24px;padding:20px;background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:16px;border:2px solid #f59e0b40"><h3 style="font-size:18px;font-weight:800;color:#92400e;margin:0 0 12px">\u{1F3C5} My Badges (' + badgeCount + ')</h3><div style="display:flex;flex-wrap:wrap;gap:8px">' + Object.entries(badges).map(([name]) => '<span style="background:white;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:700;color:#92400e;border:1px solid #f59e0b60">\u{1F396}\u{FE0F} ' + name + '</span>').join('') + '</div></div>' : '';
        const strengthsHtml = masteredPhonemes.length > 0 ? '<div style="margin-top:20px;padding:20px;background:#f0fdf4;border-radius:16px;border:2px solid #86efac"><h3 style="font-size:18px;font-weight:800;color:#166534;margin:0 0 12px">\u{1F4AA} My Strengths</h3><div style="display:flex;flex-wrap:wrap;gap:8px">' + masteredPhonemes.slice(0, 12).map(([phoneme]) => '<span style="background:white;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:700;color:#166534;border:1px solid #86efac">\u2705 ' + phoneme + '</span>').join('') + '</div></div>' : '';

        // === Multi-session sections ===
        const growthHtml = hasHistory ? '<div style="margin-top:24px"><h3 style="font-size:18px;font-weight:800;color:#334155;margin:0 0 16px">\u{1F4C8} My Growth Journey (' + snapshots.length + ' sessions)</h3><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">' + growthCard('Word Sounds', first.wsAccuracy || 0, latest.wsAccuracy || 0, '%') + growthCard('Quiz Average', first.quizAvg || 0, latest.quizAvg || 0, '%') + growthCard('Activities', first.totalActivities || 0, latest.totalActivities || 0, '') + '</div><p style="font-size:12px;color:#64748b;text-align:center;font-style:italic">From ' + first.date + ' to ' + latest.date + '</p></div>' : '';

        const historyHtml = snapshots.length > 0 ? '<div style="margin-top:24px"><h3 style="font-size:18px;font-weight:800;color:#334155;margin:0 0 12px">\u{1F4CB} Session History</h3><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0"><thead><tr style="background:#f8fafc"><th style="padding:8px 12px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;text-align:left">#</th><th style="padding:8px 12px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;text-align:left">Date</th><th style="padding:8px 12px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;text-align:left">Word Sounds</th><th style="padding:8px 12px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;text-align:left">Quiz Avg</th><th style="padding:8px 12px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;text-align:left">Activities</th></tr></thead><tbody>' + snapshots.slice(-10).map((s, i) => sessionRow(s, i)).join('') + '</tbody></table></div></div>' : '';

        const html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>My Learning Journey</title><style>@import url(https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap);*{box-sizing:border-box;margin:0;padding:0}body{font-family:Inter,sans-serif;background:linear-gradient(180deg,#dbeafe 0%,#ede9fe 50%,#fce7f3 100%);min-height:100vh;padding:32px}@media print{body{background:white;padding:16px}}</style></head><body><div style="max-width:700px;margin:0 auto"><div style="text-align:center;margin-bottom:32px"><div style="font-size:48px;margin-bottom:8px">\u{1F31F}</div><h1 style="font-size:32px;font-weight:800;color:#1e293b;margin-bottom:4px">My Learning Journey</h1><p style="color:#64748b;font-size:14px">' + date + (hasHistory ? ' \u2022 ' + snapshots.length + ' sessions tracked' : '') + '</p></div><div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;border-radius:20px;padding:24px;text-align:center;margin-bottom:24px;box-shadow:0 8px 32px rgba(99,102,241,0.3)"><div style="font-size:14px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.8;margin-bottom:8px">Level</div><div style="font-size:48px;font-weight:800">' + level + '</div><div style="font-size:16px;font-weight:600;margin-top:4px">' + xp + ' XP earned ' + quizEnc.emoji + '</div><div style="margin-top:12px;font-size:14px;opacity:0.9">' + quizEnc.msg + '</div></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px">' + statCard('\u{1F4DA}', 'Activities', totalActivities, '#6366f1') + statCard('\u2705', 'Quiz Avg', avgQuizScore !== null ? avgQuizScore + '%' : '\u2014', '#16a34a') + statCard('\u{1F524}', 'Word Accuracy', wsAccuracy !== null ? wsAccuracy + '%' : '\u2014', '#0891b2') + '</div>' + growthHtml + historyHtml + badgeHtml + strengthsHtml + '<div style="margin-top:32px;text-align:center;color:#94a3b8;font-size:12px">Generated ' + date + ' \u2022 Created with AlloFlow \u2022 Keep learning! \u{1F680}</div></div></body></html>';
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my_learning_journey_' + new Date().toISOString().split('T')[0] + '.html';
        a.click();
        URL.revokeObjectURL(url);
        if (addToast) addToast('\u{1F4CA} Your progress report has been downloaded!', 'success');
    };
"""

def main():
    content = SRC.read_text(encoding='utf-8')
    changes = 0
    
    # 1. Replace the existing report function
    start_marker = "\n    const generateStudentFriendlyReport = (sessionData) => {"
    end_marker = "    };\n"
    
    start_idx = content.find(start_marker)
    if start_idx < 0:
        print("FAIL: report function not found")
        return
    
    # Find the matching end - it's the "};" at the function level
    # Count braces to find the right end
    depth = 0
    in_fn = False
    end_idx = -1
    i = start_idx + len("\n    const generateStudentFriendlyReport = (sessionData) => {")
    depth = 1  # We're inside the opening {
    while i < len(content) and depth > 0:
        ch = content[i]
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                # Found the matching close
                # Include the }; and newline
                end_idx = i + 1
                if end_idx < len(content) and content[end_idx] == ';':
                    end_idx += 1
                break
        i += 1
    
    if end_idx < 0:
        print("FAIL: couldn't find end of report function")
        return
    
    # Replace
    old_fn = content[start_idx:end_idx]
    content = content[:start_idx] + NEW_REPORT_FN + content[end_idx:]
    changes += 1
    print("1. Replaced report function with multi-session version")
    
    # 2. Update the button click to pass progressSnapshots from roster
    old_click = "generateStudentFriendlyReport({ history, wordSoundsHistory, phonemeMastery, wordSoundsBadges, gameCompletions, globalPoints, globalLevel })"
    new_click = "generateStudentFriendlyReport({ history, wordSoundsHistory, phonemeMastery, wordSoundsBadges, gameCompletions, globalPoints, globalLevel, progressSnapshots: (rosterKey?.progressHistory && Object.values(rosterKey.progressHistory)[0]) || [] })"
    
    count = content.count(old_click)
    if count > 0:
        content = content.replace(old_click, new_click)
        changes += count
        print(f"2. Updated {count} button click(s) to pass progressSnapshots")
    else:
        print("2. SKIP - click handler not found")
    
    SRC.write_text(content, encoding='utf-8')
    
    # Verify
    final = SRC.read_text(encoding='utf-8')
    print(f"\nDone! {changes} changes.")
    print(f"  Report fn: {'OK' if 'progressSnapshots' in final and 'growthCard' in final else 'MISSING'}")
    print(f"  Multi-session: {'OK' if 'Growth Journey' in final else 'MISSING'}")
    print(f"  Session History: {'OK' if 'Session History' in final else 'MISSING'}")

if __name__ == "__main__":
    main()
