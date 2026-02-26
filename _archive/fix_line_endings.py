"""
Normalize ALL line endings in AlloFlowANTI.txt to consistent \r\n (Windows CRLF).
This fixes:
- \r\r\n (double-CR from Python write_to_file on Windows when mixing \r\n in strings)
- \n (bare LF from Unix-style tool writes)
- \r alone (bare CR, rare but possible)
All become \r\n for consistent search/grep behavior.
"""
import os

path = 'AlloFlowANTI.txt'
size_before = os.path.getsize(path)

# Read as binary to see exact bytes
with open(path, 'rb') as f:
    data = f.read()

# Count existing patterns BEFORE normalization
crlf_count = data.count(b'\r\n')
bare_lf = data.count(b'\n') - crlf_count  # \n not preceded by \r
double_cr = data.count(b'\r\r\n')
bare_cr = data.count(b'\r') - crlf_count - double_cr  # \r not followed by \n

print("=== BEFORE normalization ===")
print("  File size: %d bytes (%.2f MB)" % (size_before, size_before / 1024 / 1024))
print("  \\r\\n (CRLF): %d" % crlf_count)
print("  \\n only (bare LF): %d" % bare_lf)
print("  \\r\\r\\n (double CR): %d" % double_cr)
print("  \\r only (bare CR): %d" % bare_cr)

# Normalize: first convert all line endings to \n, then to \r\n
# Step 1: \r\r\n -> \n (double-CR fix)
data = data.replace(b'\r\r\n', b'\n')
# Step 2: \r\n -> \n
data = data.replace(b'\r\n', b'\n')
# Step 3: bare \r -> \n  
data = data.replace(b'\r', b'\n')
# Step 4: \n -> \r\n
data = data.replace(b'\n', b'\r\n')

# Verify
crlf_after = data.count(b'\r\n')
bare_lf_after = data.count(b'\n') - crlf_after
double_cr_after = data.count(b'\r\r\n')

print("\n=== AFTER normalization ===")
print("  File size: %d bytes (%.2f MB)" % (len(data), len(data) / 1024 / 1024))
print("  \\r\\n (CRLF): %d" % crlf_after)
print("  \\n only (bare LF): %d" % bare_lf_after)
print("  \\r\\r\\n (double CR): %d" % double_cr_after)

with open(path, 'wb') as f:
    f.write(data)

print("\nDone! Line endings normalized.")
