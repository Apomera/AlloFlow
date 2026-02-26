import sys

FILE_PATH = "c:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/AlloFlowANTI.txt"

with open(FILE_PATH, "r", encoding="utf-8") as f:
    content = f.read()

target = """                                <span>{ts('word_sounds.session_progress')}</span>
                                <span>{Math.min(wordSoundsSessionProgress, SESSION_LENGTH)}/{SESSION_LENGTH}</span>
                            </div>
                            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500"
                                    style={{ width: `${Math.min((wordSoundsSessionProgress / SESSION_LENGTH) * 100, 100)}%` }}
                                />
                            </div>"""

replacement = """                                <span>{ts('word_sounds.session_progress')}</span>
                                <span>{Math.min(wordSoundsSessionProgress, wordSoundsSessionGoal)}/{wordSoundsSessionGoal}</span>
                            </div>
                            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500"
                                    style={{ width: `${Math.min((wordSoundsSessionProgress / (wordSoundsSessionGoal || 1)) * 100, 100)}%` }}
                                />
                            </div>"""

if target in content:
    new_content = content.replace(target, replacement)
    with open(FILE_PATH, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("SUCCESS: Progress bar logic updated!")
else:
    print("ERROR: Target string not found in file.")
