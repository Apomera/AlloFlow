"""Final line ending fix - normalize ALL line endings to CRLF."""

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'rb') as f:
    data = f.read()

# Preserve BOM
bom = data[:3]
assert bom == b'\xef\xbb\xbf', f"BOM missing! Got: {bom.hex()}"
body = data[3:]

# Normalize in the correct order to avoid doubling:
# 1) Replace all CRLF with just LF
body = body.replace(b'\r\n', b'\n')
# 2) Replace any remaining lone CR with LF  
body = body.replace(b'\r', b'\n')
# 3) Now all line endings are LF. Convert all to CRLF.
body = body.replace(b'\n', b'\r\n')

result = bom + body

# Stats
line_count = result.count(b'\r\n')
bare_lf = 0
for i in range(len(result)):
    if result[i:i+1] == b'\n' and (i == 0 or result[i-1:i] != b'\r'):
        bare_lf += 1

print(f"Lines: {line_count}")
print(f"Bare LF: {bare_lf}")
print(f"Size: {len(result):,} bytes")

with open(FILE, 'wb') as f:
    f.write(result)

print(f"BOM: {result[:3].hex()}")
print("Done!")
