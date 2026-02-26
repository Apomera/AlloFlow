"""Zone 4+5: UI/Layout + Games/Activities (L45001-75215) - Deep analysis"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
lines = open('AlloFlowANTI.txt','r',encoding='utf-8',errors='replace').readlines()
zone = lines[45000:]
z = ''.join(zone)

print("=== ZONE 4+5: UI/LAYOUT + GAMES (L45001-75215) ===")

# UI Layout
print("\n--- UI Layout Patterns ---")
print(f"  className= references: {z.count('className=')}")
print(f"  Tailwind responsive (md:): {z.count('md:')}")
print(f"  Tailwind responsive (lg:): {z.count('lg:')}")
print(f"  z-index/z-[: {z.count('z-[') + z.count('z-index')}")
print(f"  animate-in: {z.count('animate-in')}")
print(f"  transition-: {z.count('transition-')}")
print(f"  backdrop-blur: {z.count('backdrop-blur')}")
print(f"  dark mode refs: {z.count('dark:') + z.count('darkMode')}")

# Interactive elements
print("\n--- Interactive Elements ---")
print(f"  onClick handlers: {z.count('onClick=')}")
print(f"  onDrag handlers: {z.count('onDrag')}")
print(f"  onTouch handlers: {z.count('onTouch')}")
print(f"  aria-label: {z.count('aria-label')}")
print(f"  data-help-key: {z.count('data-help-key')}")
print(f"  button elements: {z.count('<button')}")
print(f"  input elements: {z.count('<input')}")

# Games & Activities
print("\n--- Games & Activities ---")
print(f"  TimelineGame: {z.count('TimelineGame')}")
print(f"  ConceptSortGame: {z.count('ConceptSortGame')}")
print(f"  BossBattle: {z.count('BossBattle')}")
print(f"  EscapeRoom: {z.count('EscapeRoom')}")
print(f"  Bingo: {z.count('Bingo') + z.count('bingo')}")
print(f"  playSound: {z.count('playSound')}")
print(f"  onGameComplete: {z.count('onGameComplete')}")
print(f"  onScoreUpdate: {z.count('onScoreUpdate')}")
print(f"  score/Score: {z.count('score') + z.count('Score')}")

# Session/Classroom features
print("\n--- Session & Classroom ---")
print(f"  sessionCode: {z.count('sessionCode') + z.count('SessionCode')}")
print(f"  Firestore setDoc: {z.count('setDoc')}")
print(f"  Firestore onSnapshot: {z.count('onSnapshot')}")
print(f"  isTeacherMode: {z.count('isTeacherMode')}")
print(f"  isIndependentMode: {z.count('isIndependentMode')}")
print(f"  isStudentMode: {z.count('isStudentMode')}")

# Printing/Export
print("\n--- Export & Sharing ---")
print(f"  Print: {z.count('print') + z.count('Print')}")
print(f"  Download: {z.count('download') + z.count('Download')}")
print(f"  Copy/clipboard: {z.count('clipboard') + z.count('copyToClipboard')}")
print(f"  Export: {z.count('export') + z.count('Export')}")

# Help system
print("\n--- Help System ---")
print(f"  help_mode/helpMode: {z.count('help_mode') + z.count('helpMode')}")
print(f"  HelpOverlay: {z.count('HelpOverlay')}")
print(f"  tour/Tour: {z.count('tour') + z.count('Tour')}")

# Components
comps = [(i+45001, l.strip().split('=')[0].replace('const ','').strip()) 
         for i, l in enumerate(zone) if '= React.memo(' in l and l.strip().startswith('const ')]
print(f"\n--- Components: {len(comps)} ---")
for ln, name in comps:
    print(f"  L{ln}: {name}")

# State vars in this zone
states = sum(1 for l in zone if 'useState(' in l and 'const [' in l)
effects = sum(1 for l in zone if 'useEffect(' in l)
callbacks = sum(1 for l in zone if 'useCallback(' in l)
refs = sum(1 for l in zone if 'useRef(' in l)
print(f"\n--- Hooks ---")
print(f"  useState: {states}, useEffect: {effects}, useCallback: {callbacks}, useRef: {refs}")
