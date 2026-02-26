#!/usr/bin/env python3
"""Implement 3 gap fixes: parent quiz results, today's feed, roster badges."""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# ====================================================================
# GAP 1: Allow parents to see quiz scores (read-only, no admin)
# 
# Current: L70129: {!isPresentationMode && !isReviewGame && isTeacherMode && (
#            shows Show/Hide answers button
# Problem: isTeacherMode is false for parents, so button never appears
# Fix: Change the gate on the answers toggle to include parent mode
# Also: Change correct answer highlights to work in parent mode
# ====================================================================

# 1a. Allow parent mode to see the Show/Hide answers button (read-only)
# Current: {!isPresentationMode && !isReviewGame && isTeacherMode && (
# Change to: {!isPresentationMode && !isReviewGame && (isTeacherMode || isParentMode) && (
old_quiz_gate = '{!isPresentationMode && !isReviewGame && isTeacherMode && ('
new_quiz_gate = '{!isPresentationMode && !isReviewGame && (isTeacherMode || isParentMode) && ('
if old_quiz_gate in content:
    content = content.replace(old_quiz_gate, new_quiz_gate, 1)
    changes += 1
    print("1a: Updated quiz admin button gate to include parent mode")
else:
    print("1a: SKIP - quiz admin gate not found")

# 1b. Allow correct answer highlighting for parents
# Current: (showQuizAnswers && isTeacherMode) && opt === q.correctAnswer
# Change to: (showQuizAnswers && (isTeacherMode || isParentMode)) && opt === q.correctAnswer
old_highlight = '(showQuizAnswers && isTeacherMode) && opt === q.correctAnswer'
new_highlight = '(showQuizAnswers && (isTeacherMode || isParentMode)) && opt === q.correctAnswer'
count = content.count(old_highlight)
if count > 0:
    content = content.replace(old_highlight, new_highlight)
    changes += 1
    print(f"1b: Updated {count} quiz answer highlight gates for parent mode")
else:
    print("1b: SKIP - quiz highlight gate not found")

# 1c. Hide the Edit Quiz button from parents (keep it teacher-only)
# The edit button is gated by {!isIndependentMode && ( which is fine
# But we need to also hide QTI export from parents
# Current: {isTeacherMode && !isIndependentMode && ( for QTI export
# This is fine - parents won't see it since isTeacherMode is false for them
# Actually wait - we changed the outer gate to include parents!
# We need to keep the edit button and QTI export teacher-only
# The edit button is INSIDE the same block, gated by {!isIndependentMode && (
# Let's also gate it by !isParentMode
old_edit_gate = '{!isIndependentMode && (\n                                    <button \n                                        aria-label="Toggle edit quiz"'
new_edit_gate = '{!isIndependentMode && !isParentMode && (\n                                    <button \n                                        aria-label="Toggle edit quiz"'
if old_edit_gate in content:
    content = content.replace(old_edit_gate, new_edit_gate, 1)
    changes += 1
    print("1c: Hid quiz edit button from parents")
else:
    print("1c: SKIP - edit gate not found")

# 1d. Also change the Show/Hide labels for parents
# Current: showQuizAnswers ? t('quiz.hide_key') : t('quiz.show_key')
# For parents: "View Scores" / "Hide Scores"
old_labels = """{showQuizAnswers \n                                        ? (isIndependentMode ? t('quiz.hide_answers_student') : t('quiz.hide_key')) \n                                        : (isIndependentMode ? t('quiz.check_answers') : t('quiz.show_key'))"""
new_labels = """{showQuizAnswers \n                                        ? (isIndependentMode ? t('quiz.hide_answers_student') : (isParentMode ? 'Hide Scores' : t('quiz.hide_key'))) \n                                        : (isIndependentMode ? t('quiz.check_answers') : (isParentMode ? 'View Scores' : t('quiz.show_key')))"""
if old_labels in content:
    content = content.replace(old_labels, new_labels, 1)
    changes += 1
    print("1d: Updated Show/Hide label for parents (View Scores / Hide Scores)")
else:
    print("1d: SKIP - quiz labels not found")

# ====================================================================
# GAP 2: Add "Today's Activity" card to LearnerProgressView
#
# Insert a new card after the Activity Summary card in the grid,
# showing what was done today (based on pointHistory timestamps)
# ====================================================================

