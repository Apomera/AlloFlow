"""Zone 1: Infrastructure & Globals (L1-5000) - Deep analysis"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
lines = open('AlloFlowANTI.txt','r',encoding='utf-8',errors='replace').readlines()
zone = lines[:5000]
z = ''.join(zone)

print("=== ZONE 1: INFRASTRUCTURE (L1-5000) ===")
print(f"Lines: 5000 of {len(lines)}")

# Config & Environment
print("\n--- Config & Environment ---")
print(f"  Firebase config: {'__firebase_config' in z}")
print(f"  Canvas detection: {'_isCanvasEnv' in z}")
print(f"  Process.env refs: {z.count('process.env')}")

# Audio infrastructure
print("\n--- Audio Infrastructure ---")
print(f"  Audio bank fetch: {'_AUDIO_BANK_URL' in z}")
print(f"  Phoneme audio refs: {z.count('PHONEME_AUDIO')}")
print(f"  Instruction audio refs: {z.count('INSTRUCTION_AUDIO')}")
print(f"  Letter name audio: {z.count('LETTER_NAME_AUDIO')}")
print(f"  Isolation audio: {z.count('ISOLATION_AUDIO')}")
print(f"  TTS functions: {z.count('callTTS')}")
print(f"  Audio context: {z.count('AudioContext')}")
print(f"  globalTtsQueue: {z.count('globalTtsQueue')}")
print(f"  globalTtsUrlCache: {z.count('globalTtsUrlCache')}")

# Safety & moderation
print("\n--- Safety & Moderation ---")
safety_class = 'class ContentSafetyFilter' in z or 'ContentSafetyFilter' in z
print(f"  ContentSafetyFilter: {safety_class}")
print(f"  Safety regex patterns: {z.count('critical') + z.count('severity')}")
print(f"  AI safety check: {'aiCheck' in z}")

# Error handling
print("\n--- Error Handling ---")
print(f"  try blocks: {sum(1 for l in zone if 'try {' in l or 'try{' in l)}")
print(f"  catch blocks: {sum(1 for l in zone if 'catch' in l and '{' in l)}")
print(f"  ErrorBoundary: {z.count('ErrorBoundary')}")

# Hooks in this zone
hooks_z = {
    'useState': sum(1 for l in zone if 'useState(' in l),
    'useEffect': sum(1 for l in zone if 'useEffect(' in l),
    'useCallback': sum(1 for l in zone if 'useCallback(' in l),
    'useRef': sum(1 for l in zone if 'useRef(' in l),
    'useMemo': sum(1 for l in zone if 'useMemo(' in l),
}
print(f"\n--- Hooks in Zone 1 ---")
for h, c in hooks_z.items():
    if c > 0: print(f"  {h}: {c}")

# Components in this zone
comps = [(i+1, l.strip().split('=')[0].replace('const ','').strip()) 
         for i, l in enumerate(zone) if '= React.memo(' in l and l.strip().startswith('const ')]
print(f"\n--- Components in Zone 1 ---")
for ln, name in comps:
    print(f"  L{ln}: {name}")

# Unique patterns
print("\n--- Notable Patterns ---")
print(f"  Debounce: {z.count('debounce') + z.count('Debounce')}")
print(f"  Throttle: {z.count('throttle') + z.count('Throttle')}")
print(f"  requestAnimationFrame: {z.count('requestAnimationFrame')}")
print(f"  URL.createObjectURL: {z.count('createObjectURL')}")
print(f"  URL.revokeObjectURL: {z.count('revokeObjectURL')}")
print(f"  Proxy objects: {z.count('new Proxy')}")
print(f"  Lazy loading: {z.count('_LOAD_') + z.count('_CACHE_')}")
