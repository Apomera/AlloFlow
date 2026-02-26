"""
Add printable parent-friendly student progress report to RTI Dashboard.
Two changes:
1. Insert generateStudentProgressReport function after generateRTICSV
2. Add Print Parent Report button to student detail modal header
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# === CHANGE 1: Insert generateStudentProgressReport after generateRTICSV ===
# Find the end of generateRTICSV — the line "URL.revokeObjectURL(link.href);" followed by "};"
# then inject the new function before "// Extract safety flags"

MARKER1 = """        URL.revokeObjectURL(link.href);
    };

    // Extract safety flags from persona chat history"""

REPLACEMENT1 = r"""        URL.revokeObjectURL(link.href);
    };

    // === PARENT-FRIENDLY PRINTABLE PROGRESS REPORT ===
    const generateStudentProgressReport = (student) => {
        if (!student) return;
        const rti = classifyRTITier(student.stats);
        const s = student.stats;
        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const tierColors = { 1: { bg: '#dcfce7', color: '#16a34a', border: '#86efac', label: 'On Track' }, 2: { bg: '#fef9c3', color: '#d97706', border: '#fcd34d', label: 'Strategic Support' }, 3: { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5', label: 'Intensive Support' } };
        const tc = tierColors[rti.tier] || tierColors[1];

        const metricBar = (label, value, max, unit, icon) => {
            const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
            const barColor = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
            return `
                <div style="margin-bottom: 14px;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                        <span style="font-size: 13px; font-weight: 600; color: #334155;">${icon} ${label}</span>
                        <span style="font-size: 14px; font-weight: 800; color: ${barColor};">${value}${unit}</span>
                    </div>
                    <div style="background: #f1f5f9; border-radius: 6px; height: 10px; overflow: hidden;">
                        <div style="background: ${barColor}; height: 100%; border-radius: 6px; width: ${pct}%; transition: width 0.3s;"></div>
                    </div>
                </div>`;
        };

        // Running record section (if available)
        let runningRecordHtml = '';
        const fluencyAssessments = student.data?.fluencyAssessments;
        if (fluencyAssessments?.length > 0) {
            const latest = fluencyAssessments[fluencyAssessments.length - 1];
            if (latest?.wordData && typeof calculateRunningRecordMetrics === 'function') {
                const rr = calculateRunningRecordMetrics(latest.wordData, latest.insertions || []);
                if (rr) {
                    const accColor = rr.accuracy >= 95 ? '#16a34a' : rr.accuracy >= 90 ? '#d97706' : '#dc2626';
                    const accLabel = rr.accuracy >= 95 ? 'Independent' : rr.accuracy >= 90 ? 'Instructional' : 'Frustrational';
                    runningRecordHtml = `
                        <div style="margin-top: 24px; padding: 16px; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 10px;">
                            <h3 style="font-size: 15px; font-weight: 800; color: #4338ca; margin: 0 0 12px 0;">\u{1f4d6} Oral Reading Fluency</h3>
                            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px;">
                                <div style="text-align: center; background: white; padding: 8px; border-radius: 8px; border: 1px solid #e0e7ff;">
                                    <div style="font-size: 20px; font-weight: 800; color: #dc2626;">${rr.substitutions}</div>
                                    <div style="font-size: 10px; color: #64748b; font-weight: 600;">Substitutions</div>
                                </div>
                                <div style="text-align: center; background: white; padding: 8px; border-radius: 8px; border: 1px solid #e0e7ff;">
                                    <div style="font-size: 20px; font-weight: 800; color: #ea580c;">${rr.omissions}</div>
                                    <div style="font-size: 10px; color: #64748b; font-weight: 600;">Omissions</div>
                                </div>
                                <div style="text-align: center; background: white; padding: 8px; border-radius: 8px; border: 1px solid #e0e7ff;">
                                    <div style="font-size: 20px; font-weight: 800; color: #7c3aed;">${rr.insertions}</div>
                                    <div style="font-size: 10px; color: #64748b; font-weight: 600;">Insertions</div>
                                </div>
                                <div style="text-align: center; background: white; padding: 8px; border-radius: 8px; border: 1px solid #e0e7ff;">
                                    <div style="font-size: 20px; font-weight: 800; color: #2563eb;">${rr.selfCorrections}</div>
                                    <div style="font-size: 10px; color: #64748b; font-weight: 600;">Self-Corrections</div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 16px; font-size: 12px; color: #475569; align-items: center; flex-wrap: wrap;">
                                <span><strong>Error Rate:</strong> 1:${rr.errorRate}</span>
                                <span><strong>SC Rate:</strong> ${rr.scRate}</span>
                                <span style="padding: 2px 10px; border-radius: 12px; font-weight: 700; background: ${accColor}20; color: ${accColor}; border: 1px solid ${accColor}40;">${accLabel} (${rr.accuracy}%)</span>
                            </div>
                        </div>`;
                }
            }
            if (latest?.wcpm) {
                runningRecordHtml += `
                    <div style="margin-top: 8px; padding: 10px 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 13px; color: #166534; font-weight: 600;">Latest Fluency:</span>
                        <span style="font-size: 18px; font-weight: 800; color: #16a34a;">${latest.wcpm} WCPM</span>
                    </div>`;
            }
        }

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Progress Report \u2014 ${student.name}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; background: #f8fafc; padding: 32px; line-height: 1.5; }
        .report { max-width: 700px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden; }
        .header { padding: 28px 32px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; }
        .header h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
        .header p { font-size: 13px; opacity: 0.85; }
        .content { padding: 28px 32px; }
        .tier-badge { display: inline-flex; align-items: center; gap: 10px; padding: 10px 20px; border-radius: 12px; margin-bottom: 20px; }
        .section-title { font-size: 15px; font-weight: 800; color: #334155; margin: 20px 0 12px 0; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; }
        .recommendations { padding-left: 20px; }
        .recommendations li { font-size: 13px; color: #475569; margin-bottom: 8px; line-height: 1.6; }
        .footer { padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
        .print-btn { display: block; margin: 16px auto; padding: 10px 28px; background: #4f46e5; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .print-btn:hover { background: #4338ca; }
        @media print {
            body { padding: 0; background: white; }
            .report { box-shadow: none; border-radius: 0; }
            .print-btn { display: none !important; }
            .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .tier-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            div[style*="background"] { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="report">
        <div class="header">
            <h1>Student Progress Report</h1>
            <p>${student.name} &bull; ${date}</p>
        </div>
        <div class="content">
            <div class="tier-badge" style="background: ${tc.bg}; border: 2px solid ${tc.border};">
                <span style="font-size: 28px;">${rti.emoji}</span>
                <div>
                    <div style="font-size: 16px; font-weight: 800; color: ${tc.color};">Tier ${rti.tier} \u2014 ${tc.label}</div>
                    <div style="font-size: 11px; color: #64748b;">RTI Classification</div>
                </div>
            </div>

            <div class="section-title">\u{1f4ca} Performance Summary</div>
            ${metricBar('Quiz Average', s.quizAvg, 100, '%', '\u{1f4dd}')}
            ${metricBar('Word Sounds Accuracy', s.wsAccuracy, 100, '%', '\u{1f50a}')}
            ${metricBar('Fluency', s.fluencyWCPM, 150, ' WCPM', '\u{1f4d6}')}
            ${metricBar('Label Challenge', s.labelChallengeAvg, 100, '%', '\u{1f3f7}\ufe0f')}
            ${metricBar('Total Activities', s.totalActivities, 20, '', '\u{1f4ca}')}
            ${metricBar('Games Played', s.gamesPlayed, 10, '', '\u{1f3ae}')}

            <div class="section-title">\u{1f4cb} Assessment Basis</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px;">
                ${rti.reasons.map(r => '<span style="font-size: 12px; padding: 4px 10px; border-radius: 20px; background: ' + tc.bg + '; color: ' + tc.color + '; font-weight: 600; border: 1px solid ' + tc.border + ';">' + r + '</span>').join('')}
            </div>

            <div class="section-title">\u{1f4a1} Recommendations for Home</div>
            <ul class="recommendations">
                ${rti.recommendations.map(r => '<li>' + r + '</li>').join('')}
            </ul>

            ${runningRecordHtml}
        </div>
        <div class="footer">
            Generated ${date} &bull; Created with AlloFlow &bull; RTI Progress Monitoring System
        </div>
    </div>
    <button class="print-btn" onclick="window.print()">\u{1f5a8}\ufe0f Print This Report</button>
</body>
</html>`;

        const reportWindow = window.open('', '_blank');
        if (reportWindow) {
            reportWindow.document.write(html);
            reportWindow.document.close();
        }
    };

    // Extract safety flags from persona chat history"""

