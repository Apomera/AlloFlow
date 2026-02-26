"""Fix double CRLF line endings."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

data = open('AlloFlowANTI.txt', 'rb').read()
print("Before:", len(data), "bytes")
print("CRCRLF count:", data.count(b'\r\r\n'))

# Fix double CR
data = data.replace(b'\r\r\n', b'\r\n')
data = data.replace(b'\r\r', b'\r')

open('AlloFlowANTI.txt', 'wb').write(data)
print("After:", len(data), "bytes")
print("CRCRLF count:", data.count(b'\r\r\n'))
