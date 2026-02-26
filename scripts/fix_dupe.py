import sys

FILE_PATH = "c:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/AlloFlowANTI.txt"

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

target = """let _CACHE_WORD_AUDIO_BANK = null;
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
}

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

replacement = """let _CACHE_WORD_AUDIO_BANK = null;
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

if target in content:
    content = content.replace(target, replacement, 1)
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed duplication!")
else:
    print("Duplication not exactly matched.")