if MARKER1 in content:
    content = content.replace(MARKER1, REPLACEMENT1, 1)
    print("✅ Change 1: generateStudentProgressReport function inserted successfully")
else:
    print("❌ Change 1 FAILED: Could not find marker for generateRTICSV end")
    # Try to find it partially
    if "URL.revokeObjectURL(link.href);" in content:
        print("   Found revokeObjectURL but full marker didn't match")
    if "// Extract safety flags from persona chat history" in content:
        print("   Found safety flags comment but full marker didn't match")

# === CHANGE 2: Add Print Parent Report button to student detail header ===
MARKER2 = """                                </button>
                                <h3 className="font-bold text-lg">{selectedStudent.name}</h3>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {/* RTI Progress Monitor Dashboard */}"""

REPLACEMENT2 = """                                </button>
                                <h3 className="font-bold text-lg">{selectedStudent.name}</h3>
                            </div>
                            <button
                                onClick={() => generateStudentProgressReport(selectedStudent)}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-bold text-sm hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md"
                                data-help-key="dashboard_print_parent_report"
                                aria-label="Print parent-friendly progress report"
                            >
                                <Printer size={14} /> Print Parent Report
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {/* RTI Progress Monitor Dashboard */}"""

if MARKER2 in content:
    content = content.replace(MARKER2, REPLACEMENT2, 1)
    print("✅ Change 2: Print Parent Report button added successfully")
else:
    print("❌ Change 2 FAILED: Could not find student detail header marker")
    # Debug
    if '{selectedStudent.name}' in content:
        print("   Found selectedStudent.name reference")
    if 'RTI Progress Monitor Dashboard' in content:
        print("   Found RTI Progress Monitor Dashboard comment")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✅ Script complete. File saved.")
