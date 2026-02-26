"""Measure the base64 audio payload in AlloFlowANTI.txt"""
import os

file_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
total_size = os.path.getsize(file_path)

audio_bytes = 0
audio_count = 0
audio_keys = []

with open(file_path, 'r', encoding='utf-8') as f:
    for line_num, line in enumerate(f, 1):
        if '_LOAD_INSTRUCTION_AUDIO_RAW' in line:
            audio_bytes += len(line.encode('utf-8'))
            audio_count += 1
            # Extract key
            try:
                start = line.index("'") + 1
                end = line.index("'", start)
                audio_keys.append(line[start:end])
            except:
                audio_keys.append(f'(line {line_num})')

print(f"Total file size: {total_size:,} bytes ({total_size/1024/1024:.2f} MB)")
print(f"Audio lines: {audio_count}")
print(f"Audio data size: {audio_bytes:,} bytes ({audio_bytes/1024/1024:.2f} MB)")
print(f"Audio as % of file: {audio_bytes/total_size*100:.1f}%")
print(f"File without audio: {(total_size-audio_bytes):,} bytes ({(total_size-audio_bytes)/1024/1024:.2f} MB)")
print(f"\nAudio keys ({len(audio_keys)} total):")
for k in audio_keys:
    print(f"  - {k}")
