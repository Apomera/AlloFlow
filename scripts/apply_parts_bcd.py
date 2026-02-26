"""
Apply Parts B, C, D edits to AlloFlowANTI.txt

Part B: Expand calculateStudentStats to read game completions, word sounds, socratic, label challenge
Part C: Expand extractSafetyFlags to scan socratic chatbot messages  
Part D: Expand handleExportCSV with new columns
"""
import sys
import os

FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'AlloFlowANTI.txt')

def apply_edits():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    edits_applied = 0

    # ============================================================
    # Part B: Expand calculateStudentStats
    # Replace the stats object and add new readers before `return stats;`
    # ============================================================
    
    # B1: Expand the stats object initialization
    target_b1 = """    const calculateStudentStats = (data) => {
        const stats = {
            quizAvg: 0,
            adventureXP: 0,
            escapeCompletion: 0,
            fluencyWCPM: 0,
            interviewXP: 0,
            totalActivities: 0
        };"""

    replacement_b1 = """    const calculateStudentStats = (data) => {
        const stats = {
            quizAvg: 0,
            adventureXP: 0,
            escapeCompletion: 0,
            fluencyWCPM: 0,
            interviewXP: 0,
            totalActivities: 0,
            // Word Sounds
            wsWordsCompleted: 0, wsAccuracy: 0, wsBestStreak: 0,
            // Socratic Chatbot
            socraticMessageCount: 0,
            // Game scores (aggregated)
            gamesPlayed: 0,
            // Per-game-type: { initial, attempts, best }
            memoryGame: null, matchingGame: null, syntaxScramble: null,
            crosswordGame: null, timelineGame: null, conceptSortGame: null,
            vennDiagram: null, bingo: null, wordScramble: null,
            // Label Challenge
            labelChallengeAvg: 0, labelChallengeAttempts: 0, labelChallengeBest: 0
        };"""

    if target_b1 in content:
        content = content.replace(target_b1, replacement_b1, 1)
        edits_applied += 1
        print("✅ B1: Expanded stats object initialization")
    else:
        print("❌ B1: Could not find stats object target")

    # B2: Add new readers before `return stats;`
    target_b2 = """        // Interview XP
        if (data.personaState) {
            stats.interviewXP = data.personaState.accumulatedXP || data.personaState.totalXP || 0;
            if (data.personaState.chatHistory?.length > 0) stats.totalActivities++;
        }
        return stats;"""

    replacement_b2 = """        // Interview XP
        if (data.personaState) {
            stats.interviewXP = data.personaState.accumulatedXP || data.personaState.totalXP || 0;
            if (data.personaState.chatHistory?.length > 0) stats.totalActivities++;
        }
        // Word Sounds
        if (data.wordSoundsState) {
            const ws = data.wordSoundsState;
            stats.wsWordsCompleted = ws.history?.length || 0;
            if (ws.sessionScore) {
                stats.wsAccuracy = ws.sessionScore.total > 0
                    ? Math.round((ws.sessionScore.correct / ws.sessionScore.total) * 100) : 0;
                stats.wsBestStreak = ws.sessionScore.streak || 0;
            }
            if (ws.dailyProgress) {
                stats.totalActivities += Object.keys(ws.dailyProgress).length;
            }
        }
        // Game Completions — { initial, attempts, best } per type
        if (data.gameCompletions) {
            const typeMap = {
                memory: 'memoryGame', matching: 'matchingGame',
                syntaxScramble: 'syntaxScramble', crossword: 'crosswordGame',
                timelineGame: 'timelineGame', conceptSortGame: 'conceptSortGame',
                vennDiagram: 'vennDiagram', bingo: 'bingo', wordScramble: 'wordScramble'
            };
            for (const [rawType, statKey] of Object.entries(typeMap)) {
                const entries = data.gameCompletions[rawType] || [];
                if (entries.length > 0) {
                    const scores = entries.map(e => e.score ?? e.accuracy ?? 0);
                    stats[statKey] = {
                        initial: scores[0],
                        attempts: entries.length,
                        best: Math.max(...scores)
                    };
                    stats.gamesPlayed += entries.length;
                    stats.totalActivities += entries.length;
                }
            }
        }
        // Socratic Chatbot
        if (data.socraticChatHistory?.messageCount > 0) {
            stats.socraticMessageCount = data.socraticChatHistory.messageCount;
            stats.totalActivities++;
        }
        // Label Challenge
        if (data.labelChallengeResults?.length > 0) {
            const scores = data.labelChallengeResults.map(r => r.score || 0);
            stats.labelChallengeAvg = Math.round(
                scores.reduce((a, b) => a + b, 0) / scores.length
            );
            stats.labelChallengeAttempts = scores.length;
            stats.labelChallengeBest = Math.max(...scores);
            stats.totalActivities += scores.length;
        }
        return stats;"""

    if target_b2 in content:
        content = content.replace(target_b2, replacement_b2, 1)
        edits_applied += 1
        print("✅ B2: Added Word Sounds, Game Completions, Socratic, LabelChallenge readers")
    else:
        print("❌ B2: Could not find Interview XP + return stats target")

    # ============================================================
    # Part C: Expand extractSafetyFlags
    # Add socratic scanning before `return flags;`
    # ============================================================
    target_c = """        }
        return flags;
    };
    // Export to CSV"""

    replacement_c = """        }
        // Socratic Chatbot messages
        if (data.socraticChatHistory?.messages) {
            data.socraticChatHistory.messages.forEach((msg, idx) => {
                if (msg.role === 'user') {
                    const msgFlags = SafetyContentChecker.check(msg.text || msg.content || '');
                    msgFlags.forEach(flag => {
                        flags.push({
                            ...flag,
                            source: 'socratic',
                            messageIndex: idx,
                            context: (msg.text || msg.content || '').substring(0, 100)
                        });
                    });
                }
            });
        }
        return flags;
    };
    // Export to CSV"""

    if target_c in content:
        content = content.replace(target_c, replacement_c, 1)
        edits_applied += 1
        print("✅ C: Added Socratic Chatbot safety scanning")
    else:
        print("❌ C: Could not find extractSafetyFlags return target")

    # ============================================================
    # Part D: Expand handleExportCSV headers and rows
    # ============================================================
    
    # D1: Add new headers
    target_d1 = """            t('class_analytics.interview_xp'),
            t('class_analytics.safety_flags'),"""

    replacement_d1 = """            t('class_analytics.interview_xp'),
            'Word Sounds %',
            'Games Played',
            'Socratic Msgs',
            'Label Challenge %',
            t('class_analytics.safety_flags'),"""

    if target_d1 in content:
        content = content.replace(target_d1, replacement_d1, 1)
        edits_applied += 1
        print("✅ D1: Added new CSV headers")
    else:
        print("❌ D1: Could not find CSV headers target")

    # D2: Add new row values
    target_d2 = """            student.stats.interviewXP,
            student.safetyFlags.length,"""

    replacement_d2 = """            student.stats.interviewXP,
            student.stats.wsAccuracy ? `${student.stats.wsAccuracy}%` : 'N/A',
            student.stats.gamesPlayed || 0,
            student.stats.socraticMessageCount || 0,
            student.stats.labelChallengeAvg ? `${student.stats.labelChallengeAvg}%` : 'N/A',
            student.safetyFlags.length,"""

    if target_d2 in content:
        content = content.replace(target_d2, replacement_d2, 1)
        edits_applied += 1
        print("✅ D2: Added new CSV row values")
    else:
        print("❌ D2: Could not find CSV rows target")

    # ============================================================
    # Write result
    # ============================================================
    if edits_applied > 0:
        with open(FILE, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\n✅ All done! {edits_applied}/5 edits applied successfully.")
    else:
        print("\n❌ No edits applied.")
    
    return edits_applied

if __name__ == '__main__':
    edits = apply_edits()
    sys.exit(0 if edits > 0 else 1)
