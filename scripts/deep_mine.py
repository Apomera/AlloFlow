"""Deep feature mining - find everything I missed"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
lines = open('AlloFlowANTI.txt','r',encoding='utf-8',errors='replace').readlines()
content = ''.join(lines)

print("=== OVERLOOKED FEATURES DEEP SCAN ===")

# 1. Allobot / AI assistant
print("\n--- Allobot (AI Assistant) ---")
print(f"  Allobot/allobot: {content.count('allobot') + content.count('Allobot') + content.count('AlloBot')}")
print(f"  bot tips/botTips: {content.count('botTip') + content.count('BotTip')}")
print(f"  chat/Chat: {content.count('chatMessage') + content.count('ChatMessage')}")

# 2. Report / Export / Printing
print("\n--- Reports & Export ---")
print(f"  UserReportProfile: {content.count('UserReportProfile')}")
print(f"  BlueprintMode: {content.count('BlueprintMode') + content.count('blueprint')}")
print(f"  AdaptationStudio: {content.count('AdaptationStudio') + content.count('adaptationStudio')}")
print(f"  exportPDF/PDF: {content.count('PDF') + content.count('pdf')}")
print(f"  printable: {content.count('printable') + content.count('Printable')}")

# 3. Sentence frames & scaffolds
print("\n--- Sentence Frames ---")
print(f"  sentenceFrame: {content.count('sentenceFrame') + content.count('SentenceFrame')}")
print(f"  cloze: {content.count('cloze') + content.count('Cloze')}")
print(f"  sentence starters: {content.count('starter') + content.count('Starter')}")

# 4. Visual/Image features
print("\n--- Visual Features ---")
print(f"  comic/panel: {content.count('comicPanel') + content.count('ComicPanel') + content.count('panelCaption')}")
print(f"  imagen/Imagen: {content.count('Imagen') + content.count('imagen')}")
print(f"  NanoBot: {content.count('NanoBot') + content.count('nanoBot') + content.count('nano_bot')}")
print(f"  Art Director: {content.count('ArtDirector') + content.count('artDirector') + content.count('art_director')}")
print(f"  imagePrompt: {content.count('imagePrompt') + content.count('ImagePrompt')}")

# 5. Parenting / Wellness / Kinship features
print("\n--- Parenting & Wellness ---")
print(f"  WellnessStudio: {content.count('WellnessStudio') + content.count('wellnessStudio') + content.count('wellness')}")
print(f"  ConflictResolution: {content.count('ConflictResolution') + content.count('conflictResolution')}")
print(f"  DigitalAuntie: {content.count('DigitalAuntie') + content.count('digitalAuntie') + content.count('auntie')}")
print(f"  HearthHub: {content.count('HearthHub') + content.count('hearthHub') + content.count('hearth')}")
print(f"  TribalNations: {content.count('TribalNation') + content.count('tribalNation') + content.count('tribal')}")
print(f"  Indigenous: {content.count('indigenous') + content.count('Indigenous')}")
print(f"  Visualizer/HUD: {content.count('visualizer') + content.count('Visualizer') + content.count('HUD')}")

# 6. RTI / Progress / Assessment
print("\n--- RTI & Assessment ---")
print(f"  RTI: {content.count('RTI') + content.count('rti_') + content.count('rtiData')}")
print(f"  progressMonitor: {content.count('progressMonitor') + content.count('ProgressMonitor')}")
print(f"  IEP: {content.count('IEP') + content.count('iep')}")
print(f"  mastery: {content.count('mastery') + content.count('Mastery')}")
print(f"  benchmarks: {content.count('benchmark') + content.count('Benchmark')}")
print(f"  fluency: {content.count('fluency') + content.count('Fluency')}")

# 7. Collaboration / Session
print("\n--- Collaboration ---")
print(f"  sessionCode: {content.count('sessionCode')}")
print(f"  studentWork: {content.count('studentWork') + content.count('StudentWork')}")
print(f"  broadcast: {content.count('broadcast') + content.count('Broadcast')}")
print(f"  liveSync: {content.count('liveSync') + content.count('LiveSync')}")

# 8. Persona / Character features
print("\n--- Persona System ---")
print(f"  persona: {content.count('persona')}")
print(f"  characterVoice: {content.count('characterVoice') + content.count('character_voice')}")
print(f"  perspective: {content.count('perspective') + content.count('Perspective')}")

# 9. Gamification scoring
print("\n--- Gamification ---")
print(f"  XP/xp: {content.count('xp') + content.count('XP')}")
print(f"  level/Level: {content.count('globalLevel') + content.count('Level')}")
print(f"  badge/Badge: {content.count('badge') + content.count('Badge')}")
print(f"  streak/Streak: {content.count('streak') + content.count('Streak')}")
print(f"  confetti: {content.count('confetti') + content.count('Confetti')}")
print(f"  playSound: {content.count('playSound')}")

# 10. Zen mode / Focus mode
print("\n--- Focus & Zen ---")
print(f"  zenMode: {content.count('zenMode') + content.count('isZenMode')}")
print(f"  focus: {content.count('focus') + content.count('Focus')}")
print(f"  sleep/sleeping: {content.count('isSleeping') + content.count('sleeping')}")
print(f"  flight/isFlightActive: {content.count('isFlightActive') + content.count('flight')}")

# 11. Import/Source handling
print("\n--- Source & Import ---")
print(f"  fileUpload/upload: {content.count('fileUpload') + content.count('Upload')}")
print(f"  paste/clipboard: {content.count('paste') + content.count('Paste')}")
print(f"  transcript: {content.count('transcript') + content.count('Transcript')}")
print(f"  LargeFileTranscript: {content.count('LargeFileTranscript')}")
print(f"  speechRecognition: {content.count('SpeechRecognition') + content.count('speechRecognition')}")

# 12. Tour / Onboarding
print("\n--- Tour & Onboarding ---")
print(f"  tour: {content.count('tour-') + content.count('Tour')}")
print(f"  onboarding: {content.count('onboarding') + content.count('Onboarding')}")
print(f"  firstTime: {content.count('firstTime') + content.count('FirstTime')}")
print(f"  wizard: {content.count('wizard') + content.count('Wizard')}")
