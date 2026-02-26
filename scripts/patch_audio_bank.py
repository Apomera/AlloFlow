import sys

FILE_PATH = "c:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/AlloFlowANTI.txt"

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# Replacement 1: _initAudioBank
target1 = """    if (typeof _CACHE_ISOLATION_AUDIO !== 'undefined') _CACHE_ISOLATION_AUDIO = null;
    console.log("[AudioBank] Caches invalidated - audio data now available.");
});"""
replacement1 = """    if (typeof _CACHE_ISOLATION_AUDIO !== 'undefined') _CACHE_ISOLATION_AUDIO = null;
    console.log("[AudioBank] Caches invalidated - audio data now available.");
});

let _CACHE_WORD_AUDIO_BANK = null;
async function loadWordAudioBank() {
    if (_CACHE_WORD_AUDIO_BANK) return;
    try {
        const response = await fetch("https://raw.githubusercontent.com/Apomera/AlloFlow/main/word_audio_bank.json");
        if (!response.ok) throw new Error("HTTP " + response.status);
        _CACHE_WORD_AUDIO_BANK = await response.json();
        console.log("Word Audio Bank loaded successfully. Categories:", Object.keys(_CACHE_WORD_AUDIO_BANK).length);
    } catch (err) {
        console.warn("[WordAudioBank] Auto-fetch failed:", err.message);
        _CACHE_WORD_AUDIO_BANK = {}; 
    }
}"""
if target1 in content:
    content = content.replace(target1, replacement1, 1)
else:
    print("Failed to find target 1")

# Replacement 2: loadPsychometricProbes
target2 = """const loadPsychometricProbes = async () => {
    if (window.BENCHMARK_PROBE_BANKS && window.ORF_SCREENING_PASSAGES) return;"""
replacement2 = """const loadPsychometricProbes = async () => {
    loadWordAudioBank(); // Background fetch word audio when probes launch
    if (window.BENCHMARK_PROBE_BANKS && window.ORF_SCREENING_PASSAGES) return;"""
if target2 in content:
    content = content.replace(target2, replacement2, 1)
else:
    print("Failed to find target 2")

# Replacement 3: WordSoundsModal React.useEffect
target3 = """    const isMountedRef = React.useRef(true);
    const audioCache = providedAudioCache || internalAudioCache;
    const ttsQueue = React.useRef(Promise.resolve());"""
replacement3 = """    const isMountedRef = React.useRef(true);

    React.useEffect(() => {
        loadWordAudioBank();
    }, []);

    const audioCache = providedAudioCache || internalAudioCache;
    const ttsQueue = React.useRef(Promise.resolve());"""
if target3 in content:
    content = content.replace(target3, replacement3, 1)
else:
    print("Failed to find target 3")

# Replacement 4: handleAudio
target4 = """        if (audioCache && audioCache.current && audioCache.current.has(text)) {
            const url = audioCache.current.get(text);
            debugLog("⚡ using shared audio cache for:", text);
            return loadAndPlay(url);
        }
        const lower = text.toLowerCase();
        let normalizedKey = lower.trim();"""
replacement4 = """        if (audioCache && audioCache.current && audioCache.current.has(text)) {
            const url = audioCache.current.get(text);
            debugLog("⚡ using shared audio cache for:", text);
            return loadAndPlay(url);
        }
        const lower = text.toLowerCase();
        
        if (typeof _CACHE_WORD_AUDIO_BANK !== 'undefined' && _CACHE_WORD_AUDIO_BANK && _CACHE_WORD_AUDIO_BANK[lower]) {
            debugLog("⚡ using global word_audio_bank for:", text);
            return loadAndPlay(_CACHE_WORD_AUDIO_BANK[lower]);
        }
        
        let normalizedKey = lower.trim();"""
if target4 in content:
    content = content.replace(target4, replacement4, 1)
else:
    print("Failed to find target 4")

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied successfully.")
