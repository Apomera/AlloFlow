"""Add teacher-facing student-friendly report button next to the parent report button."""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

# The new button to add after the existing parent report button
STUDENT_REPORT_BTN = """                            <button
                                onClick={() => generateStudentFriendlyReport({
                                    history: selectedStudent.history || [],
                                    wordSoundsHistory: selectedStudent.wordSoundsHistory || [],
                                    phonemeMastery: selectedStudent.phonemeMastery || {},
                                    wordSoundsBadges: selectedStudent.wordSoundsBadges || {},
                                    gameCompletions: selectedStudent.gameCompletions || [],
                                    globalPoints: selectedStudent.stats?.adventureXP || 0,
                                    globalLevel: selectedStudent.stats?.level || 1,
                                    progressSnapshots: (rosterKey?.progressHistory?.[selectedStudent.name]) || [],
                                    dateRange: { start: reportStartDate, end: reportEndDate },
                                    studentName: selectedStudent.name
                                })}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-bold text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md"
                                title="Download a growth-focused report suitable for sharing with the student"
                            >
                                <Download size={14} /> Student Report
                            </button>"""

def main():
    content = SRC.read_text(encoding='utf-8')
    
    # Find the closing tag of the parent report button and insert after
    anchor = """                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {/* RTI Progress Monitor Dashboard */}"""
    
    if anchor in content and 'Student Report' not in content:
        new_content = STUDENT_REPORT_BTN + """
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {/* RTI Progress Monitor Dashboard */}"""
        content = content.replace(anchor, new_content, 1)
        SRC.write_text(content, encoding='utf-8')
        print("Added Student-Friendly Report button next to Parent Report")
    elif 'Student Report' in content:
        print("Already present")
    else:
        print("Anchor not found")

if __name__ == "__main__":
    main()
