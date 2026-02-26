"""
Fix duplicate labelChallengeResults declaration and apply Part E detail view sections.
"""
import sys
import os

FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'AlloFlowANTI.txt')

def apply_edits():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    edits_applied = 0

    # ============================================================
    # FIX: Remove duplicate labelChallengeResults declaration
    # ============================================================
    duplicate = """  });
  // NEW: Track label challenge results for dashboard export
  const [labelChallengeResults, setLabelChallengeResults] = useState(() => {
      if (typeof window !== 'undefined') {
          try {
              const saved = localStorage.getItem('allo_label_challenge_results');
              if (saved) return JSON.parse(saved);
          } catch (e) { warnLog("Failed to load label challenge results", e); }
      }
      return [];
  });
  // NEW: Track escape room completions"""

    fixed = """  });
  // NEW: Track escape room completions"""

    if duplicate in content:
        content = content.replace(duplicate, fixed, 1)
        edits_applied += 1
        print("✅ FIX: Removed duplicate labelChallengeResults declaration")
    else:
        print("❌ FIX: Could not find exact duplicate. Trying alternate approach...")
        # Try to find and remove just the second occurrence
        first_idx = content.find("// NEW: Track label challenge results for dashboard export")
        if first_idx >= 0:
            second_idx = content.find("// NEW: Track label challenge results for dashboard export", first_idx + 10)
            if second_idx >= 0:
                # Find the end of the second block (the next comment)
                end_marker = "// NEW: Track escape room completions"
                end_idx = content.find(end_marker, second_idx)
                if end_idx >= 0:
                    content = content[:second_idx] + content[end_idx:]
                    edits_applied += 1
                    print("✅ FIX: Removed duplicate via alternate approach")

    # ============================================================
    # Part E: Add detail view sections
    # ============================================================
    target_e = """                            {/* Interview Transcript */}
                            {selectedStudent.data.personaState?.chatHistory?.length > 0 ? ("""

    new_sections = """                            {/* Word Sounds Performance */}
                            {selectedStudent.data?.wordSoundsState && (selectedStudent.data.wordSoundsState.history?.length > 0 || selectedStudent.data.wordSoundsState.sessionScore) && (
                                <div
                                    data-help-key="dashboard_detail_word_sounds"
                                    className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                                    <h4 className="font-bold text-emerald-700 mb-3 flex items-center gap-2">
                                        🔤 Word Sounds Performance
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {selectedStudent.stats?.wsAccuracy > 0 && (
                                            <div className="bg-white rounded-lg p-2 text-center border border-emerald-100">
                                                <div className="text-lg font-bold text-emerald-600">{selectedStudent.stats.wsAccuracy}%</div>
                                                <div className="text-xs text-slate-500">Accuracy</div>
                                            </div>
                                        )}
                                        {selectedStudent.stats?.wsWordsCompleted > 0 && (
                                            <div className="bg-white rounded-lg p-2 text-center border border-emerald-100">
                                                <div className="text-lg font-bold text-teal-600">{selectedStudent.stats.wsWordsCompleted}</div>
                                                <div className="text-xs text-slate-500">Words Completed</div>
                                            </div>
                                        )}
                                        {selectedStudent.stats?.wsBestStreak > 0 && (
                                            <div className="bg-white rounded-lg p-2 text-center border border-emerald-100">
                                                <div className="text-lg font-bold text-amber-600">{selectedStudent.stats.wsBestStreak}🔥</div>
                                                <div className="text-xs text-slate-500">Best Streak</div>
                                            </div>
                                        )}
                                        {selectedStudent.data.wordSoundsState.phonemeMastery && Object.keys(selectedStudent.data.wordSoundsState.phonemeMastery).length > 0 && (
                                            <div className="bg-white rounded-lg p-2 text-center border border-emerald-100">
                                                <div className="text-lg font-bold text-purple-600">{Object.keys(selectedStudent.data.wordSoundsState.phonemeMastery).length}</div>
                                                <div className="text-xs text-slate-500">Phonemes Practiced</div>
                                            </div>
                                        )}
                                    </div>
                                    {selectedStudent.data.wordSoundsState.badges?.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {selectedStudent.data.wordSoundsState.badges.map((badge, bi) => (
                                                <span key={bi} className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                                                    {typeof badge === 'string' ? badge : badge.name || '🏆'}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            {/* Game Completions Summary */}
                            {selectedStudent.stats?.gamesPlayed > 0 && (
                                <div
                                    data-help-key="dashboard_detail_games"
                                    className="mb-4 p-4 bg-violet-50 border border-violet-200 rounded-xl">
                                    <h4 className="font-bold text-violet-700 mb-3 flex items-center gap-2">
                                        🎮 Game Performance ({selectedStudent.stats.gamesPlayed} total plays)
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {[
                                            { key: 'memoryGame', label: 'Memory', icon: '🧠' },
                                            { key: 'matchingGame', label: 'Matching', icon: '🔗' },
                                            { key: 'syntaxScramble', label: 'Syntax Scramble', icon: '📝' },
                                            { key: 'crosswordGame', label: 'Crossword', icon: '✏️' },
                                            { key: 'timelineGame', label: 'Timeline', icon: '📅' },
                                            { key: 'conceptSortGame', label: 'Concept Sort', icon: '🗂️' },
                                            { key: 'vennDiagram', label: 'Venn Diagram', icon: '⭕' },
                                            { key: 'bingo', label: 'Bingo', icon: '🎯' },
                                            { key: 'wordScramble', label: 'Word Scramble', icon: '🔤' }
                                        ].filter(g => selectedStudent.stats[g.key]).map(game => {
                                            const s = selectedStudent.stats[game.key];
                                            return (
                                                <div key={game.key} className="bg-white rounded-lg p-3 border border-violet-100">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-medium text-sm text-slate-700">{game.icon} {game.label}</span>
                                                        <span className="text-xs text-slate-400">{s.attempts} play{s.attempts !== 1 ? 's' : ''}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-center">
                                                            <div className="text-lg font-bold text-violet-600">{Math.round(s.best)}%</div>
                                                            <div className="text-[10px] text-slate-400 uppercase">Best</div>
                                                        </div>
                                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full transition-all" style={{
                                                                width: `${Math.min(100, Math.round(s.best))}%`,
                                                                background: s.best >= 80 ? '#10b981' : s.best >= 50 ? '#f59e0b' : '#ef4444'
                                                            }} />
                                                        </div>
                                                        {s.attempts > 1 && (
                                                            <div className="text-center">
                                                                <div className={`text-xs font-bold ${s.best > s.initial ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                                    {s.best > s.initial ? `+${Math.round(s.best - s.initial)}%` : '—'}
                                                                </div>
                                                                <div className="text-[10px] text-slate-400 uppercase">Growth</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            {/* Label Challenge Results */}
                            {selectedStudent.data?.labelChallengeResults?.length > 0 && (
                                <div
                                    data-help-key="dashboard_detail_label_challenge"
                                    className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                    <h4 className="font-bold text-blue-700 mb-3 flex items-center gap-2">
                                        🏆 Label Challenge ({selectedStudent.stats.labelChallengeAttempts} attempt{selectedStudent.stats.labelChallengeAttempts !== 1 ? 's' : ''})
                                    </h4>
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        <div className="bg-white rounded-lg p-2 text-center border border-blue-100">
                                            <div className="text-lg font-bold text-blue-600">{selectedStudent.stats.labelChallengeAvg}%</div>
                                            <div className="text-xs text-slate-500">Average</div>
                                        </div>
                                        <div className="bg-white rounded-lg p-2 text-center border border-blue-100">
                                            <div className="text-lg font-bold text-emerald-600">{selectedStudent.stats.labelChallengeBest}%</div>
                                            <div className="text-xs text-slate-500">Best Score</div>
                                        </div>
                                        <div className="bg-white rounded-lg p-2 text-center border border-blue-100">
                                            <div className="text-lg font-bold text-violet-600">{selectedStudent.stats.labelChallengeAttempts}</div>
                                            <div className="text-xs text-slate-500">Attempts</div>
                                        </div>
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {selectedStudent.data.labelChallengeResults.map((result, ri) => (
                                            <div key={ri} className="bg-white p-2 rounded-lg border border-blue-100 text-sm">
                                                <div className="flex justify-between items-center">
                                                    <span className={`font-bold ${result.score >= 80 ? 'text-emerald-600' : result.score >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                        {result.score}% — {result.totalCorrect}/{result.totalExpected} correct
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        {result.timestamp ? new Date(result.timestamp).toLocaleDateString() : ''}
                                                    </span>
                                                </div>
                                                {result.feedback && (
                                                    <div className="text-xs text-slate-500 mt-1 italic">{result.feedback}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* Socratic Chatbot Transcript */}
                            {selectedStudent.data?.socraticChatHistory?.messages?.length > 0 && (
                                <div
                                    data-help-key="dashboard_detail_socratic"
                                    className="mb-4 border border-teal-200 rounded-xl overflow-hidden">
                                    <div className="bg-teal-100 p-3 font-bold text-teal-700 flex items-center gap-2">
                                        💬 Socratic Chatbot ({selectedStudent.data.socraticChatHistory.messageCount} messages)
                                    </div>
                                    <div className="max-h-96 overflow-y-auto p-3 space-y-2">
                                        {selectedStudent.data.socraticChatHistory.messages.map((msg, idx) => (
                                            <div
                                                key={idx}
                                                className={`p-2 rounded-lg text-sm ${
                                                    msg.role === 'user'
                                                        ? 'bg-teal-100 ml-8'
                                                        : 'bg-slate-100 mr-8'
                                                }`}
                                            >
                                                <div className="font-medium text-xs text-slate-500 mb-1">
                                                    {msg.role === 'user' ? 'Student' : 'Socratic Tutor'}
                                                </div>
                                                {msg.content || msg.text}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            """

    replacement_e = new_sections + target_e

    if target_e in content:
        content = content.replace(target_e, replacement_e, 1)
        edits_applied += 1
        print("✅ Part E: Added 4 detail view sections")
    else:
        print("❌ Part E: Could not find Interview Transcript target")

    # Write
    if edits_applied > 0:
        with open(FILE, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\n✅ Done! {edits_applied} edit(s) applied.")
    else:
        print("\n❌ No edits applied.")

    return edits_applied

if __name__ == '__main__':
    edits = apply_edits()
    sys.exit(0 if edits > 0 else 1)
