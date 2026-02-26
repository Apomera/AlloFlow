"""Zone 2: Word Sounds Studio (L5001-15000) - Deep analysis"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
lines = open('AlloFlowANTI.txt','r',encoding='utf-8',errors='replace').readlines()
zone = lines[5000:15000]
z = ''.join(zone)

print("=== ZONE 2: WORD SOUNDS STUDIO (L5001-15000) ===")

# Activity types
activities = ['word-sounds', 'segmentation', 'blending', 'isolation', 'rhyming', 
              'counting', 'orthography', 'letter_tracing', 'word_families', 
              'sound_sort', 'mapping', 'spelling_bee']
print("\n--- Activity Reference Density ---")
for act in activities:
    count = z.count(act)
    if count > 0:
        print(f"  {act}: {count} refs")

# State complexity
ws_states = [(i+5001, l.strip()) for i, l in enumerate(zone) 
             if 'useState(' in l and 'const [' in l]
print(f"\n--- Word Sounds State Variables: {len(ws_states)} ---")
for ln, s in ws_states[:15]:
    name = s.split('[')[1].split(',')[0].strip() if '[' in s else '?'
    print(f"  L{ln}: {name}")
if len(ws_states) > 15:
    print(f"  ... +{len(ws_states)-15} more")

# Audio orchestration
print("\n--- Audio Orchestration ---")
print(f"  handleAudio calls: {z.count('handleAudio(')}")
print(f"  playBlending: {z.count('playBlending')}")
print(f"  playSegmentation: {z.count('playSegment')}")
print(f"  audioInstances: {z.count('audioInstances')}")
print(f"  preLoadWord: {z.count('preLoadWord') + z.count('preloadWord')}")
print(f"  Audio.play: {z.count('.play()')}")

# Scaffolding & pedagogy
print("\n--- Scaffolding & Pedagogy ---")
print(f"  scaffoldLevel/scaffolding: {z.count('scaffold')}")
print(f"  Assistive mode: {z.count('assistive')}")
print(f"  Independent mode: {z.count('independent') + z.count('Independent')}")
print(f"  Elkonin: {z.count('elkonin') + z.count('Elkonin')}")
print(f"  RTI: {z.count('rti') + z.count('RTI')}")
print(f"  Progress tracking: {z.count('progress') + z.count('Progress')}")
print(f"  mastery/Mastery: {z.count('mastery') + z.count('Mastery')}")

# Visual/animation
print("\n--- Visual & Animation ---")
print(f"  Hand cursor/animation: {z.count('hand') + z.count('Hand')}")
print(f"  Canvas refs: {z.count('canvasRef') + z.count('Canvas')}")
print(f"  SVG paths: {z.count('<path') + z.count('svg')}")
print(f"  Confetti: {z.count('confetti') + z.count('Confetti')}")
print(f"  Animation/animate: {z.count('animat')}")

# Components
comps = [(i+5001, l.strip().split('=')[0].replace('const ','').strip()) 
         for i, l in enumerate(zone) if '= React.memo(' in l and l.strip().startswith('const ')]
print(f"\n--- Components: {len(comps)} ---")
for ln, name in comps:
    print(f"  L{ln}: {name}")
