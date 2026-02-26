"""
Fix AlloFlowANTI.txt encoding for grep/ripgrep compatibility.
- Strips UTF-8 BOM (EF BB BF) which can cause ripgrep to mishandle the file
- Keeps CRLF line endings (Windows standard)
- Preserves all content unchanged
"""
import os
import sys

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

# Read raw bytes
with open(FILE, 'rb') as f:
    raw = f.read()

print(f"Original size: {len(raw):,} bytes")
print(f"First 6 bytes (hex): {raw[:6].hex()}")

changes = []

# 1. Strip UTF-8 BOM if present
if raw[:3] == b'\xef\xbb\xbf':
    raw = raw[3:]
    changes.append("Stripped UTF-8 BOM")
    print("  -> Stripped UTF-8 BOM")
else:
    print("  -> No BOM found")

# 2. Check/report line endings
crlf_count = raw.count(b'\r\n')
lf_only = raw.count(b'\n') - crlf_count
cr_only = raw.count(b'\r') - crlf_count
print(f"Line endings: CRLF={crlf_count:,}, LF-only={lf_only:,}, CR-only={cr_only:,}")

# 3. Normalize any mixed line endings to CRLF (Windows standard)
if lf_only > 0 or cr_only > 0:
    # First normalize all to LF, then convert to CRLF
    raw = raw.replace(b'\r\n', b'\n')  # CRLF -> LF
    raw = raw.replace(b'\r', b'\n')     # bare CR -> LF
    raw = raw.replace(b'\n', b'\r\n')   # LF -> CRLF
    changes.append(f"Normalized {lf_only} bare-LF and {cr_only} bare-CR to CRLF")
    print(f"  -> Normalized line endings to CRLF")

# 4. Check for null bytes
null_count = raw.count(b'\x00')
if null_count > 0:
    print(f"  WARNING: {null_count} null bytes found (not removing - needs manual review)")
else:
    print("  -> No null bytes")

# 5. Verify UTF-8 validity
try:
    raw.decode('utf-8')
    print("  -> Valid UTF-8 confirmed")
except UnicodeDecodeError as e:
    print(f"  WARNING: Invalid UTF-8 at byte {e.start}: {e.reason}")

# Write back if changes were made
if changes:
    with open(FILE, 'wb') as f:
        f.write(raw)
    print(f"\nNew size: {len(raw):,} bytes")
    print(f"First 6 bytes (hex): {raw[:6].hex()}")
    print(f"Changes applied: {', '.join(changes)}")
else:
    print("\nNo changes needed - file encoding is already correct")
    print("The grep issue may be caused by something else (file size, ripgrep config, etc.)")

print("\nDone.")
