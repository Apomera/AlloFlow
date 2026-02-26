"""
Fix EDIT1 and EDIT2 for Firebase Progress Sync — student-side
"""
import sys, os

FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'AlloFlowANTI.txt')

def apply_edits():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    edits_applied = 0

    # EDIT 1: Add sync state vars after pendingSync state (L33971)
    target_1 = "  const [pendingSync, setPendingSync] = useState(false);"
    replacement_1 = """  const [pendingSync, setPendingSync] = useState(false);
  const progressSyncTimerRef = useRef(null);
  const [isProgressSyncing, setIsProgressSyncing] = useState(false);
  const [lastProgressSync, setLastProgressSync] = useState(null);"""

    if target_1 in content:
        content = content.replace(target_1, replacement_1, 1)
        edits_applied += 1
        print("✅ EDIT1: Added sync state variables")
    else:
        print("❌ EDIT1: Could not find pendingSync state")

    # EDIT 2: Add syncProgressToFirestore + auto-sync useEffect
    # Insert after the save reminder interval cleanup (L39092)
    target_2 = """  }, [lastJsonFileSave, t, isTeacherMode, isBotVisible]);
  // Pulse history button when new items are added"""
    
    replacement_2 = """  }, [lastJsonFileSave, t, isTeacherMode, isBotVisible]);

  // ── Firebase Progress Sync (District-Hosted Only) ──
  // Writes student progress to Firestore subcollection when:
  //   1. NOT in Canvas mode (FERPA: Canvas uses manual JSON export)
  //   2. Student has an active session code + nickname
  const syncProgressToFirestore = React.useCallback(async () => {
      if (isCanvas) return; // Canvas gate: NEVER sync from Canvas
      if (!activeSessionCode || !studentNickname) return;
      try {
          setIsProgressSyncing(true);
          const safeId = studentNickname.replace(/[^a-zA-Z0-9_-]/g, '_');
          const progressRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode, 'studentProgress', safeId);
          const quizAvg = (() => {
              const quizItems = history.filter(h => h.type === 'quiz');
              let total = 0, count = 0;
              quizItems.forEach(quiz => {
                  const questions = quiz.data?.questions || [];
                  if (!questions.length) return;
                  let correct = 0;
                  const resps = studentResponses[quiz.id] || {};
                  questions.forEach((q, i) => {
                      const resp = resps[i];
                      if (resp != null) {
                          let val = resp;
                          if (!isNaN(parseInt(resp)) && q.options?.[resp]) val = q.options[resp];
                          if (String(val).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) correct++;
                      }
                  });
                  total += (correct / questions.length) * 100;
                  count++;
              });
              return count > 0 ? Math.round(total / count) : 0;
          })();
          const wsAcc = wordSoundsHistory?.length > 0
              ? Math.round((wordSoundsHistory.filter(h => h.correct).length / wordSoundsHistory.length) * 100)
              : 0;
          const progressData = {
              studentNickname,
              lastSynced: new Date().toISOString(),
              stats: {
                  quizAvg,
                  wsAccuracy: wsAcc,
                  fluencyWCPM: fluencyAssessments?.length > 0 ? (fluencyAssessments[fluencyAssessments.length - 1]?.wcpm || 0) : 0,
                  gamesPlayed: gameCompletions?.length || 0,
                  totalActivities: (history?.length || 0) + (wordSoundsHistory?.length > 0 ? 1 : 0) + (gameCompletions?.length || 0),
                  labelChallengeAvg: labelChallengeResults?.length > 0
                      ? Math.round(labelChallengeResults.reduce((a, b) => a + (b.score || 0), 0) / labelChallengeResults.length)
                      : 0,
                  globalPoints: globalPoints || 0,
                  wsWordsCompleted: wordSoundsHistory?.filter(h => h.correct)?.length || 0
              },
              fluencyHistory: (fluencyAssessments || []).slice(-10).map(a => ({ wcpm: a.wcpm, date: a.timestamp || a.date })),
              gameScoreHistory: (gameCompletions || []).slice(-10).map(g => ({ score: g.score, game: g.game, date: g.timestamp || g.date }))
          };
          await setDoc(progressRef, progressData, { merge: true });
          setLastProgressSync(new Date());
          debugLog('[ProgressSync] Synced to Firestore for', studentNickname);
      } catch (err) {
          warnLog('[ProgressSync] Firestore sync failed:', err.message);
      } finally {
          setIsProgressSyncing(false);
      }
  }, [isCanvas, activeSessionCode, studentNickname, history, studentResponses, wordSoundsHistory, fluencyAssessments, gameCompletions, labelChallengeResults, globalPoints]);

  // Auto-sync every 60s when in a live session (non-Canvas only)
  React.useEffect(() => {
      if (isCanvas || !activeSessionCode || !studentNickname) {
          if (progressSyncTimerRef.current) clearInterval(progressSyncTimerRef.current);
          return;
      }
      syncProgressToFirestore(); // Initial sync
      progressSyncTimerRef.current = setInterval(syncProgressToFirestore, 60000);
      return () => { if (progressSyncTimerRef.current) clearInterval(progressSyncTimerRef.current); };
  }, [isCanvas, activeSessionCode, studentNickname, syncProgressToFirestore]);

  // Pulse history button when new items are added"""

    if target_2 in content:
        content = content.replace(target_2, replacement_2, 1)
        edits_applied += 1
        print("✅ EDIT2: Added syncProgressToFirestore + auto-sync useEffect")
    else:
        print("❌ EDIT2: Could not find save reminder interval end")

    # Write
    if edits_applied > 0:
        with open(FILE, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\n✅ Done! {edits_applied}/2 fix(es) applied.")
    else:
        print("\n❌ No edits applied.")
    return edits_applied

if __name__ == '__main__':
    edits = apply_edits()
    sys.exit(0 if edits > 0 else 1)
