#!/usr/bin/env python3
"""Tier 1 Quick Wins: Printable report, weekly summary, streak display."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# ====================================================================
# FEATURE 1: Add wordSoundsScore prop to component signature + render site
# ====================================================================

# 1a. Update component signature to accept wordSoundsScore
old_sig = "gameCompletions = [], fluencyAssessments = [], labelChallengeResults = [],"
new_sig = "gameCompletions = [], fluencyAssessments = [], labelChallengeResults = [],\n    wordSoundsScore = { streak: 0 },"
if old_sig in content:
    content = content.replace(old_sig, new_sig, 1)
    changes += 1
    print("1a: Added wordSoundsScore to LearnerProgressView signature")
else:
    print("1a: SKIP - signature not found")

# 1b. Pass wordSoundsScore at render site
old_render_prop = "              labelChallengeResults={labelChallengeResults}\n              isParentMode={isParentMode}"
new_render_prop = "              labelChallengeResults={labelChallengeResults}\n              wordSoundsScore={wordSoundsScore}\n              isParentMode={isParentMode}"
if old_render_prop in content:
    content = content.replace(old_render_prop, new_render_prop, 1)
    changes += 1
    print("1b: Passed wordSoundsScore to LearnerProgressView render site")
else:
    print("1b: SKIP - render prop not found")

# ====================================================================
# FEATURE 2: Add streak display to Card 1 (Level & XP)
#
# Insert streak info after the trend indicator in the Level & XP card
# ====================================================================

old_trend_section = """                        {stats.trend > 0 && (
                            <div className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                                <TrendingUp size={12} /> +{stats.trend} XP
                            </div>
                        )}
                    </div>
                    <div className="space-y-1.5">"""

new_trend_section = """                        {stats.trend > 0 && (
                            <div className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                                <TrendingUp size={12} /> +{stats.trend} XP
                            </div>
                        )}
                    </div>
                    {/* Streak Display */}
                    {(wordSoundsScore?.streak > 0 || (() => {
                        const days = new Set();
                        pointHistory.forEach(e => { if (e.timestamp) days.add(new Date(e.timestamp).toDateString()); });
                        const dayList = Array.from(days).sort((a, b) => new Date(b) - new Date(a));
                        let dayStreak = 0;
                        const today = new Date();
                        for (let i = 0; i < dayList.length; i++) {
                            const expected = new Date(today);
                            expected.setDate(today.getDate() - i);
                            if (dayList[i] === expected.toDateString()) dayStreak++;
                            else break;
                        }
                        return dayStreak >= 2;
                    })()) && (
                        <div className="flex items-center gap-3 mb-2 px-3 py-2 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100">
                            {wordSoundsScore?.streak > 0 && (
                                <div className="flex items-center gap-1">
                                    <span className="text-lg">🔥</span>
                                    <div>
                                        <div className="text-sm font-black text-orange-600">{wordSoundsScore.streak} Streak</div>
                                        <div className="text-[9px] text-orange-400 font-bold uppercase">Current Run</div>
                                    </div>
                                </div>
                            )}
                            {(() => {
                                const days = new Set();
                                pointHistory.forEach(e => { if (e.timestamp) days.add(new Date(e.timestamp).toDateString()); });
                                const dayList = Array.from(days).sort((a, b) => new Date(b) - new Date(a));
                                let dayStreak = 0;
                                const today = new Date();
                                for (let i = 0; i < dayList.length; i++) {
                                    const expected = new Date(today);
                                    expected.setDate(today.getDate() - i);
                                    if (dayList[i] === expected.toDateString()) dayStreak++;
                                    else break;
                                }
                                return dayStreak >= 2 ? (
                                    <div className="flex items-center gap-1 ml-auto">
                                        <span className="text-lg">📅</span>
                                        <div>
                                            <div className="text-sm font-black text-red-600">{dayStreak} Days</div>
                                            <div className="text-[9px] text-red-400 font-bold uppercase">Daily Streak</div>
                                        </div>
                                    </div>
                                ) : null;
                            })()}
                        </div>
                    )}
                    <div className="space-y-1.5">"""

if old_trend_section in content:
    content = content.replace(old_trend_section, new_trend_section, 1)
    changes += 1
    print("2: Added streak display to Level & XP card")
else:
    print("2: SKIP - trend section not found")

# ====================================================================
# FEATURE 3: Add Weekly Summary Card after Today's Activity
# ====================================================================

old_growth_card = "            {/* Card 6: Growth Over Time (full width) */}"
new_weekly_card = """            {/* Card 6: Weekly Summary */}
            {(() => {
                const now = new Date();
                const weekAgo = new Date(now);
                weekAgo.setDate(now.getDate() - 7);
                const weekXP = pointHistory.filter(e => e.timestamp && new Date(e.timestamp) >= weekAgo);
                const weekWords = wordSoundsHistory.filter(h => h.timestamp && new Date(h.timestamp) >= weekAgo);
                const weekGames = gameCompletions?.filter(g => g.timestamp && new Date(g.timestamp) >= weekAgo) || [];
                const prevWeekStart = new Date(weekAgo);
                prevWeekStart.setDate(prevWeekStart.getDate() - 7);
                const prevWeekXP = pointHistory.filter(e => e.timestamp && new Date(e.timestamp) >= prevWeekStart && new Date(e.timestamp) < weekAgo);
                const weekTotalXP = weekXP.reduce((s, e) => s + (e.points || 0), 0);
                const prevTotalXP = prevWeekXP.reduce((s, e) => s + (e.points || 0), 0);
                const xpDelta = weekTotalXP - prevTotalXP;
                const weekAccuracy = weekWords.length > 0 ? Math.round(weekWords.filter(w => w.correct).length / weekWords.length * 100) : null;
                if (weekXP.length === 0 && weekWords.length === 0) return null;
                return (
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-5">
                        <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Calendar size={14} /> This Week's Progress
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                            <div className="bg-white rounded-xl p-3 text-center border border-emerald-100">
                                <div className="text-lg font-black text-emerald-700">{weekTotalXP}</div>
                                <div className="text-[10px] font-bold text-emerald-400 uppercase">XP This Week</div>
                                {xpDelta !== 0 && (
                                    <div className={`text-[10px] font-bold mt-0.5 ${xpDelta > 0 ? 'text-green-500' : 'text-red-400'}`}>
                                        {xpDelta > 0 ? '↑' : '↓'} {Math.abs(xpDelta)} vs last week
                                    </div>
                                )}
                            </div>
                            <div className="bg-white rounded-xl p-3 text-center border border-emerald-100">
                                <div className="text-lg font-black text-emerald-700">{weekXP.length}</div>
                                <div className="text-[10px] font-bold text-emerald-400 uppercase">Activities</div>
                            </div>
                            <div className="bg-white rounded-xl p-3 text-center border border-emerald-100">
                                <div className="text-lg font-black text-emerald-700">{weekWords.filter(w => w.correct).length}/{weekWords.length}</div>
                                <div className="text-[10px] font-bold text-emerald-400 uppercase">Words This Week</div>
                            </div>
                            <div className="bg-white rounded-xl p-3 text-center border border-emerald-100">
                                <div className="text-lg font-black text-emerald-700">{weekAccuracy !== null ? weekAccuracy + '%' : '—'}</div>
                                <div className="text-[10px] font-bold text-emerald-400 uppercase">Accuracy</div>
                            </div>
                        </div>
                        {weekGames.length > 0 && (
                            <div className="text-xs text-emerald-600 font-medium bg-white/60 rounded-lg px-3 py-2">
                                🎮 {weekGames.length} game{weekGames.length !== 1 ? 's' : ''} played this week
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Card 7: Growth Over Time (full width) */}"""

if old_growth_card in content:
    content = content.replace(old_growth_card, new_weekly_card, 1)
    changes += 1
    print("3: Added Weekly Summary card")
else:
    print("3: SKIP - growth card marker not found")

# ====================================================================
# FEATURE 4: Add Printable Progress Report button
# Insert next to the Share with Teacher button
# ====================================================================

old_share_section = """            {/* Share with Teacher (parent mode) */}
            {isParentMode && onShareWithTeacher && (
                <div className="flex justify-center pt-2">
                    <button
                        onClick={onShareWithTeacher}
                        className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] flex items-center gap-2 text-sm"
                    >
                        <Share2 size={16} /> Share Progress with Teacher
                    </button>
                </div>
            )}"""

new_share_section = """            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-3 pt-2">
                {/* Print Progress Report */}
                <button
                    onClick={() => {
                        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                        const metricBar = (label, value, max, unit, icon) => {
                            const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
                            const barColor = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#e11d48';
                            return `<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px"><span style="font-size:13px;font-weight:600;color:#334155">${icon} ${label}</span><span style="font-size:14px;font-weight:800;color:${barColor}">${value}${unit}</span></div><div style="background:#f1f5f9;border-radius:6px;height:10px;overflow:hidden"><div style="background:${barColor};height:100%;border-radius:6px;width:${pct}%"></div></div></div>`;
                        };
                        const masteredCount = Object.entries(phonemeMastery).filter(([_,v]) => v.accuracy >= 80).length;
                        const masteredList = Object.entries(phonemeMastery).filter(([_,v]) => v.accuracy >= 80).map(([p]) => '/' + p + '/').join(', ');
                        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Learning Progress Report</title><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',-apple-system,sans-serif;color:#1e293b;background:#f8fafc;padding:32px;line-height:1.5}.report{max-width:700px;margin:0 auto;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);overflow:hidden}.header{padding:28px 32px;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);color:white}.header h1{font-size:22px;font-weight:800;margin-bottom:4px}.header p{font-size:13px;opacity:.85}.content{padding:28px 32px}.section-title{font-size:15px;font-weight:800;color:#334155;margin:20px 0 12px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}.badge-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}.badge{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#fef9c3;border:1px solid #fcd34d;border-radius:10px;font-size:12px;font-weight:700;color:#92400e}.footer{padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8}.print-btn{display:block;margin:16px auto;padding:10px 28px;background:#4f46e5;color:white;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit}.print-btn:hover{background:#4338ca}@media print{body{padding:0;background:white}.report{box-shadow:none;border-radius:0}.print-btn{display:none!important}.header{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="report"><div class="header"><h1>🌟 ${isParentMode ? "Your Child's" : 'My'} Learning Progress Report</h1><p>${isParentMode ? 'Family Progress Overview' : 'Personal Progress Overview'} &bull; ${date}</p></div><div class="content"><div style="display:flex;align-items:center;gap:16px;padding:16px;background:linear-gradient(135deg,#fef3c7,#fef9c3);border:2px solid #fcd34d;border-radius:12px;margin-bottom:20px"><div style="width:56px;height:56px;background:#eab308;border-radius:50%;display:flex;align-items:center;justify-content:center;border:4px solid #1e1b4b;font-size:24px;font-weight:900;color:#1e1b4b">Lv${globalLevel}</div><div><div style="font-size:20px;font-weight:800;color:#1e1b4b">${globalPoints.toLocaleString()} Total XP</div><div style="font-size:12px;color:#92400e;font-weight:600">Level ${globalLevel} Learner &bull; ${Math.round(globalProgress)}% to next level</div></div></div><div class="section-title">📊 Performance Summary</div>${metricBar('Word Sounds Accuracy', stats.wsAccuracy, 100, '%', '🔊')}${metricBar('Quizzes Completed', stats.quizCount, 10, '', '📝')}${metricBar('Words Practiced', stats.wsTotal, 50, '', '🔤')}${metricBar('Games Played', stats.gamesPlayed, 10, '', '🎮')}${metricBar('Fluency Tests', stats.fluencyTests, 5, '', '⏱️')}${metricBar('Total Activities', stats.totalActivities, 20, '', '📊')}<div class="section-title">🎯 Skills Mastered</div><div style="font-size:13px;color:#475569;margin-bottom:8px"><strong>${masteredCount}</strong> phoneme sounds mastered${masteredCount > 0 ? ':' : ''}</div>${masteredCount > 0 ? '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">' + Object.entries(phonemeMastery).filter(([_,v]) => v.accuracy >= 80).map(([p]) => '<span style="padding:4px 12px;background:#dcfce7;color:#16a34a;border:1px solid #86efac;border-radius:20px;font-size:12px;font-weight:700">/' + p + '/</span>').join('') + '</div>' : '<p style="font-size:13px;color:#94a3b8;font-style:italic">Keep practicing to master sounds!</p>'}<div class="section-title">🏅 Achievements Earned</div><div class="badge-row">${globalPoints >= 10 ? '<div class="badge">👣 First Steps</div>' : ''}${stats.quizCount >= 3 ? '<div class="badge">🧠 Quiz Whiz</div>' : ''}${stats.wsTotal >= 20 ? '<div class="badge">🔍 Word Explorer</div>' : ''}${stats.gamesPlayed >= 5 ? '<div class="badge">🏆 Game Champion</div>' : ''}${globalLevel >= 2 ? '<div class="badge">⭐ Level Up!</div>' : ''}${globalLevel >= 5 ? '<div class="badge">🌟 Super Scholar</div>' : ''}${stats.masteredPhonemes.length >= 5 ? '<div class="badge">🎵 Sound Master</div>' : ''}${stats.sessionCount >= 3 ? '<div class="badge">📅 Consistent</div>' : ''}</div></div><div class="footer">Generated ${date} &bull; Created with AlloFlow &bull; Learning Progress Report</div></div><button class="print-btn" onclick="window.print()">🖨️ Print This Report</button></body></html>`;
                        const w = window.open('', '_blank');
                        if (w) { w.document.write(html); w.document.close(); }
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] flex items-center gap-2 text-sm"
                >
                    <Printer size={16} /> Print Progress Report
                </button>
                {/* Share with Teacher (parent mode) */}
                {isParentMode && onShareWithTeacher && (
                    <button
                        onClick={onShareWithTeacher}
                        className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] flex items-center gap-2 text-sm"
                    >
                        <Share2 size={16} /> Share Progress with Teacher
                    </button>
                )}
            </div>"""

if old_share_section in content:
    content = content.replace(old_share_section, new_share_section, 1)
    changes += 1
    print("4: Added Print Progress Report button")
else:
    print("4: SKIP - share section not found")

# ====================================================================
# SAVE
# ====================================================================
with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied.")
