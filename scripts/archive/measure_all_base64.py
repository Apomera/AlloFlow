"""Measure ALL base64 data - write to report file"""

file_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

total_size = sum(len(line.encode('utf-8')) for line in lines)

audio_bytes = 0
audio_count = 0
image_bytes = 0
image_count = 0
big_lines = []

for i, line in enumerate(lines, 1):
    lb = len(line.encode('utf-8'))
    if 'data:audio' in line:
        audio_count += 1
        audio_bytes += lb
    if 'data:image' in line:
        image_count += 1
        image_bytes += lb
    if lb > 5000:
        big_lines.append((i, lb, line[:60].strip()))

data_total = audio_bytes + image_bytes

report = []
report.append(f"FILE: {total_size} bytes ({total_size/1024/1024:.2f} MB)")
report.append(f"AUDIO: {audio_count} lines, {audio_bytes} bytes ({audio_bytes/1024/1024:.2f} MB, {audio_bytes*100/total_size:.1f}%)")
report.append(f"IMAGE: {image_count} lines, {image_bytes} bytes ({image_bytes/1024/1024:.2f} MB, {image_bytes*100/total_size:.1f}%)")
report.append(f"DATA_TOTAL: {data_total} bytes ({data_total/1024/1024:.2f} MB, {data_total*100/total_size:.1f}%)")
report.append(f"CODE_ONLY: {total_size-data_total} bytes ({(total_size-data_total)/1024/1024:.2f} MB)")
report.append(f"BIG_LINES_COUNT: {len(big_lines)}")
big_lines.sort(key=lambda x: x[1], reverse=True)
for ln, sz, preview in big_lines[:15]:
    report.append(f"  L{ln}: {sz}B")

with open('base64_report.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(report))

print("Report written to base64_report.txt")
