"""Deeper AlloFlow feature scan - areas not yet explored"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
lines = open('AlloFlowANTI.txt','r',encoding='utf-8',errors='replace').readlines()
content = ''.join(lines)

print("=== DEEPER ALLOFLOW FEATURE SCAN ===")

# 1. Text Analysis features
print("\n--- Text Analysis Engine ---")
print(f"  Flesch-Kincaid: {content.count('flesch') + content.count('Flesch')}")
print(f"  readability: {content.count('readability') + content.count('Readability')}")
print(f"  grammarCheck: {content.count('grammar') + content.count('Grammar')}")
print(f"  accuracy/discrepancy: {content.count('accuracy') + content.count('discrepanc')}")
print(f"  Complexity: {content.count('complexity') + content.count('Complexity')}")
print(f"  wordCount: {content.count('wordCount') + content.count('word_count')}")

# 2. Content Safety
print("\n--- Content Safety ---")
print(f"  ContentSafetyFilter: {content.count('ContentSafetyFilter')}")
print(f"  safetyCheck: {content.count('safetyCheck') + content.count('safety_check')}")
print(f"  blocked/Block: {content.count('blocked') + content.count('Block')}")
print(f"  profanity/inappropriate: {content.count('profanity') + content.count('inappropriate')}")

# 3. Report & Export features
print("\n--- Reports & Export ---")
print(f"  renderReportToString: {content.count('renderReport')}")
print(f"  printContent: {content.count('printContent') + content.count('print(')}")
print(f"  exportData: {content.count('exportData') + content.count('Export')}")
print(f"  copyToClipboard: {content.count('copyToClipboard') + content.count('clipboard')}")
print(f"  Printer icon usage: {content.count('Printer')}")
print(f"  Download icon usage: {content.count('Download')}")
print(f"  FileDown icon: {content.count('FileDown')}")

# 4. Visual Comic Panels
print("\n--- Visual Comic System ---")
print(f"  comicPanels: {content.count('comicPanel') + content.count('ComicPanel')}")
print(f"  panelCaption: {content.count('panelCaption') + content.count('caption')}")
print(f"  panelIdx: {content.count('panelIdx')}")
print(f"  ArtDirector: {content.count('ArtDirector') + content.count('artDirector')}")
print(f"  imageGallery: {content.count('imageGallery') + content.count('ImageGallery')}")

# 5. Quiz/Exit Ticket features
print("\n--- Quiz / Exit Ticket ---")
print(f"  quizQuestions: {content.count('quizQuestion') + content.count('QuizQuestion')}")
print(f"  multipleChoice: {content.count('multipleChoice') + content.count('multiple_choice')}")
print(f"  trueFalse: {content.count('trueFalse') + content.count('true_false')}")
print(f"  exitTicket: {content.count('exitTicket') + content.count('ExitTicket')}")
print(f"  quizScore: {content.count('quizScore') + content.count('QuizScore')}")
print(f"  checkAnswer: {content.count('checkAnswer') + content.count('CheckAnswer')}")

# 6. Immersive Word Search
print("\n--- Immersive Word Search ---")
print(f"  ImmersiveWordSearch: {content.count('ImmersiveWordSearch') + content.count('ImmersiveWord')}")
print(f"  wordSearch: {content.count('wordSearch') + content.count('WordSearch')}")
print(f"  searchGrid: {content.count('searchGrid') + content.count('grid')}")

# 7. UDL Advice
print("\n--- UDL Advice ---")
print(f"  udlAdvice: {content.count('udlAdvice') + content.count('UDLAdvice') + content.count('udl-advice')}")
print(f"  UDL strategy: {content.count('UDL') + content.count('udl')}")

# 8. Alignment Report / Standards
print("\n--- Standards Alignment ---")
print(f"  alignmentReport: {content.count('alignmentReport') + content.count('alignment-report')}")
print(f"  standards: {content.count('standards') + content.count('Standards')}")
print(f"  CommonCore: {content.count('Common Core') + content.count('commonCore')}")
print(f"  NGSS: {content.count('NGSS')}")

# 9. Session / Collaboration
print("\n--- Session System ---")
print(f"  sessionCode: {content.count('sessionCode')}")
print(f"  activeSessionCode: {content.count('activeSessionCode')}")
print(f"  joinSession: {content.count('joinSession') + content.count('JoinSession')}")
print(f"  isTeacherMode: {content.count('isTeacherMode')}")
print(f"  isIndependentMode: {content.count('isIndependentMode')}")
print(f"  syncFromTeacher: {content.count('syncFromTeacher') + content.count('teacherSync')}")
print(f"  studentAnalytics: {content.count('studentAnalytics') + content.count('StudentAnalytics')}")

# 10. Confetti / Rewards
print("\n--- Rewards & Celebration ---")
print(f"  confetti: {content.count('confetti') + content.count('Confetti')}")
print(f"  celebration: {content.count('celebration') + content.count('Celebration')}")
print(f"  trophy: {content.count('trophy') + content.count('Trophy')}")
print(f"  reward: {content.count('reward') + content.count('Reward')}")
print(f"  playSound: {content.count('playSound')}")

# 11. Drag and Drop
print("\n--- Drag and Drop ---")
print(f"  onDragStart: {content.count('onDragStart')}")
print(f"  onDragEnd: {content.count('onDragEnd')}")
print(f"  onDrop: {content.count('onDrop')}")
print(f"  isDragging: {content.count('isDragging')}")
print(f"  GripVertical: {content.count('GripVertical')}")

# 12. History / Undo
print("\n--- History & Undo ---")
print(f"  history/History: {content.count('History') + content.count('historyLog')}")
print(f"  undo/Undo: {content.count('undo') + content.count('Undo')}")
print(f"  versionHistory: {content.count('versionHistory')}")

# 13. Printing / Format  
print("\n--- Print & Format ---")
print(f"  formatInlineText: {content.count('formatInlineText')}")
print(f"  processMathHTML: {content.count('processMathHTML')}")
print(f"  parseBoldMarkdown: {content.count('parseBold') + content.count('boldRegex')}")
