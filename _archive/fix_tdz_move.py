filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Strategy: Remove the chunk reader declarations from after isSpeedReaderActive
# and insert them BEFORE handleCloseChunkReader (before handleCloseSpeedReader)

# The chunk reader state lines were added after isSpeedReaderActive:
old_decls = """  const [isSpeedReaderActive, setIsSpeedReaderActive] = useState(false);
  const [isChunkReaderActive, setIsChunkReaderActive] = useState(false);
  const [chunkReaderIdx, setChunkReaderIdx] = useState(0);
  const [chunkReaderAutoPlay, setChunkReaderAutoPlay] = useState(false);
  const [chunkReaderSpeed, setChunkReaderSpeed] = useState(3000);
  const chunkReaderTimerRef = useRef(null);"""

# Replace with just the original line (remove chunk reader from here)
new_decls = """  const [isSpeedReaderActive, setIsSpeedReaderActive] = useState(false);"""

if old_decls in content:
    content = content.replace(old_decls, new_decls, 1)
    print("1. Removed chunk reader state from after isSpeedReaderActive")
else:
    print("1. SKIP: old decls not found")
    exit()

# Now insert chunk reader state BEFORE handleCloseSpeedReader
old_close = "  const handleCloseSpeedReader = useCallback(() => setIsSpeedReaderActive(false), []);"
new_close = """  const [isChunkReaderActive, setIsChunkReaderActive] = useState(false);
  const [chunkReaderIdx, setChunkReaderIdx] = useState(0);
  const [chunkReaderAutoPlay, setChunkReaderAutoPlay] = useState(false);
  const [chunkReaderSpeed, setChunkReaderSpeed] = useState(3000);
  const chunkReaderTimerRef = useRef(null);
  const handleCloseSpeedReader = useCallback(() => setIsSpeedReaderActive(false), []);"""

if old_close in content:
    content = content.replace(old_close, new_close, 1)
    print("2. Inserted chunk reader state before handleCloseSpeedReader")
else:
    print("2. SKIP: handleCloseSpeedReader not found")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("\nDone - TDZ should be fixed")
