"""Measure all embedded data in AlloFlowANTI.txt - write results to UTF-8 file"""
import os

file_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
out_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\measure_output.md'

total_size = os.path.getsize(file_path)

audio_raw_bytes = 0
data_audio_bytes = 0
data_image_bytes = 0
long_line_bytes = 0
audio_raw_count = 0
long_lines = []

with open(file_path, 'r', encoding='utf-8') as f:
    for line_num, line in enumerate(f, 1):
        line_len = len(line.encode('utf-8'))
        
        if '_LOAD_INSTRUCTION_AUDIO_RAW' in line:
            audio_raw_bytes += line_len
            audio_raw_count += 1
        elif 'data:audio' in line:
            data_audio_bytes += line_len
        elif 'data:image' in line:
            data_image_bytes += line_len
        
        if line_len > 5000 and '_LOAD_INSTRUCTION_AUDIO_RAW' not in line:
            long_line_bytes += line_len
            preview = line.strip()[:100]
            long_lines.append((line_num, line_len, preview))

results = []
results.append(f"# AlloFlowANTI.txt Size Analysis")
results.append(f"")
results.append(f"**Total file size:** {total_size:,} bytes ({total_size/1024/1024:.2f} MB)")
results.append(f"")
results.append(f"## Embedded Data Breakdown")
results.append(f"")
results.append(f"| Category | Size | % of File |")
results.append(f"|---|---|---|")
results.append(f"| `_LOAD_INSTRUCTION_AUDIO_RAW` ({audio_raw_count} calls) | {audio_raw_bytes:,} bytes ({audio_raw_bytes/1024/1024:.2f} MB) | {audio_raw_bytes/total_size*100:.1f}% |")
results.append(f"| `data:audio` (inline) | {data_audio_bytes:,} bytes ({data_audio_bytes/1024/1024:.2f} MB) | {data_audio_bytes/total_size*100:.1f}% |")
results.append(f"| `data:image` (inline) | {data_image_bytes:,} bytes ({data_image_bytes/1024/1024:.2f} MB) | {data_image_bytes/total_size*100:.1f}% |")

total_embedded = audio_raw_bytes + data_audio_bytes + data_image_bytes + long_line_bytes
results.append(f"| Long lines >5KB (other) | {long_line_bytes:,} bytes ({long_line_bytes/1024/1024:.2f} MB) | {long_line_bytes/total_size*100:.1f}% |")
results.append(f"| **Total embedded data** | **{total_embedded:,} bytes ({total_embedded/1024/1024:.2f} MB)** | **{total_embedded/total_size*100:.1f}%** |")
code_size = total_size - total_embedded
results.append(f"| Remaining JS code | {code_size:,} bytes ({code_size/1024/1024:.2f} MB) | {code_size/total_size*100:.1f}% |")

results.append(f"")
results.append(f"## Long Lines (>5KB, non-audio)")
results.append(f"")
long_lines.sort(key=lambda x: -x[1])
for ln, length, preview in long_lines[:30]:
    results.append(f"- **Line {ln}** ({length:,} chars): `{preview}`")

results.append(f"")
results.append(f"Total long lines: {len(long_lines)}")

output = '\n'.join(results)
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(output)

print("Done. Results written to measure_output.md")
