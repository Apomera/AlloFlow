"""Verify the 'or' audio in PHONEME_AUDIO_BANK matches audio_input4/or.webm exactly."""
import sys, os, base64, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

MONOLITH = os.path.join(os.path.dirname(__file__), 'AlloFlowANTI.txt')
AUDIO = os.path.join(os.path.dirname(__file__), 'audio_input4', 'or.webm')

# 1. Read source audio and encode
with open(AUDIO, 'rb') as f:
    src_bytes = f.read()
src_b64 = base64.b64encode(src_bytes).decode('ascii')
print(f"Source or.webm: {len(src_bytes)} bytes -> {len(src_b64)} base64 chars")
print(f"Source b64 prefix: {src_b64[:60]}")
print(f"Source b64 suffix:  ...{src_b64[-40:]}")

# 2. Read the monolith and extract the 'or' assignment
with open(MONOLITH, 'r', encoding='utf-8-sig') as f:
    text = f.read()

# Find the bracket assignment
match = re.search(r"PHONEME_AUDIO_BANK\['or'\]\s*=\s*'data:audio/webm;base64,([^']+)'", text)
if not match:
    print("ERROR: Could not find PHONEME_AUDIO_BANK['or'] assignment!")
else:
    bank_b64 = match.group(1)
    print(f"\nBank 'or' audio: {len(bank_b64)} base64 chars")
    print(f"Bank b64 prefix: {bank_b64[:60]}")
    print(f"Bank b64 suffix:  ...{bank_b64[-40:]}")
    
    # 3. Compare
    if src_b64 == bank_b64:
        print(f"\n✅ EXACT MATCH: The 'or' audio in the bank is identical to audio_input4/or.webm")
    else:
        print(f"\n❌ MISMATCH!")
        print(f"  Source length: {len(src_b64)}")
        print(f"  Bank length:   {len(bank_b64)}")
        # Find first difference
        for i in range(min(len(src_b64), len(bank_b64))):
            if src_b64[i] != bank_b64[i]:
                print(f"  First diff at char {i}: src='{src_b64[i]}' bank='{bank_b64[i]}'")
                break

    # 4. Decode the bank b64 and verify it's valid WebM
    decoded = base64.b64decode(bank_b64)
    print(f"\nDecoded audio: {len(decoded)} bytes")
    if decoded[:4] == b'\x1a\x45\xdf\xa3':
        print(f"✅ Valid WebM header (EBML magic bytes)")
    else:
        print(f"❌ Invalid header: {decoded[:4].hex()}")
    
    if decoded == src_bytes:
        print(f"✅ Decoded bytes match source file exactly")
    else:
        print(f"❌ Decoded bytes differ from source file")
