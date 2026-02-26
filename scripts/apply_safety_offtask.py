"""
Enhanced Safety + Off-Task Flagging Script
1. Add off-task content patterns to SafetyContentChecker
2. Add behavioral off-task detection to extractSafetyFlags
3. Wire flag summaries into live progress sync (no raw PII)
"""
import sys, os

FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'AlloFlowANTI.txt')

def apply_edits():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    edits_applied = 0

    # ============================================================
    # EDIT 1: Add off-task patterns to SafetyContentChecker.patterns
    # ============================================================
    target_1 = """        concerning_content: /\\b(abuse|molest|rape|touch me|scared of|hit me|hurt me|locked in|won't let me|secret|don't tell)\\b/i
    },"""

    replacement_1 = """        concerning_content: /\\b(abuse|molest|rape|touch me|scared of|hit me|hurt me|locked in|won't let me|secret|don't tell)\\b/i,
        // Off-task behavior patterns
        off_task_gaming: /\\b(fortnite|minecraft|roblox|among us|pokemon|call of duty|valorant|apex|gta|fifa|playstation|xbox|nintendo|twitch|discord|tiktok|youtube|instagram|snapchat)\\b/i,
        off_task_social: /\\b(boyfriend|girlfriend|crush|dating|party|hangout|skip class|skip school|boring|hate school|hate this|so bored|don't care|whatever|this is dumb|this is stupid|waste of time)\\b/i,
        gibberish: /^[^a-zA-Z]*$|(.)\1{4,}|^[a-z]{1,2}$|asdf|qwer|zxcv|lol{3,}|haha{4,}|bruh{3,}/i
    },"""

    if target_1 in content:
        content = content.replace(target_1, replacement_1, 1)
        edits_applied += 1
        print("✅ EDIT1: Added off-task content patterns")
    else:
        print("❌ EDIT1: Could not find concerning_content pattern")

    # ============================================================
    # EDIT 2: Add severity + labels for new categories
    # ============================================================
    target_2a = """            concerning_content: 'high',
        };"""
    replacement_2a = """            concerning_content: 'high',
            off_task_gaming: 'low',
            off_task_social: 'low',
            gibberish: 'low',
            behavioral_rushing: 'medium',
            behavioral_idle: 'low',
            behavioral_repetitive: 'low',
        };"""

    if target_2a in content:
        content = content.replace(target_2a, replacement_2a, 1)
        edits_applied += 1
        print("✅ EDIT2a: Added severity for new categories")
    else:
        print("❌ EDIT2a: Could not find severity map")

    target_2b = """            concerning_content: t('class_analytics.flag_concerning')
        };"""
    replacement_2b = """            concerning_content: t('class_analytics.flag_concerning'),
            off_task_gaming: '🎮 Off-Task (Gaming/Media)',
            off_task_social: '💬 Off-Task (Social/Disengaged)',
            gibberish: '🔤 Gibberish Input',
            behavioral_rushing: '⚡ Quiz Rushing',
            behavioral_idle: '💤 Extended Inactivity',
            behavioral_repetitive: '🔁 Repetitive Answers',
        };"""

    if target_2b in content:
        content = content.replace(target_2b, replacement_2b, 1)
        edits_applied += 1
        print("✅ EDIT2b: Added labels for new categories")
    else:
        print("❌ EDIT2b: Could not find category label map")

    # ============================================================
    # EDIT 3: Add behavioral off-task detection to extractSafetyFlags
    # ============================================================
    target_3 = """        return flags;
    };
    // Export to CSV"""

    replacement_3 = """        // ── Behavioral Off-Task Detection ──
        // Quiz rushing: average response time < 3 seconds per question
        if (data.responses) {
            Object.entries(data.responses).forEach(([quizId, resp]) => {
                if (resp.timestamps && resp.timestamps.length > 1) {
                    const times = resp.timestamps;
                    let totalGap = 0;
                    for (let i = 1; i < times.length; i++) {
                        totalGap += (new Date(times[i]) - new Date(times[i-1]));
                    }
                    const avgMs = totalGap / (times.length - 1);
                    if (avgMs < 3000 && times.length > 2) {
                        flags.push({
                            category: 'behavioral_rushing',
                            match: `Avg ${Math.round(avgMs/1000)}s/question`,
                            severity: 'medium',
                            source: 'quiz',
                            context: `Quiz ${quizId}: ${Math.round(avgMs/1000)}s avg response time`,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
                // Repetitive answers: same answer selected > 70% of the time
                if (resp.answers && resp.answers.length > 4) {
                    const answerCounts = {};
                    resp.answers.forEach(a => { answerCounts[a] = (answerCounts[a] || 0) + 1; });
                    const maxCount = Math.max(...Object.values(answerCounts));
                    if (maxCount / resp.answers.length > 0.7) {
                        const repeatedAnswer = Object.entries(answerCounts).find(([_, c]) => c === maxCount)?.[0];
                        flags.push({
                            category: 'behavioral_repetitive',
                            match: `Same answer ${maxCount}/${resp.answers.length} times`,
                            severity: 'low',
                            source: 'quiz',
                            context: `Quiz ${quizId}: "${repeatedAnswer}" selected ${Math.round(maxCount/resp.answers.length*100)}% of the time`,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            });
        }
        // Inactivity detection: session time vs activity count ratio
        if (data.timeOnTask?.totalSessionMinutes && data.timeOnTask.totalSessionMinutes > 30) {
            const totalActs = Object.keys(data.responses || {}).length + 
                              (data.wordSoundsState?.history?.length || 0) + 
                              (data.gameCompletions ? Object.values(data.gameCompletions).flat().length : 0);
            const minutesPerActivity = totalActs > 0 ? data.timeOnTask.totalSessionMinutes / totalActs : data.timeOnTask.totalSessionMinutes;
            if (minutesPerActivity > 20 && totalActs < 3) {
                flags.push({
                    category: 'behavioral_idle',
                    match: `${Math.round(minutesPerActivity)}min/activity`,
                    severity: 'low',
                    source: 'behavioral',
                    context: `${data.timeOnTask.totalSessionMinutes}min session with only ${totalActs} activities completed`,
                    timestamp: new Date().toISOString()
                });
            }
        }
        return flags;
    };
    // Export to CSV"""

    if target_3 in content:
        content = content.replace(target_3, replacement_3, 1)
        edits_applied += 1
        print("✅ EDIT3: Added behavioral off-task detection")
    else:
        print("❌ EDIT3: Could not find extractSafetyFlags return")

    # ============================================================
    # EDIT 4: Wire flag summaries into live progress sync data
    # (Include flag counts + categories in Firestore, NOT raw content)
    # ============================================================
    target_4 = """                gameScoreHistory: (gameCompletions || []).slice(-10).map(g => ({ score: g.score, game: g.game, date: g.timestamp || g.date }))
            };"""
    
    replacement_4 = """                gameScoreHistory: (gameCompletions || []).slice(-10).map(g => ({ score: g.score, game: g.game, date: g.timestamp || g.date })),
                // Flag summary (categories + counts only — NO raw content for FERPA)
                flagSummary: (() => {
                    try {
                        const allText = [];
                        // Gather user-generated text for safety check
                        if (socraticChatHistory?.messages) {
                            socraticChatHistory.messages.filter(m => m.role === 'user').forEach(m => allText.push(m.text || m.content || ''));
                        }
                        const flags = allText.flatMap(t => SafetyContentChecker.check(t));
                        // Categorize
                        const summary = {};
                        flags.forEach(f => { summary[f.category] = (summary[f.category] || 0) + 1; });
                        return { total: flags.length, categories: summary, hasCritical: flags.some(f => f.severity === 'critical') };
                    } catch (e) { return { total: 0, categories: {}, hasCritical: false }; }
                })()
            };"""

    if target_4 in content:
        content = content.replace(target_4, replacement_4, 1)
        edits_applied += 1
        print("✅ EDIT4: Wired flag summaries into live sync (no PII)")
    else:
        print("❌ EDIT4: Could not find gameScoreHistory in sync data")

    # Write
    if edits_applied > 0:
        with open(FILE, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\n✅ Done! {edits_applied}/5 edit(s) applied.")
    else:
        print("\n❌ No edits applied.")
    return edits_applied

if __name__ == '__main__':
    edits = apply_edits()
    sys.exit(0 if edits > 0 else 1)