# Find the Achievements card and insert a "Today's Activity" card before Growth
# Insert AFTER the closing of the card grid </div> and BEFORE Growth Over Time
old_growth_section = """            {/* Card 5: Growth Over Time (full width) */}"""
new_today_card = """            {/* Card 5: Today's Activity Feed */}
            {(() => {
                const today = new Date().toDateString();
                const todayXP = pointHistory.filter(e => e.timestamp && new Date(e.timestamp).toDateString() === today);
                const todayWords = wordSoundsHistory.filter(h => h.timestamp && new Date(h.timestamp).toDateString() === today);
                if (todayXP.length === 0 && todayWords.length === 0) return null;
                return (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-5">
                        <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Clock size={14} /> Today's Activity
                        </h3>
                        <div className="grid grid-cols-3 gap-3 mb-3">
                            <div className="bg-white rounded-xl p-3 text-center border border-blue-100">
                                <div className="text-lg font-black text-blue-700">{todayXP.reduce((s,e) => s + (e.points || 0), 0)}</div>
                                <div className="text-[10px] font-bold text-blue-400 uppercase">XP Earned</div>
                            </div>
                            <div className="bg-white rounded-xl p-3 text-center border border-blue-100">
                                <div className="text-lg font-black text-blue-700">{todayXP.length}</div>
                                <div className="text-[10px] font-bold text-blue-400 uppercase">Activities</div>
                            </div>
                            <div className="bg-white rounded-xl p-3 text-center border border-blue-100">
                                <div className="text-lg font-black text-blue-700">{todayWords.filter(w => w.correct).length}/{todayWords.length}</div>
                                <div className="text-[10px] font-bold text-blue-400 uppercase">Words Today</div>
                            </div>
                        </div>
                        {todayXP.length > 0 && (
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                                {todayXP.slice(0, 8).map((entry, i) => (
                                    <div key={entry.id || i} className="flex justify-between items-center text-xs px-2 py-1 rounded bg-white/60">
                                        <span className="text-slate-600 font-medium truncate max-w-[220px]">{entry.activity}</span>
                                        <span className="font-bold text-green-600 whitespace-nowrap">+{entry.points} XP</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Card 6: Growth Over Time (full width) */}"""

if old_growth_section in content:
    content = content.replace(old_growth_section, new_today_card, 1)
    changes += 1
    print("2: Inserted Today's Activity card in LearnerProgressView")
else:
    print("2: SKIP - Growth section marker not found")

# ====================================================================
# GAP 3: Add session count badges to roster student names
#
# Where students are rendered in the roster, add session counts
# This applies to the unassigned students list at L29827
# and needs to also apply to students within groups
# ====================================================================

# Find the student badge rendering within groups
# Look for where student names are rendered as chips/badges
old_student_badge = """{name}
                    <select onChange={e => { if (e.target.value) handleMoveStudent(name, e.target.value); }} value=""
                      className="text-[10px] bg-transparent border-none outline-none cursor-pointer text-amber-600 ml-1 w-4">"""
new_student_badge = """{name}
                    {rosterKey?.progressHistory?.[name]?.length > 0 && (
                      <span className="text-[9px] bg-amber-100 text-amber-600 px-1 py-0.5 rounded-full font-mono ml-0.5" title={`${rosterKey.progressHistory[name].length} sessions`}>
                        {rosterKey.progressHistory[name].length}s
                      </span>
                    )}
                    <select onChange={e => { if (e.target.value) handleMoveStudent(name, e.target.value); }} value=""
                      className="text-[10px] bg-transparent border-none outline-none cursor-pointer text-amber-600 ml-1 w-4">"""
if old_student_badge in content:
    content = content.replace(old_student_badge, new_student_badge, 1)
    changes += 1
    print("3a: Added session count badges to unassigned students")
else:
    print("3a: SKIP - unassigned student badge not found")

# Also find where group students are rendered
# Need to search for the group student rendering
group_student_pattern = re.compile(r'(\{groupStudents\.map\(name\s*=>\s*\(\s*<span[^>]*>\s*\n\s*\{name\})')
match = group_student_pattern.search(content)
if match:
    old_group_student = match.group(0)
    new_group_student = old_group_student + '''
                              {rosterKey?.progressHistory?.[name]?.length > 0 && (
                                <span className="text-[9px] bg-slate-200 text-slate-500 px-1 py-0.5 rounded-full font-mono ml-0.5" title={`${rosterKey.progressHistory[name].length} sessions`}>
                                  {rosterKey.progressHistory[name].length}s
                                </span>
                              )}'''
    content = content.replace(old_group_student, new_group_student, 1)
    changes += 1
    print(f"3b: Added session count badges to group students")
else:
    # Try to find group students a different way
    print("3b: SKIP - group student pattern not found, searching alternative...")
    alt_search = 'groupStudents.map(name =>'
    idx = content.find(alt_search)
    if idx > -1:
        print(f"  Found groupStudents.map at char {idx}")
        # Show context
        context_start = max(0, idx - 50)
        context_end = min(len(content), idx + 300)
        snippet = content[context_start:context_end]
        print(f"  Context: ...{snippet[:200]}...")
    else:
        print("  groupStudents.map not found anywhere")

# ====================================================================
# SAVE
# ====================================================================
with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied.")
