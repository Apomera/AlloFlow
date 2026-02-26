"""Debug: print the exact characters around _initAudioBank."""
FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
OUT = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\debug_enc_result.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

with open(OUT, 'w', encoding='utf-8') as out:
    tests = [
        'async function _initAudioBank',
        '_initAudioBank',
        'AUDIO_BANK',
        '_AUDIO_BANK',
        'Initializing Audio Bank',
        'audio_bank.json',
        'console.error',
        'Failed to load Audio Bank',
    ]

    for t in tests:
        idx = content.find(t)
        out.write(f"Search '{t}': index={idx}\n")
        if idx >= 0:
            start = max(0, idx - 30)
            end = min(len(content), idx + len(t) + 30)
            out.write(f"  Context repr: {repr(content[start:end])}\n")
        out.write("\n")
