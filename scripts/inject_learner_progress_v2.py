#!/usr/bin/env python3
"""Fix: Insert LearnerProgressView component + update header button."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()
    lines = content.split('\n')

print(f"Total lines: {len(lines)}")

changes = 0

# ====================================================================
# 1. Insert LearnerProgressView BETWEEN LongitudinalProgressChart and TeacherDashboard
# ====================================================================
# Find the line "const TeacherDashboard = React.memo"
target = 'const TeacherDashboard = React.memo'
insert_idx = None
for i, l in enumerate(lines):
    if target in l:
        insert_idx = i
        print(f"Found TeacherDashboard at L{i+1}")
        break

LEARNER_COMPONENT = '''// === LEARNER PROGRESS VIEW (Parent & Independent Modes) ===
const LearnerProgressView = React.memo(({ 
    globalPoints = 0, globalLevel = 1, globalProgress = 0, currentLevelXP = 0, globalXPNext = 100,
    history = [], wordSoundsHistory = [], phonemeMastery = {}, 
    studentProgressLog = [], pointHistory = [], wordSoundsBadges = {},
    gameCompletions = [], fluencyAssessments = [], labelChallengeResults = [],
    isParentMode = false, isIndependentMode = false, t, onClose,
    rosterKey, setRosterKey, onShareWithTeacher
}) => {
    const [showDiagnostics, setShowDiagnostics] = useState(() => isIndependentMode);
    const [selectedChild, setSelectedChild] = useState(null);
    
    // Multi-child profiles (parent mode)
    const childProfiles = useMemo(() => {
        if (!isParentMode || !rosterKey?.students) return [];
        return Object.entries(rosterKey.students).map(([name, groupId]) => ({
            name,
            groupId,
            lastSession: rosterKey?.progressHistory?.[name]?.slice(-1)?.[0]?.timestamp || null,
            sessionCount: rosterKey?.progressHistory?.[name]?.length || 0
        }));
    }, [isParentMode, rosterKey]);

    // Derived stats
    const stats = useMemo(() => {
        const quizzes = history.filter(h => h.type === 'quiz');
        const wsCorrect = wordSoundsHistory.filter(h => h.correct).length;
        const wsTotal = wordSoundsHistory.length;
        const wsAccuracy = wsTotal > 0 ? Math.round((wsCorrect / wsTotal) * 100) : 0;
        const masteredPhonemes = Object.entries(phonemeMastery).filter(([_, v]) => v.accuracy >= 80);
        const practicingPhonemes = Object.entries(phonemeMastery).filter(([_, v]) => v.accuracy > 0 && v.accuracy < 80);
        const totalActivities = history.length + (wsTotal > 0 ? 1 : 0) + (gameCompletions?.length || 0);
        const recentSessions = studentProgressLog.slice(-5);
        const trend = recentSessions.length >= 2 
            ? recentSessions[recentSessions.length - 1].xp - recentSessions[0].xp 
            : 0;
        return {
            quizCount: quizzes.length,
            wsAccuracy, wsCorrect, wsTotal,
            masteredPhonemes, practicingPhonemes,
            totalActivities,
            gamesPlayed: gameCompletions?.length || 0,
            fluencyTests: fluencyAssessments?.length || 0,
            labelChallenges: labelChallengeResults?.length || 0,
            sessionCount: studentProgressLog.length,
            trend
        };
    }, [history, wordSoundsHistory, phonemeMastery, gameCompletions, fluencyAssessments, labelChallengeResults, studentProgressLog]);

    const heading = isParentMode 
        ? (selectedChild ? selectedChild + "'s Learning Journey" : "Your Child's Learning Journey")
        : "My Learning Progress";

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                            <TrendingUp size={22} className="text-white" />
                        </div>
                        {heading}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1 font-medium">
                        {isParentMode ? "Track your family's learning growth" : "Track your learning growth over time"}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowDiagnostics(prev => !prev)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                            showDiagnostics 
                                ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300' 
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                        title={showDiagnostics ? "Hide detailed metrics" : "Show detailed metrics"}
                    >
                        <BarChart3 size={14} />
                        {showDiagnostics ? 'Details On' : 'Details'}
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>
            
            {/* Multi-child selector (parent mode) */}
            {isParentMode && childProfiles.length > 0 && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-4 border border-purple-100">
                    <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Users size={14} /> Family Members
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSelectedChild(null)}
                            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                !selectedChild ? 'bg-white text-indigo-700 shadow-md ring-2 ring-indigo-300' : 'bg-white/60 text-slate-600 hover:bg-white'
                            }`}
                        >
                            Everyone
                        </button>
                        {childProfiles.map(child => (
                            <button
                                key={child.name}
                                onClick={() => setSelectedChild(child.name)}
                                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                                    selectedChild === child.name ? 'bg-white text-indigo-700 shadow-md ring-2 ring-indigo-300' : 'bg-white/60 text-slate-600 hover:bg-white'
                                }`}
                            >
                                {child.name}
                                {child.sessionCount > 0 && (
                                    <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-mono">
                                        {child.sessionCount} sessions
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: Level & XP */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-14 h-14 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-indigo-900 shadow-lg relative">
                            <Trophy size={28} className="text-indigo-900 fill-current" />
                            <div className="absolute -bottom-2 bg-indigo-900 text-yellow-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-white">
                                Lvl {globalLevel}
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total XP</div>
                            <div className="text-2xl font-black text-indigo-900">{globalPoints.toLocaleString()}</div>
                        </div>
                        {stats.trend > 0 && (
                            <div className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                                <TrendingUp size={12} /> +{stats.trend} XP
                            </div>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                            <span>Level {globalLevel}</span>
                            <span>{Math.round(globalProgress)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-1000 rounded-full" style={{ width: `${Math.max(5, globalProgress)}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                            <span>{currentLevelXP} XP</span>
                            <span>{globalXPNext} XP to next</span>
                        </div>
                    </div>
                </div>

                {/* Card 2: Activity Summary */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <Activity size={14} /> Activities Completed
                    </h3>
                    <div className="text-3xl font-black text-slate-800 mb-4">{stats.totalActivities}</div>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { label: 'Quizzes', value: stats.quizCount, icon: '\\ud83d\\udcdd', color: 'bg-blue-50 text-blue-700' },
                            { label: 'Words Practiced', value: stats.wsTotal, icon: '\\ud83d\\udd24', color: 'bg-purple-50 text-purple-700' },
                            { label: 'Games', value: stats.gamesPlayed, icon: '\\ud83c\\udfae', color: 'bg-green-50 text-green-700' },
                            { label: 'Fluency Tests', value: stats.fluencyTests, icon: '\\u23f1\\ufe0f', color: 'bg-orange-50 text-orange-700' },
                        ].map(item => (
                            <div key={item.label} className={`${item.color} rounded-lg px-3 py-2 text-center`}>
                                <div className="text-lg font-black">{item.icon} {item.value}</div>
                                <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">{item.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Card 3: Skills Progress */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Target size={14} /> Skills Progress
                    </h3>
                    {stats.wsTotal === 0 && Object.keys(phonemeMastery).length === 0 ? (
                        <div className="text-center py-6 text-slate-400 italic text-sm">
                            <BookOpen size={32} className="mx-auto mb-2 opacity-40" />
                            Start practicing to see your skills grow!
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {stats.wsTotal > 0 && (
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-bold text-slate-600">Word Sounds Accuracy</span>
                                        <span className={`text-sm font-black ${stats.wsAccuracy >= 80 ? 'text-green-600' : stats.wsAccuracy >= 60 ? 'text-yellow-600' : 'text-orange-500'}`}>
                                            {stats.wsAccuracy}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${stats.wsAccuracy >= 80 ? 'bg-green-500' : stats.wsAccuracy >= 60 ? 'bg-yellow-500' : 'bg-orange-400'}`}
                                            style={{ width: `${stats.wsAccuracy}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                            {stats.masteredPhonemes.length > 0 && (
                                <div>
                                    <div className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1.5">
                                        \\u2728 {stats.masteredPhonemes.length} Sounds Mastered
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {stats.masteredPhonemes.slice(0, 12).map(([phoneme]) => (
                                            <span key={phoneme} className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-200">
                                                /{phoneme}/
                                            </span>
                                        ))}
                                        {stats.masteredPhonemes.length > 12 && (
                                            <span className="px-2 py-0.5 bg-green-50 text-green-600 text-xs font-bold rounded-full">
                                                +{stats.masteredPhonemes.length - 12} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                            {showDiagnostics && stats.practicingPhonemes.length > 0 && (
                                <div>
                                    <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1.5">
                                        \\ud83d\\udd04 {stats.practicingPhonemes.length} Sounds In Progress
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {stats.practicingPhonemes.slice(0, 8).map(([phoneme, data]) => (
                                            <span key={phoneme} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200" title={`${Math.round(data.accuracy)}% accuracy`}>
                                                /{phoneme}/ <span className="opacity-60">{Math.round(data.accuracy)}%</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Card 4: Achievements */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Award size={14} /> Achievements
                    </h3>
                    {(() => {
                        const milestones = [
                            { name: 'First Steps', earned: globalPoints >= 10, icon: '\\ud83d\\udc63', desc: 'Earned your first XP' },
                            { name: 'Quiz Whiz', earned: stats.quizCount >= 3, icon: '\\ud83e\\udde0', desc: 'Completed 3 quizzes' },
                            { name: 'Word Explorer', earned: stats.wsTotal >= 20, icon: '\\ud83d\\udd0d', desc: 'Practiced 20 words' },
                            { name: 'Game Champion', earned: stats.gamesPlayed >= 5, icon: '\\ud83c\\udfc6', desc: 'Played 5 games' },
                            { name: 'Level Up!', earned: globalLevel >= 2, icon: '\\u2b50', desc: 'Reached Level 2' },
                            { name: 'Super Scholar', earned: globalLevel >= 5, icon: '\\ud83c\\udf1f', desc: 'Reached Level 5' },
                            { name: 'Sound Master', earned: stats.masteredPhonemes.length >= 5, icon: '\\ud83c\\udfb5', desc: 'Mastered 5 phonemes' },
                            { name: 'Consistent', earned: stats.sessionCount >= 3, icon: '\\ud83d\\udcc5', desc: '3 learning sessions' },
                        ];
                        const earned = milestones.filter(m => m.earned);
                        const locked = milestones.filter(m => !m.earned);
                        return (
                            <div className="space-y-3">
                                {earned.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {earned.map(m => (
                                            <div key={m.name} className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-center min-w-[80px] hover:shadow-sm transition-shadow" title={m.desc}>
                                                <div className="text-xl">{m.icon}</div>
                                                <div className="text-[10px] font-bold text-yellow-800 mt-0.5">{m.name}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {earned.length === 0 && (
                                    <div className="text-center py-4 text-slate-400 italic text-sm">
                                        Complete activities to earn achievements! \\ud83c\\udf1f
                                    </div>
                                )}
                                {showDiagnostics && locked.length > 0 && (
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Coming Up</div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {locked.slice(0, 4).map(m => (
                                                <div key={m.name} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center opacity-50" title={m.desc}>
                                                    <div className="text-sm grayscale">{m.icon}</div>
                                                    <div className="text-[9px] font-bold text-slate-500">{m.name}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* Card 5: Growth Over Time (full width) */}
            {studentProgressLog.length >= 2 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <TrendingUp size={14} /> Growth Over Time
                    </h3>
                    <LongitudinalProgressChart logs={studentProgressLog} />
                </div>
            )}

            {/* Diagnostics Panel (toggleable) */}
            {showDiagnostics && (
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <BarChart3 size={14} /> Detailed Metrics
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-white rounded-xl p-3 border border-slate-200 text-center">
                            <div className="text-lg font-black text-slate-700">{stats.wsCorrect}/{stats.wsTotal}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Words Correct</div>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-slate-200 text-center">
                            <div className="text-lg font-black text-slate-700">{Object.keys(phonemeMastery).length}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Phonemes Touched</div>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-slate-200 text-center">
                            <div className="text-lg font-black text-slate-700">{stats.sessionCount}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Sessions</div>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-slate-200 text-center">
                            <div className="text-lg font-black text-slate-700">{stats.labelChallenges}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Label Challenges</div>
                        </div>
                    </div>
                    {pointHistory.length > 0 && (
                        <div>
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Recent Activity</h4>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                {pointHistory.slice(0, 10).map((entry, i) => (
                                    <div key={entry.id || i} className="flex justify-between items-center text-xs px-2 py-1 rounded hover:bg-white">
                                        <span className="text-slate-600 font-medium truncate max-w-[200px]">{entry.activity}</span>
                                        <span className="font-bold text-green-600">+{entry.points} XP</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {/* Share with Teacher (parent mode) */}
            {isParentMode && onShareWithTeacher && (
                <div className="flex justify-center pt-2">
                    <button
                        onClick={onShareWithTeacher}
                        className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] flex items-center gap-2 text-sm"
                    >
                        <Share2 size={16} /> Share Progress with Teacher
                    </button>
                </div>
            )}
        </div>
    );
});
'''

if insert_idx is not None:
    component_lines = LEARNER_COMPONENT.split('\n')
    # Need to match file's line ending style
    # Insert component lines before TeacherDashboard
    new_content_lines = component_lines + ['']
    for j, cl in enumerate(new_content_lines):
        lines.insert(insert_idx + j, cl)
    changes += 1
    print(f"1: Inserted LearnerProgressView ({len(new_content_lines)} lines) before TeacherDashboard at L{insert_idx+1}")
else:
    print("1: FAILED - Could not find TeacherDashboard")

# ====================================================================
# 2. Update header button gate
#    Line 61196: {isTeacherMode && !isIndependentMode && (
#    Change to: {true /* all modes see dashboard */ && (
# ====================================================================
for i, l in enumerate(lines):
    stripped = l.strip()
    if stripped == '{isTeacherMode && !isIndependentMode && (':
        # Check next few lines to see if dashboard button
        lookahead = '\n'.join(lines[i:i+5])
        if 'handleSetActiveViewToDashboard' in lookahead or 'dashboard' in lookahead.lower():
            lines[i] = l.replace('isTeacherMode && !isIndependentMode', 'true /* all modes see dashboard */')
            changes += 1
            print(f"2: Updated header button gate at L{i+1}")
            break

# ====================================================================
# SAVE
# ====================================================================
with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write('\n'.join(lines))

print(f"\nDone! {changes} changes applied.")
