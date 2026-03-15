import os
import sys

search_terms = ['5001', '8880', '10200', 'textToSpeech', '_openaiTTS', 'ttsProvider', 'edge-tts']
directory = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated'

exclude_dirs = {'node_modules', '.git', 'build', 'dist', '.gemini'}

with open('search_results.txt', 'w', encoding='utf-8') as out:
    for root, dirs, files in os.walk(directory):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            if not file.endswith(('.js', '.jsx', '.ts', '.tsx', '.json', '.txt', '.md', '.yml', '.yaml', '.html', '.css')):
                continue
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    for idx, line in enumerate(f, 1):
                        for term in search_terms:
                            if term in line:
                                out.write(f"{filepath}:{idx} - [{term}] - {line.strip()[:100]}\n")
            except Exception:
                pass
