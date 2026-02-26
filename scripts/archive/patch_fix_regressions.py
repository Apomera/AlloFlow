"""Fix regressions from console cleanup and memo patches."""
FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()

replacements = [
    # Fix 1a: Restore console.log in _initAudioBank (before debugLog is defined)
    ('    debugLog("Initializing Audio Bank from " + _AUDIO_BANK_URL);',
     '    console.log("Initializing Audio Bank from " + _AUDIO_BANK_URL);'),
    
    # Fix 1b: Restore console.log in _initAudioBank success
    ('        debugLog("Audio Bank loaded successfully. Categories:", Object.keys(_AUDIO_BANK));',
     '        console.log("Audio Bank loaded successfully. Categories:", Object.keys(_AUDIO_BANK));'),
    
    # Fix 1c: Restore console.warn in _initAudioBank catch
    ('        warnLog("[AudioBank] Auto-fetch failed:", err.message, "- Use the Upload button in the header to load audio_bank.json manually.");',
     '        console.warn("[AudioBank] Auto-fetch failed:", err.message, "- Use the Upload button in the header to load audio_bank.json manually.");'),
    
    # Fix 1d: Restore console.log in audio_bank_loaded listener
    ('    debugLog("[AudioBank] Caches invalidated - audio data now available.");',
     '    console.log("[AudioBank] Caches invalidated - audio data now available.");'),
    
    # Fix 2: Correct botAccessory useMemo deps (remove non-existent showReaderMode)
    ('const botAccessory = useMemo(() => getBotAccessoryInternal(), [activeView, isSpotlightMode, showUDLGuide, showReaderMode, generatedContent?.mode, isWordSoundsMode, adventureState?.isActive, showSocraticChat]);',
     'const botAccessory = useMemo(() => getBotAccessoryInternal(), [activeView, isInteractiveFlashcards]);'),
]

for old, new in replacements:
    if old in c:
        c = c.replace(old, new, 1)
        print(f"OK: {old[:60]}...")
    else:
        print(f"SKIP: {old[:60]}...")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(c)

print(f"\nVerification:")
print(f"  showReaderMode refs: {c.count('showReaderMode')}")
print(f"  isInteractiveFlashcards in memo: {'isInteractiveFlashcards]);' in c}")
print(f"  console.log in initAudioBank: {'console.log(\"Initializing Audio Bank' in c}")
